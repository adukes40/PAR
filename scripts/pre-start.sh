#!/bin/bash
set -e

APP_DIR="$(dirname "$(dirname "$(readlink -f "$0")")")"

# Load environment
if [ -f "${APP_DIR}/.env" ]; then
  set -a
  . "${APP_DIR}/.env"
  set +a
fi

echo "Running database migrations..."
node "${APP_DIR}/node_modules/prisma/build/index.js" migrate deploy \
  --schema="${APP_DIR}/prisma/schema.prisma"
echo "Migrations complete."

# Seed on first run (marker persists in data dir)
if [ ! -f "${APP_DIR}/data/.seeded" ]; then
  echo "First run detected — seeding database..."
  node "${APP_DIR}/prisma/dist/seed.js"
  touch "${APP_DIR}/data/.seeded"
  echo "Seeding complete."
fi

# Load Google OAuth credentials from DB settings (overrides env if set)
eval "$(node "${APP_DIR}/scripts/load-settings.js" 2>/dev/null || true)"
