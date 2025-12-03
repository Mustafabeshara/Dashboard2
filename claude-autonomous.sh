#!/bin/bash

# Claude Code Autonomous Runner for Dashboard2
# This script enables AI-assisted development with Claude

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Claude Code - AI-Assisted Development Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Load environment if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Project directory
PROJECT_DIR="$(pwd)"
LOG_DIR="$PROJECT_DIR/.claudecode"
LOG_FILE="$LOG_DIR/autonomous.log"

# Create log directory
mkdir -p "$LOG_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Claude Code autonomous runner started"

# Check if Anthropic API key is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not found in environment"
    echo ""
    echo "Claude Code requires an Anthropic API key."
    echo "Get one from: https://console.anthropic.com/settings/keys"
    echo ""
    read -p "Enter your Anthropic API key: " ANTHROPIC_API_KEY
    
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "❌ No API key provided. Exiting."
        exit 1
    fi
    
    # Add to .env if it exists
    if [ -f .env ]; then
        echo "" >> .env
        echo "# Claude Code / Anthropic API" >> .env
        echo "ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\"" >> .env
        log "Added ANTHROPIC_API_KEY to .env file"
    fi
fi

log "✓ Anthropic API key configured"

# Create Claude Code configuration
cat > "$LOG_DIR/config.json" << EOF
{
  "project": "Dashboard2",
  "model": "claude-sonnet-4",
  "maxTokens": 8096,
  "temperature": 0.7,
  "features": {
    "codeGeneration": true,
    "testing": true,
    "refactoring": true,
    "documentation": true,
    "debugging": true
  },
  "context": {
    "framework": "Next.js 14",
    "language": "TypeScript",
    "database": "PostgreSQL with Prisma",
    "aiProviders": ["Gemini", "Groq", "Anthropic"],
    "specialFocus": [
      "Budget Management System",
      "Tender Analysis",
      "AI-powered Forecasting",
      "Medical Device Distribution"
    ]
  }
}
EOF

log "✓ Created Claude Code configuration"

# Create context file for Claude
cat > "$LOG_DIR/project-context.md" << 'EOF'
# Dashboard2 Project Context

## Overview
Medical Distribution Dashboard - Dual-mode Next.js application for medical device distribution management with AI-powered features.

## Core Business
Beshara Group healthcare solutions division in Kuwait - manages government tenders (MOH), budget tracking, inventory, and financial operations.

## Architecture
- **Framework**: Next.js 14 with App Router
- **Database**: PostgreSQL (web) / SQLite (desktop) with Prisma
- **Authentication**: NextAuth.js with JWT
- **AI Providers**: Google Gemini (primary), Groq (fallback), Anthropic Claude
- **Desktop**: Electron for offline-first capabilities

## Key Modules
1. **Budgets**: Multi-level categories, real-time variance tracking, 4-tier approval workflow
2. **Tenders**: Document processing, AI extraction, competitive analysis
3. **Inventory**: Stock management, reorder points, demand forecasting
4. **Expenses**: Auto-categorization, anomaly detection
5. **Forecasts**: AI-powered budget predictions

## Current Phase: Phase 3
Focus on AI-powered features:
- Budget Forecasting with database storage
- Tender Analysis (SWOT, win probability, competitive scoring)
- Expense Auto-categorization & Anomaly Detection
- Inventory Optimization

## Code Conventions
- Path aliases: `@/*` maps to `src/*`
- API routes require authentication: `getServerSession(authOptions)`
- All mutations require audit logging: `audit.logCreate/Update/Delete()`
- Use `@prisma/client` for web, `@prisma/local-client` for desktop
- Zod validation for all API inputs
- Multi-replace for efficient edits

## Testing
- Jest for unit tests (70% coverage threshold)
- Manual testing for end-to-end workflows
- Test accounts available after `npm run db:seed`

## Documentation
See `.github/copilot-instructions.md` for detailed coding guidelines.
EOF

log "✓ Created project context"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Claude Code Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  • API Key: Configured"
echo "  • Model: claude-sonnet-4"
echo "  • Max Tokens: 8096"
echo "  • Log Directory: $LOG_DIR"
echo ""
echo "Available Commands:"
echo ""
echo "  # Ask Claude for help"
echo "  echo 'Implement budget forecasting AI' | npx @anthropic-ai/sdk"
echo ""
echo "  # Generate code with context"
echo "  cat $LOG_DIR/project-context.md | npx @anthropic-ai/sdk"
echo ""
echo "  # Review logs"
echo "  tail -f $LOG_DIR/autonomous.log"
echo ""
echo "Note: Claude Code works best within VS Code with GitHub Copilot Chat."
echo "Use @workspace for project-wide context in chat."
echo ""

log "Setup completed successfully"

# Create helper script for common tasks
cat > "$LOG_DIR/claude-task.sh" << 'SCRIPT'
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
SCRIPT

chmod +x "$LOG_DIR/claude-task.sh"

echo "Helper script created: $LOG_DIR/claude-task.sh"
echo ""
