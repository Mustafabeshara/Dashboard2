#!/bin/bash

# Vercel Database Setup Script
# This script runs during Vercel build to set up the database

set -e

echo "🔧 Setting up database for Vercel deployment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🚀 Running database migrations..."
npx prisma migrate deploy

echo "✅ Database setup complete!"
