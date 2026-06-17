#!/bin/bash
# Pull latest manus-mcp from GitHub and rebuild.
# Run this script whenever you want to update to the latest version.
# Or add it to a cron job / launchd for automatic updates.

set -e

REPO_DIR="$HOME/manus-mcp"
REPO_URL="https://github.com/marcusbsorensen/manus-mcp.git"

if [ -d "$REPO_DIR" ]; then
  echo "Pulling latest changes..."
  git -C "$REPO_DIR" pull origin main
else
  echo "Cloning repo for the first time..."
  git clone "$REPO_URL" "$REPO_DIR"
fi

echo "Installing dependencies..."
cd "$REPO_DIR"
npm install --silent

echo "Building..."
npm run build

echo "Done. MCP server is up to date at $REPO_DIR/dist/index.js"
