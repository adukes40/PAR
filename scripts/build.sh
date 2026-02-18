#!/bin/bash
# Build the Next.js app and prepare the standalone directory for production.
# Run this as root, then restart the service: systemctl restart par-app
set -e

APP_DIR="$(dirname "$(dirname "$(readlink -f "$0")")")"
cd "$APP_DIR"

echo "Building Next.js app..."
npm run build

echo "Copying static assets into standalone directory..."
cp -r "$APP_DIR/.next/static" "$APP_DIR/.next/standalone/.next/static"
cp -r "$APP_DIR/public" "$APP_DIR/.next/standalone/public"

echo "Setting ownership to par:par..."
chown -R par:par "$APP_DIR/.next/standalone"

echo "Build complete. Restart the service with: systemctl restart par-app"
