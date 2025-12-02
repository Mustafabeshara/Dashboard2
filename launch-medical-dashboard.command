#!/bin/bash

# Medical Distribution Management System Launcher
# Launches the desktop version of the hybrid application

echo "🚀 Starting Medical Distribution Management System..."
echo "📱 Desktop Application Mode"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the project directory
cd "$SCRIPT_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in current directory"
    echo "Please run this script from the Medical Distribution Dashboard project root"
    exit 1
fi

echo "✅ Environment check passed"
echo "📂 Project directory: $PWD"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Launch the desktop application
echo "🎯 Launching desktop application..."
echo "💡 The application will open in a new window"
echo "🔄 You can close this terminal window once the app starts"
echo ""

npm run dev

echo ""
echo "👋 Desktop application closed"
