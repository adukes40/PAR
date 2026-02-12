#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  PAR - Deploy Update"
echo "========================================"
echo ""

cd "${APP_DIR}"

# Pull latest code
if git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Pulling latest changes..."
  git pull
  echo ""
fi

# Install dependencies
echo "Installing dependencies..."
npm ci
npx prisma generate
echo ""

# Build
echo "Building application..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build
echo ""

# Recompile seed script
echo "Compiling seed script..."
npx tsc prisma/seed.ts --outDir prisma/dist --esModuleInterop --module commonjs --skipLibCheck
echo ""

# Copy standalone static files
echo "Copying static assets..."
cp -r "${APP_DIR}/public" "${APP_DIR}/.next/standalone/public" 2>/dev/null || true
cp -r "${APP_DIR}/.next/static" "${APP_DIR}/.next/standalone/.next/static" 2>/dev/null || true
echo ""

# Restart app (pre-start.sh handles migrations automatically)
echo "Restarting PAR application..."
sudo systemctl restart par-app

echo ""
echo "Deploy complete. View logs with: journalctl -u par-app -f"
echo ""
