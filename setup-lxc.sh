#!/bin/bash
set -e

echo "========================================"
echo "  PAR - Position Authorization Request"
echo "  LXC Installation Setup"
echo "========================================"
echo ""

# ----- Helper: detect package manager -----
if command -v apt-get &>/dev/null; then
  PKG=apt
elif command -v apk &>/dev/null; then
  PKG=apk
else
  echo "ERROR: Unsupported package manager. Requires apt (Debian/Ubuntu) or apk (Alpine)."
  exit 1
fi

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# ----- 1. Install system dependencies -----
install_packages() {
  echo "Installing system packages..."
  if [ "$PKG" = "apt" ]; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release

    mkdir -p /etc/apt/keyrings

    # Node.js 20 via NodeSource
    if ! command -v node &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --batch --yes --dearmor -o /etc/apt/keyrings/nodesource.gpg
      echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list
    fi

    # PostgreSQL 16 via PGDG
    if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
      curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --batch --yes --dearmor -o /etc/apt/keyrings/postgresql.gpg
      echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    fi

    # Caddy via official repo
    if [ ! -f /etc/apt/sources.list.d/caddy-stable.list ]; then
      curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
        | gpg --batch --yes --dearmor -o /etc/apt/keyrings/caddy.gpg
      echo "deb [signed-by=/etc/apt/keyrings/caddy.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
        > /etc/apt/sources.list.d/caddy-stable.list
    fi

    apt-get update -qq
    apt-get install -y -qq nodejs postgresql-16 caddy openssl

  elif [ "$PKG" = "apk" ]; then
    apk update
    apk add --no-cache nodejs npm postgresql16 postgresql16-contrib caddy openssl
  fi
  echo "Packages installed."
  echo ""
}

# ----- 2. Configure PostgreSQL -----
setup_postgres() {
  echo "Configuring PostgreSQL..."

  if [ "$PKG" = "apt" ]; then
    # Ensure PostgreSQL is running
    systemctl enable postgresql
    systemctl start postgresql
  elif [ "$PKG" = "apk" ]; then
    # Alpine: init DB if needed
    if [ ! -d /var/lib/postgresql/16/data ]; then
      mkdir -p /var/lib/postgresql/16/data
      chown postgres:postgres /var/lib/postgresql/16/data
      su - postgres -c "initdb -D /var/lib/postgresql/16/data"
    fi
    rc-update add postgresql default 2>/dev/null || true
    rc-service postgresql start 2>/dev/null || service postgresql start
  fi

  # Create role and database (idempotent)
  su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\" | grep -q 1" 2>/dev/null || \
    su - postgres -c "psql -c \"CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';\""

  su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1" 2>/dev/null || \
    su - postgres -c "psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\""

  echo "PostgreSQL configured: database=${DB_NAME}, user=${DB_USER}"
  echo ""
}

# ----- 3. Generate secrets & write .env -----
generate_env() {
  if [ -f "${APP_DIR}/.env" ]; then
    echo ".env already exists — skipping generation."
    echo ""
    return
  fi

  echo "Generating .env with secure secrets..."

  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 44)
  ADMIN_PW=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)

  cat > "${APP_DIR}/.env" <<EOF
# PostgreSQL
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# Authentication (NextAuth.js)
NEXTAUTH_URL=https://${APP_HOSTNAME}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Google OAuth (optional — leave empty to disable Google sign-in)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Default admin account (used by seed script on first run)
ADMIN_EMAIL=admin@cr.k12.de.us
ADMIN_PASSWORD=${ADMIN_PW}
EOF

  chmod 600 "${APP_DIR}/.env"
  echo "Generated .env"
  echo ""
  echo "  Default admin: admin@cr.k12.de.us / ${ADMIN_PW}"
  echo "  (Change this after first login!)"
  echo ""
}

# ----- 4. Build the application -----
build_app() {
  echo "Installing dependencies and building..."
  cd "${APP_DIR}"

  npm ci
  npx prisma generate
  NODE_OPTIONS="--max-old-space-size=2048" npm run build

  # Compile seed script for production use
  npx tsc prisma/seed.ts --outDir prisma/dist --esModuleInterop --module commonjs --skipLibCheck

  # Copy static assets into standalone dir (Next.js standalone doesn't include these)
  cp -r "${APP_DIR}/.next/static" "${APP_DIR}/.next/standalone/.next/static"
  cp -r "${APP_DIR}/public" "${APP_DIR}/.next/standalone/public"

  # Symlink .env into standalone dir so Next.js can read it at runtime
  ln -sf "${APP_DIR}/.env" "${APP_DIR}/.next/standalone/.env"

  echo "Build complete."
  echo ""
}

# ----- 5. Set up the app user & directories -----
setup_app_user() {
  echo "Setting up application user and directories..."

  # Create par system user if it doesn't exist
  if ! id -u par &>/dev/null; then
    useradd --system --shell /usr/sbin/nologin --home-dir /opt/par par
  fi

  # Data directory for runtime state (seed marker etc.)
  mkdir -p "${APP_DIR}/data"
  chown -R par:par "${APP_DIR}/data"
  chown par:par "${APP_DIR}/.env"

  echo "App user configured."
  echo ""
}

# ----- 6. Install systemd services -----
install_services() {
  echo "Installing systemd services..."

  # PAR app service
  cat > /etc/systemd/system/par-app.service <<UNIT
[Unit]
Description=PAR Next.js Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=par
Group=par
WorkingDirectory=${APP_DIR}/.next/standalone
EnvironmentFile=${APP_DIR}/.env
EnvironmentFile=-${APP_DIR}/data/.env.db-settings
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStartPre=${APP_DIR}/scripts/pre-start.sh
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=par-app

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  systemctl enable par-app
  echo "Systemd service installed."
  echo ""
}

# ----- 7. Configure Caddy -----
setup_caddy() {
  echo "Configuring Caddy..."

  cp "${APP_DIR}/Caddyfile" /etc/caddy/Caddyfile

  systemctl enable caddy
  systemctl restart caddy

  echo "Caddy configured."
  echo ""
}

# ----- 8. Run migrations & seed, then start -----
start_app() {
  echo "Running initial migrations..."
  cd "${APP_DIR}"

  # Source .env for migration
  set -a
  . "${APP_DIR}/.env"
  set +a

  # Set up the PostgreSQL user password (now that we know it from .env)
  su - postgres -c "psql -c \"ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\""

  npx prisma migrate deploy

  echo "Starting PAR application..."
  systemctl start par-app

  echo ""
}

# ===== Main =====

# Defaults (can be overridden via env vars before running this script)
DB_USER="${POSTGRES_USER:-par_user}"
DB_NAME="${POSTGRES_DB:-par_db}"
DB_PASSWORD=""  # Generated in generate_env or read from existing .env
APP_HOSTNAME="${APP_HOSTNAME:-par.cr.k12.de.us}"

# Read existing password from .env if it exists
if [ -f "${APP_DIR}/.env" ]; then
  DB_PASSWORD=$(grep "^DATABASE_URL=" "${APP_DIR}/.env" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
fi

install_packages
generate_env

# Re-read password after env generation
if [ -z "$DB_PASSWORD" ] && [ -f "${APP_DIR}/.env" ]; then
  DB_PASSWORD=$(grep "^DATABASE_URL=" "${APP_DIR}/.env" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
fi

setup_postgres
setup_app_user
build_app
install_services
setup_caddy
start_app

echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "  PAR is running at https://${APP_HOSTNAME}"
echo ""
echo "  Useful commands:"
echo "    View app logs:     journalctl -u par-app -f"
echo "    View Caddy logs:   journalctl -u caddy -f"
echo "    Restart app:       systemctl restart par-app"
echo "    Restart Caddy:     systemctl restart caddy"
echo "    PostgreSQL status: systemctl status postgresql"
echo ""
echo "  To deploy updates:   ./deploy.sh"
echo "  To reset database:"
echo "    systemctl stop par-app"
echo "    su - postgres -c \"dropdb ${DB_NAME}\""
echo "    su - postgres -c \"createdb -O ${DB_USER} ${DB_NAME}\""
echo "    rm -f data/.seeded .env"
echo "    ./setup-lxc.sh"
echo ""
