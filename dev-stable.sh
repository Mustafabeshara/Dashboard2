#!/bin/bash

# Medical Distribution Dashboard - Stable Dev Server
# Auto-restarts on crash with error logging

LOG_FILE="dev-errors.log"
MAX_CRASHES=5
CRASH_COUNT=0
RESTART_DELAY=3

echo "🚀 Starting stable dev server..."
echo "📝 Errors will be logged to: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down server..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    # Kill any process on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "✅ Server stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

while true; do
    echo "▶️  Starting Next.js dev server..."
    
    # Start the dev server
    NODE_OPTIONS='--max-old-space-size=4096' npm run dev 2>&1 | tee -a "$LOG_FILE" &
    SERVER_PID=$!
    
    # Wait for server to exit
    wait $SERVER_PID
    EXIT_CODE=$?
    
    # If exit was clean (Ctrl+C), don't restart
    if [ $EXIT_CODE -eq 130 ]; then
        echo "Clean exit detected"
        break
    fi
    
    # Server crashed
    CRASH_COUNT=$((CRASH_COUNT + 1))
    echo ""
    echo "⚠️  Server crashed! (Exit code: $EXIT_CODE)"
    echo "📊 Crash count: $CRASH_COUNT/$MAX_CRASHES"
    echo "⏳ Restarting in ${RESTART_DELAY}s..."
    echo "---" >> "$LOG_FILE"
    echo "Crash #$CRASH_COUNT at $(date)" >> "$LOG_FILE"
    echo "---" >> "$LOG_FILE"
    
    # Too many crashes in quick succession
    if [ $CRASH_COUNT -ge $MAX_CRASHES ]; then
        echo ""
        echo "❌ Server crashed $MAX_CRASHES times. Stopping."
        echo "📋 Check $LOG_FILE for error details"
        break
    fi
    
    sleep $RESTART_DELAY
done

cleanup
