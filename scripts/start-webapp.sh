#!/bin/bash
# Medical Distribution Dashboard - Web App Launcher

APP_DIR="/home/user/Dashboard2"
PORT=3000
URL="http://localhost:$PORT"

cd "$APP_DIR"

# Check if server is already running
if curl -s "$URL" > /dev/null 2>&1; then
    echo "Server already running, opening browser..."
    xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null || start "$URL" 2>/dev/null
    exit 0
fi

# Start the dev server in background
echo "Starting Medical Distribution Dashboard..."
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
    if curl -s "$URL" > /dev/null 2>&1; then
        echo "Server ready!"
        sleep 1
        xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null || start "$URL" 2>/dev/null
        wait $SERVER_PID
        exit 0
    fi
    sleep 1
done

echo "Failed to start server"
exit 1
