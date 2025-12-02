#!/bin/bash

# Medical Distribution Dashboard - Web App Launcher
# This script starts the Next.js development server and opens the browser

cd /workspaces/Dashboard2

# Check if the server is already running on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Server already running on port 3000"
else
    # Start the development server in the background
    npm run dev &
    
    # Wait for the server to be ready
    echo "Starting Medical Dashboard..."
    sleep 5
    
    # Wait until the server responds
    while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
        sleep 1
    done
fi

# Open in default browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v "$BROWSER" &> /dev/null; then
    "$BROWSER" http://localhost:3000
else
    echo "Open http://localhost:3000 in your browser"
fi
