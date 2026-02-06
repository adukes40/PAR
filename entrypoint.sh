#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy
echo "Migrations complete."

# Seed on first run (marker persists in /app/data volume)
if [ ! -f /app/data/.seeded ]; then
  echo "First run detected — seeding database..."
  node prisma/dist/seed.js
  touch /app/data/.seeded
  echo "Seeding complete."
fi

exec node server.js
