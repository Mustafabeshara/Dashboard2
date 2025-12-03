#!/bin/bash

# Script to update DATABASE_URL in .env file
# Usage: ./update-database-url.sh "postgresql://postgres:password@host:port/database"

set -e

echo "════════════════════════════════════════════════════════"
echo "  Update DATABASE_URL in .env"
echo "════════════════════════════════════════════════════════"
echo ""

if [ $# -eq 0 ]; then
    echo "⚠️  No DATABASE_URL provided"
    echo ""
    echo "Usage: $0 \"postgresql://postgres:password@host:port/database\""
    echo ""
    echo "Get your Railway DATABASE_URL:"
    echo "  1. Go to: https://railway.app/dashboard"
    echo "  2. Select your Dashboard2 project"
    echo "  3. Click on 'Postgres' service"
    echo "  4. Click 'Connect' tab"
    echo "  5. Copy the DATABASE_URL"
    echo ""
    read -p "Paste your Railway DATABASE_URL: " DATABASE_URL
else
    DATABASE_URL="$1"
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ No DATABASE_URL provided. Exiting."
    exit 1
fi

# Validate URL format
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo "❌ Invalid DATABASE_URL format. Must start with postgresql://"
    exit 1
fi

# Check if URL is placeholder
if [[ "$DATABASE_URL" =~ xxx|placeholder|example ]]; then
    echo "❌ DATABASE_URL appears to be a placeholder. Please use your real Railway URL."
    exit 1
fi

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup
    echo "✓ Backed up existing .env to .env.backup"
fi

# Update DATABASE_URL in .env
if [ -f .env ]; then
    # Use sed to replace DATABASE_URL line
    sed -i '' 's|^DATABASE_URL=.*|DATABASE_URL="'"$DATABASE_URL"'"|' .env
    echo "✓ Updated DATABASE_URL in .env"
else
    echo "❌ .env file not found!"
    exit 1
fi

# Mask password for display
MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:[^@]*@/:****@/')
echo ""
echo "New DATABASE_URL (masked): $MASKED_URL"
echo ""

# Test connection
echo "Testing database connection..."
if npx prisma db pull --force 2>&1 | grep -q "Introspected"; then
    echo "✓ Successfully connected to database!"
    echo ""
    echo "Next steps:"
    echo "  1. npx prisma generate"
    echo "  2. npm run dev"
else
    echo "⚠️  Could not connect to database. Please verify the URL is correct."
    echo "   Run: npx prisma db pull"
fi
