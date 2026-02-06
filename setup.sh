#!/bin/bash
set -e

echo "========================================"
echo "  PAR - Position Authorization Request"
echo "  Installation Setup"
echo "========================================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker is not installed. Please install Docker first."
  echo "  https://docs.docker.com/engine/install/"
  exit 1
fi

# Check for Docker Compose (v2)
if ! docker compose version &> /dev/null; then
  echo "ERROR: Docker Compose is not available."
  echo "  Docker Compose v2 is required (included with Docker Desktop)."
  exit 1
fi

echo "Docker detected: $(docker --version)"
echo ""

# Create .env.docker if it doesn't exist
if [ ! -f .env.docker ]; then
  echo "Creating .env.docker from template..."
  cp .env.docker.example .env.docker

  # Generate a random password
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

  # Replace placeholder password in .env.docker
  sed -i.bak "s/change-me-to-a-strong-password/${DB_PASSWORD}/g" .env.docker
  rm -f .env.docker.bak

  echo "Generated secure database password."
  echo ""
else
  echo ".env.docker already exists — skipping."
  echo ""
fi

echo "Building and starting containers..."
echo ""
docker compose up --build -d

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "  The app is starting up. It may take a"
echo "  moment for the first build to complete."
echo ""
echo "  View logs:    docker compose logs -f"
echo "  App URL:      http://localhost:${APP_PORT:-3000}"
echo "  Stop:         docker compose down"
echo "  Restart:      docker compose up -d"
echo ""
echo "  To reset the database completely:"
echo "    docker compose down -v"
echo "    rm -f .env.docker"
echo "    ./setup.sh"
echo ""
