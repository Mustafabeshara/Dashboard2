#!/bin/bash

###############################################################################
# Database Setup Script
# Initialize database, run migrations, and seed data
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if DATABASE_URL is set
check_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL is not set"
        print_info "Make sure your .env file contains DATABASE_URL"
        exit 1
    fi
    print_success "DATABASE_URL is configured"
}

# Generate Prisma Client
generate_prisma() {
    print_header "Generating Prisma Client"
    
    print_info "Running: npx prisma generate"
    npx prisma generate
    
    print_success "Prisma Client generated"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    print_info "This will apply all pending migrations to your database"
    
    # Check if in production
    if [ "$NODE_ENV" = "production" ]; then
        print_info "Running: npx prisma migrate deploy"
        npx prisma migrate deploy
    else
        print_info "Running: npx prisma migrate dev"
        npx prisma migrate dev --name init
    fi
    
    print_success "Migrations completed"
}

# Seed database
seed_database() {
    print_header "Seeding Database"
    
    print_info "Adding initial data..."
    
    if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
        npx prisma db seed
        print_success "Database seeded successfully"
    else
        print_info "No seed file found, skipping seeding"
    fi
}

# Verify database connection
verify_connection() {
    print_header "Verifying Database Connection"
    
    print_info "Testing connection..."
    
    # Try to connect to database
    if npx prisma db execute --stdin <<< "SELECT 1;" &> /dev/null; then
        print_success "Database connection successful"
    else
        print_error "Failed to connect to database"
        print_info "Check your DATABASE_URL and ensure the database is running"
        exit 1
    fi
}

# Show database info
show_database_info() {
    print_header "Database Information"
    
    echo ""
    print_success "Database setup complete!"
    echo ""
    
    echo "📊 Database Commands:"
    echo "   npx prisma studio      - Open database GUI"
    echo "   npx prisma db push     - Push schema changes (dev)"
    echo "   npx prisma migrate dev - Create new migration"
    echo "   npx prisma db seed     - Re-seed database"
    echo ""
}

# Main execution
main() {
    print_header "Database Setup"
    
    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    check_database_url
    generate_prisma
    verify_connection
    run_migrations
    seed_database
    show_database_info
}

main
