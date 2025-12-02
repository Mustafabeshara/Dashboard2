#!/bin/bash
#
# Medical Distribution Dashboard - Desktop App Launcher
# Run this script to clone and start the Electron app
#

set -e

REPO_URL="https://github.com/Mustafabeshara/Dashboard2.git"
APP_DIR="$HOME/MedicalDashboard"

echo "🏥 Medical Distribution Dashboard - Desktop Setup"
echo "=================================================="

# Check for required tools
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Clone or update repository
if [ -d "$APP_DIR" ]; then
    echo "📂 App directory exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client for local database
echo "🗄️ Generating local database client..."
npx prisma generate --schema=prisma/schema.local.prisma

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "⚙️ Creating local environment file..."
    cat > .env.local << 'EOF'
# Local Development Environment
DATABASE_URL=postgresql://localhost:5432/medical_distribution
LOCAL_DATABASE_URL=file:./local.db
NEXTAUTH_SECRET=local-development-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000

# AI Providers (add your keys)
# GROQ_API_KEY=your_groq_key
# GEMINI_API_KEY=your_gemini_key
EOF
    echo "📝 Created .env.local - add your API keys to enable AI features"
fi

# Run the app
echo ""
echo "🚀 Starting Medical Distribution Dashboard..."
echo "   The app will open in a new window."
echo ""
npm run electron:dev
