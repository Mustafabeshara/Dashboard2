#!/bin/bash

# Quick Claude Code task runner
# Usage: ./claude-task.sh "Your coding task"

TASK="$1"
if [ -z "$TASK" ]; then
    echo "Usage: $0 'Your coding task'"
    exit 1
fi

echo "🤖 Asking Claude: $TASK"
echo ""
echo "Task: $TASK" >> .claudecode/autonomous.log
echo "Note: Claude Code integration requires VS Code + GitHub Copilot Chat"
echo "Open Copilot Chat and ask: @workspace $TASK"
