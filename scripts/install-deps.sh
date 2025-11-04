#!/usr/bin/env bash
set -euo pipefail

# Centralized dependency installation script
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔧 Installing dependencies for all services..."

# Install Node.js dependencies using workspaces
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies for each Python service
for service in vendors; do
    echo "🐍 Installing Python dependencies for $service service..."
    if [ -f "services/$service/requirements.txt" ]; then
        cd "services/$service"
        if command -v python3 &> /dev/null; then
            python3 -m pip install -r requirements.txt
        else
            pip install -r requirements.txt
        fi
        cd "$ROOT_DIR"
    fi
done

echo "✅ All dependencies installed successfully!"