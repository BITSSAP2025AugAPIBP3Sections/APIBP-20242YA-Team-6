#!/usr/bin/env bash
set -euo pipefail

# Development environment setup script
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Setting up development environment..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "🔍 Checking required tools..."
check_tool "node"
check_tool "npm"
check_tool "python3"
check_tool "pip"
check_tool "docker"
check_tool "docker-compose"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
for service in events vendors; do
    if [ -f "services/$service/requirements.txt" ]; then
        echo "Installing dependencies for $service service..."
        cd "services/$service"
        python3 -m pip install -r requirements.txt
        cd "$ROOT_DIR"
    fi
done

# Set up pre-commit hooks (if .pre-commit-config.yaml exists)
if [ -f ".pre-commit-config.yaml" ] && command -v pre-commit &> /dev/null; then
    echo "🔧 Setting up pre-commit hooks..."
    pre-commit install
fi

# Create .env files from examples
echo "📝 Setting up environment files..."
for service_dir in services/*/; do
    if [ -f "$service_dir/.env.example" ]; then
        service_name=$(basename "$service_dir")
        if [ ! -f "$service_dir/.env" ]; then
            cp "$service_dir/.env.example" "$service_dir/.env"
            echo "Created .env file for $service_name service"
        fi
    fi
done

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review and update .env files in service directories"
echo "  2. Run 'make up' to start the full stack"
echo "  3. Run 'make health' to check service health"