#!/bin/bash
# Medical Distribution Dashboard - Desktop App Launcher

APP_DIR="/home/user/Dashboard2"
LOG_FILE="$APP_DIR/.electron-dev.log"

cd "$APP_DIR"

# Check if DISPLAY is available for GUI
if [ -z "$DISPLAY" ]; then
    echo "No display detected. Starting web server only..."
    echo "Access the dashboard at: http://localhost:3000"

    # Kill any existing Next.js processes
    pkill -f "next dev" 2>/dev/null

    # Start Next.js dev server in background
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    disown

    echo "Web server starting... Check $LOG_FILE for logs"
    echo "The web app will be available at http://localhost:3000"
else
    echo "Display detected. Starting Electron app..."

    # Run Electron app in background
    nohup npm run electron:dev > "$LOG_FILE" 2>&1 &
    disown

    echo "Electron app starting... Check $LOG_FILE for logs"
fi
