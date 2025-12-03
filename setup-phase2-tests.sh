#!/bin/bash

# Phase 2 Testing Setup Script
# This script helps set up the environment for testing critical workflows

set -e

echo "=================================================="
echo "  Phase 2 Testing - Environment Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file found"
else
    echo -e "${YELLOW}!${NC} .env file not found"
    echo ""
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file"
    echo ""
    echo -e "${RED}IMPORTANT:${NC} You need to update the following variables in .env:"
    echo "  - DATABASE_URL (get from Railway dashboard)"
    echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "  - GEMINI_API_KEY (optional, for AI features)"
    echo "  - GROQ_API_KEY (optional, for AI features)"
    echo ""
    read -p "Press Enter after you've updated .env file..."
fi

echo ""
echo "=================================================="
echo "  Checking Environment Variables"
echo "=================================================="
echo ""

# Load .env file
export $(grep -v '^#' .env | xargs)

# Check critical variables
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" == "postgresql://user:password@localhost:5432/medical_db?schema=public" ]; then
    echo -e "${RED}✗${NC} DATABASE_URL not configured"
    echo "  Please update DATABASE_URL in .env with your Railway database URL"
    exit 1
else
    echo -e "${GREEN}✓${NC} DATABASE_URL configured"
fi

if [ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" == "your-super-secret-key-change-this" ]; then
    echo -e "${YELLOW}!${NC} NEXTAUTH_SECRET using default value"
    echo "  Generating new secret..."
    NEW_SECRET=$(openssl rand -base64 32)
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_SECRET\"|" .env
    else
        # Linux
        sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEW_SECRET\"|" .env
    fi
    echo -e "${GREEN}✓${NC} Generated and saved new NEXTAUTH_SECRET"
else
    echo -e "${GREEN}✓${NC} NEXTAUTH_SECRET configured"
fi

if [ -z "$NEXTAUTH_URL" ]; then
    echo -e "${YELLOW}!${NC} NEXTAUTH_URL not set, using default http://localhost:3000"
    echo "NEXTAUTH_URL=\"http://localhost:3000\"" >> .env
fi

# Check AI keys (optional)
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" == "your-gemini-api-key" ]; then
    echo -e "${YELLOW}!${NC} GEMINI_API_KEY not configured (optional, needed for AI features)"
else
    echo -e "${GREEN}✓${NC} GEMINI_API_KEY configured"
fi

if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" == "your-groq-api-key" ]; then
    echo -e "${YELLOW}!${NC} GROQ_API_KEY not configured (optional, AI fallback)"
else
    echo -e "${GREEN}✓${NC} GROQ_API_KEY configured"
fi

echo ""
echo "=================================================="
echo "  Database Setup"
echo "=================================================="
echo ""

echo "Testing database connection..."
if npx prisma db pull --force > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}✗${NC} Failed to connect to database"
    echo "  Check your DATABASE_URL in .env"
    exit 1
fi

echo ""
echo "Generating Prisma client..."
npm run db:generate > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Prisma client generated"

echo ""
echo "Checking if database needs migration..."
if npx prisma migrate status | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✓${NC} Database schema is up to date"
else
    echo -e "${YELLOW}!${NC} Database needs migration"
    read -p "Run migrations now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx prisma migrate deploy
        echo -e "${GREEN}✓${NC} Migrations applied"
    fi
fi

echo ""
echo "Checking if database has seed data..."
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"User\";" 2>/dev/null | grep -o '[0-9]\+' | head -1)
if [ "$USER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Database has $USER_COUNT users"
else
    echo -e "${YELLOW}!${NC} Database is empty"
    read -p "Run seed script now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run db:seed
        echo -e "${GREEN}✓${NC} Database seeded"
    fi
fi

echo ""
echo "=================================================="
echo "  Installation Check"
echo "=================================================="
echo ""

echo "Checking node_modules..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}!${NC} node_modules not found"
    echo "Running npm install..."
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
fi

echo ""
echo "=================================================="
echo "  Build Check"
echo "=================================================="
echo ""

echo "Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | head -20 | grep -q "error TS"; then
    echo -e "${YELLOW}!${NC} TypeScript errors found (non-blocking)"
    echo "  View errors with: npx tsc --noEmit"
else
    echo -e "${GREEN}✓${NC} No TypeScript errors"
fi

echo ""
echo "=================================================="
echo "  Setup Complete!"
echo "=================================================="
echo ""
echo "You can now run tests:"
echo ""
echo "  ${GREEN}npm run dev${NC}               - Start development server"
echo "  ${GREEN}npm run test${NC}              - Run test suite"
echo "  ${GREEN}npm run db:studio${NC}         - Open Prisma Studio"
echo ""
echo "Test accounts (after seeding):"
echo "  Admin:  admin@beshara.com / admin123"
echo "  CEO:    ceo@beshara.com / admin123"
echo "  CFO:    cfo@beshara.com / admin123"
echo ""
echo "Testing guide: ${YELLOW}PHASE_2_TESTING_GUIDE.md${NC}"
echo ""
echo "=================================================="
