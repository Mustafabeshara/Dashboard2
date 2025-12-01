#!/bin/bash
# Medical Distribution Dashboard - Desktop App Launcher

APP_DIR="/home/user/Dashboard2"
LOG_FILE="$APP_DIR/.electron-dev.log"

cd "$APP_DIR"

# Run in background, redirect output to log file
nohup npm run electron:dev > "$LOG_FILE" 2>&1 &

# Detach from terminal
disown
