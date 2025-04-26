#!/bin/bash
# Script to run Podman commands for the Hover extension

# Set script to exit on error
set -e

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed. Please install it first."
    echo "   Visit https://podman.io/getting-started/installation"
    exit 1
fi

# Check if podman-compose is installed
if ! command -v podman-compose &> /dev/null; then
    echo "❌ Podman Compose is not installed. Please install it first."
    echo "   You can install it via pip: pip install podman-compose"
    exit 1
fi

# Directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Project root directory
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

# Function to display usage information
display_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build       - Build the extension"
    echo "  dev         - Run in development mode with watch"
    echo "  test        - Run tests"
    echo "  package     - Package the extension"
    echo "  icons       - Convert SVG icons to PNG"
    echo "  pipeline    - Run the complete build pipeline"
    echo "  clean       - Remove containers and volumes"
    echo "  help        - Display this help message"
    echo ""
}

# Handle command
case "$1" in
    build)
        echo "🔨 Building the extension..."
        podman-compose -f podman-compose.yml up --build build
    ;;
    dev)
        echo "🔄 Starting development mode..."
        podman-compose -f podman-compose.yml up --build dev
    ;;
    test)
        echo "🧪 Running tests..."
        podman-compose -f podman-compose.yml up --build test
    ;;
    package)
        echo "📦 Packaging the extension..."
        podman-compose -f podman-compose.yml up --build package
    ;;
    icons)
        echo "🎨 Converting icons..."
        podman-compose -f podman-compose.yml up --build convert-icons
    ;;
    pipeline)
        echo "🚀 Running the complete build pipeline..."
        podman-compose -f podman-compose.yml up --build pipeline
    ;;
    clean)
        echo "🧹 Cleaning up containers and volumes..."
        podman-compose -f podman-compose.yml down -v
    ;;
    help|--help|-h)
        display_usage
    ;;
    *)
        echo "❌ Unknown command: $1"
        display_usage
        exit 1
    ;;
esac

echo "✨ Done!"