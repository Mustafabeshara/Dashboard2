#!/bin/bash

# Environment Setup Script
# This script helps you configure the .env file with Railway database

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Medical Dashboard - Environment Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
        exit 0
    fi
fi

echo "This script will help you create a .env file for local development."
echo ""
echo -e "${YELLOW}You'll need:${NC}"
echo "  1. Railway PostgreSQL URL (from Railway dashboard)"
echo "  2. Your Gemini API key (or we'll use existing)"
echo "  3. Optional: Groq API key"
echo ""
read -p "Press Enter to continue..."
echo ""

# Generate NEXTAUTH_SECRET
echo "Generating secure NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✓${NC} Generated: ${NEXTAUTH_SECRET:0:20}..."
echo ""

# Database URL
echo "═══════════════════════════════════════════════════════"
echo "  Step 1: Database URL"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Get your Railway PostgreSQL URL:"
echo "  1. Go to: https://railway.app/dashboard"
echo "  2. Select your Dashboard2 project"
echo "  3. Click on 'Postgres' service"
echo "  4. Click 'Connect' tab"
echo "  5. Copy the DATABASE_URL"
echo ""
echo "It should look like:"
echo "  postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:5432/railway"
echo ""
read -p "Paste your Railway DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗${NC} DATABASE_URL is required!"
    exit 1
fi

# Gemini API Key
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Step 2: Gemini API Key (Primary AI Provider)"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if already in environment
if [ ! -z "$GEMINI_API_KEY" ]; then
    echo -e "${GREEN}✓${NC} Found existing GEMINI_API_KEY in environment"
    echo "   Value: ${GEMINI_API_KEY:0:10}...${GEMINI_API_KEY: -4}"
    read -p "Use this key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter new Gemini API key: " GEMINI_API_KEY
    fi
else
    echo "Get from: https://aistudio.google.com/app/apikey"
    read -p "Enter your Gemini API key: " GEMINI_API_KEY
fi

# Groq API Key (optional)
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Step 3: Groq API Key (Optional Fallback)"
echo "═══════════════════════════════════════════════════════"
echo ""
read -p "Do you have a Groq API key? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ ! -z "$GROQ_API_KEY" ]; then
        echo -e "${GREEN}✓${NC} Found existing GROQ_API_KEY"
        echo "   Using existing key"
    else
        echo "Get from: https://console.groq.com/keys"
        read -p "Enter your Groq API key: " GROQ_API_KEY
    fi
else
    GROQ_API_KEY=""
fi

# Create .env file
echo ""
echo "Creating .env file..."

cat > .env << EOF
# Medical Distribution Dashboard - Environment Variables
# Generated: $(date)

# ==================== DATABASE ====================
DATABASE_URL="$DATABASE_URL"

# ==================== AUTHENTICATION ====================
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"

# ==================== AI PROVIDERS ====================
GEMINI_API_KEY="$GEMINI_API_KEY"
EOF

if [ ! -z "$GROQ_API_KEY" ]; then
    echo "GROQ_API_KEY=\"$GROQ_API_KEY\"" >> .env
fi

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\"" >> .env
fi

cat >> .env << 'EOF'

# ==================== OPTIONAL ====================
# OpenAI API (optional fallback)
# OPENAI_API_KEY="your-openai-api-key"

# AWS Textract (for scanned document OCR)
# AWS_ACCESS_KEY_ID="your-aws-access-key"
# AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
# AWS_REGION="us-east-1"
EOF

echo -e "${GREEN}✓${NC} .env file created successfully!"
echo ""

# Verify
echo "═══════════════════════════════════════════════════════"
echo "  Verification"
echo "═══════════════════════════════════════════════════════"
echo ""

# Source .env and check
export $(grep -v '^#' .env | xargs)

if [ ! -z "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓${NC} DATABASE_URL configured"
fi

if [ ! -z "$NEXTAUTH_SECRET" ]; then
    echo -e "${GREEN}✓${NC} NEXTAUTH_SECRET configured"
fi

if [ ! -z "$GEMINI_API_KEY" ]; then
    echo -e "${GREEN}✓${NC} GEMINI_API_KEY configured"
fi

if [ ! -z "$GROQ_API_KEY" ]; then
    echo -e "${GREEN}✓${NC} GROQ_API_KEY configured"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Next Steps"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "1. Test database connection:"
echo "   ${GREEN}npx prisma db pull${NC}"
echo ""
echo "2. Generate Prisma client:"
echo "   ${GREEN}npm run db:generate${NC}"
echo ""
echo "3. Seed database (if needed):"
echo "   ${GREEN}npm run db:seed${NC}"
echo ""
echo "4. Start development server:"
echo "   ${GREEN}npm run dev${NC}"
echo ""
echo "5. Open browser:"
echo "   ${GREEN}http://localhost:3000${NC}"
echo ""
