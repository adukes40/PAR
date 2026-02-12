# PAR - Position Authorization Request

A web application for managing position authorization workflows in a school district. Built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features

- **Request Management** - Create, edit, and track position authorization requests with auto-generated Job IDs (PAR-YYYY-NNNN)
- **Multi-Step Approval Workflow** - Configurable approval chain with delegate support and kick-back capability
- **Admin Dashboard** - Manage dropdown lists, approver chains, and view audit logs
- **Role-Based Access Control** - Google OAuth and credential-based authentication with USER/ADMIN roles
- **Full Audit Trail** - Every change is logged with field-level diffs

## Prerequisites

- Debian 12 / Ubuntu 22.04+ LXC container (or Alpine)
- Root access for initial setup
- (Optional) [Google OAuth credentials](https://console.cloud.google.com/apis/credentials) for Google sign-in

## Quick Start

```bash
# Clone the repository into the LXC container
git clone <repo-url> /opt/par && cd /opt/par

# Run the setup script (installs packages, configures PostgreSQL, builds app, starts services)
sudo ./setup-lxc.sh
```

The setup script will:
1. Install Node.js 20, PostgreSQL 16, and Caddy
2. Create the database and application user
3. Generate a secure database password, `NEXTAUTH_SECRET`, and default admin credentials
4. Build the Next.js application
5. Install and start systemd services

The app will be available at `https://par.cr.k12.de.us` once setup completes.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL (e.g., `https://par.cr.k12.de.us`) | Yes |
| `NEXTAUTH_SECRET` | Random secret for session encryption | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No |
| `ADMIN_EMAIL` | Default admin email (used by seed script) | No |
| `ADMIN_PASSWORD` | Default admin password (used by seed script) | No |

Copy `.env.example` to `.env` and fill in values, or let `setup-lxc.sh` generate them.

## Service Management

```bash
# View app logs
journalctl -u par-app -f

# Restart the app
systemctl restart par-app

# Check status
systemctl status par-app
systemctl status postgresql
systemctl status caddy

# View Caddy logs
journalctl -u caddy -f
```

## Deploying Updates

```bash
./deploy.sh
```

This pulls the latest code, rebuilds, runs migrations, and restarts the app.

## Local Development

```bash
# Install dependencies
npm install

# Set up your .env file
cp .env.example .env
# Edit .env with local database credentials

# Run database migrations and seed
npx prisma migrate dev
npx prisma db seed

# Start the dev server
npm run dev
```

## Reset Database

```bash
systemctl stop par-app
su - postgres -c "dropdb par_db"
su - postgres -c "createdb -O par_user par_db"
rm -f data/.seeded .env
sudo ./setup-lxc.sh
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL 16 with Prisma ORM
- **Auth:** NextAuth.js v5 (Google OAuth + Credentials)
- **UI:** Tailwind CSS, shadcn/ui, Radix UI
- **Deployment:** Native LXC with systemd + Caddy
