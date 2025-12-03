#!/bin/bash

# Setup Database and Generate Prisma Client
# Run this after you have a valid DATABASE_URL in .env

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Database Setup & Prisma Client Generation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "Please create .env with your DATABASE_URL first"
    echo "Run: ./setup-env.sh"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "^DATABASE_URL=" .env; then
    echo "❌ DATABASE_URL not found in .env"
    echo "Please add your Railway PostgreSQL URL to .env"
    exit 1
fi

# Extract DATABASE_URL (remove quotes and get value)
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')

if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"xxx"* ]] || [[ "$DATABASE_URL" == *"password"* ]]; then
    echo "⚠️  DATABASE_URL looks like a placeholder"
    echo "Current value: $DATABASE_URL"
    echo ""
    echo "Get your real DATABASE_URL from:"
    echo "1. Go to https://railway.app/dashboard"
    echo "2. Select your project → Postgres service"
    echo "3. Click 'Connect' tab"
    echo "4. Copy the DATABASE_URL"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Step 1: Testing database connection..."
if npx prisma db pull 2>&1 | grep -q "Error"; then
    echo "❌ Cannot connect to database"
    echo "Please check your DATABASE_URL in .env"
    exit 1
fi
echo "✅ Database connection successful"
echo ""

echo "Step 2: Generating Prisma client for web (PostgreSQL)..."
npm run db:generate
echo "✅ Web Prisma client generated"
echo ""

echo "Step 3: Generating Prisma client for desktop (SQLite)..."
npm run db:local:generate
echo "✅ Desktop Prisma client generated"
echo ""

echo "Step 4: Pushing schema changes to database..."
read -p "This will update your database schema. Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:push
    echo "✅ Schema updated"
else
    echo "⚠️  Skipped schema push"
fi
echo ""

echo "Step 5: Checking if database needs seeding..."
BUDGET_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM budgets;" 2>/dev/null || echo "0")
if [[ "$BUDGET_COUNT" == "0" ]] || [[ "$BUDGET_COUNT" == "" ]]; then
    echo "Database appears empty"
    read -p "Seed with test data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run db:seed
        echo "✅ Database seeded"
    fi
else
    echo "✅ Database has data (skipping seed)"
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Start development server:"
echo "   npm run dev"
echo ""
echo "2. Test Budget Forecasting AI:"
echo "   → Open: http://localhost:3000/forecasts"
echo "   → Click 'Generate AI Forecast'"
echo ""
echo "3. Build desktop app (optional):"
echo "   npm run electron:build"
echo ""
echo "Test accounts (after seeding):"
echo "  admin@beshara.com / admin123 (ADMIN)"
echo "  ceo@beshara.com / admin123 (CEO)"
echo "  cfo@beshara.com / admin123 (CFO)"
echo ""
