#!/bin/bash

# Phase 3 AI Endpoints Testing Script
# Usage: ./test-phase3-ai.sh

set -e

echo "========================================="
echo "Phase 3 AI Endpoints Testing"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000"

# Check if server is running
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
    echo "Please start the dev server with: npm run dev"
    exit 1
fi

echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Get session token (you need to be logged in)
echo "Note: You need to be logged in to test these endpoints"
echo "Session token will be read from your browser cookies"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4

    echo "Testing: $description"
    echo "  Method: $method"
    echo "  URL: $url"
    
    if [ -n "$data" ]; then
        echo "  Data: $data"
        response=$(curl -s -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\nHTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X "$method" "$url" \
            -w "\nHTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    if [ "$http_status" -eq 200 ] || [ "$http_status" -eq 201 ]; then
        echo -e "  ${GREEN}✓ Success (HTTP $http_status)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "  ${RED}✗ Failed (HTTP $http_status)${NC}"
        echo "$body"
    fi
    
    echo ""
    echo "---"
    echo ""
}

# Get first tender ID from database
echo "Fetching test data from database..."
TENDER_ID=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tender.findFirst({ where: { isDeleted: false } })
  .then(t => { console.log(t?.id || ''); process.exit(0); })
  .catch(() => { console.log(''); process.exit(1); });
" 2>/dev/null || echo "")

EXPENSE_ID=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.expense.findFirst({ where: { isDeleted: false } })
  .then(e => { console.log(e?.id || ''); process.exit(0); })
  .catch(() => { console.log(''); process.exit(1); });
" 2>/dev/null || echo "")

PRODUCT_ID=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.findFirst({ where: { isDeleted: false } })
  .then(p => { console.log(p?.id || ''); process.exit(0); })
  .catch(() => { console.log(''); process.exit(1); });
" 2>/dev/null || echo "")

echo ""

# Test 1: Tender Analysis
if [ -n "$TENDER_ID" ]; then
    echo -e "${YELLOW}Test 1: Tender Analysis AI${NC}"
    test_endpoint "POST" "$BASE_URL/api/tenders/analyze" \
        "{\"tenderId\": \"$TENDER_ID\", \"includeCompetitiveAnalysis\": true}" \
        "Analyze tender with SWOT and competitive scoring"
else
    echo -e "${RED}⚠ No tenders found in database - skipping tender analysis test${NC}"
    echo ""
fi

# Test 2: Expense Categorization
if [ -n "$EXPENSE_ID" ]; then
    echo -e "${YELLOW}Test 2: Expense Auto-categorization${NC}"
    test_endpoint "POST" "$BASE_URL/api/expenses/$EXPENSE_ID/categorize" "" \
        "Categorize expense with anomaly detection"
    
    echo -e "${YELLOW}Test 2b: Get Expense Categorization${NC}"
    test_endpoint "GET" "$BASE_URL/api/expenses/$EXPENSE_ID/categorize" "" \
        "Retrieve expense categorization"
else
    echo -e "${RED}⚠ No expenses found in database - skipping expense test${NC}"
    echo ""
fi

# Test 3: Inventory Optimization
if [ -n "$PRODUCT_ID" ]; then
    echo -e "${YELLOW}Test 3: Inventory Optimization${NC}"
    test_endpoint "POST" "$BASE_URL/api/inventory/products/$PRODUCT_ID/optimize" "" \
        "Optimize inventory with demand forecasting"
    
    echo -e "${YELLOW}Test 3b: Get Inventory Optimization${NC}"
    test_endpoint "GET" "$BASE_URL/api/inventory/products/$PRODUCT_ID/optimize" "" \
        "Retrieve inventory optimization"
else
    echo -e "${RED}⚠ No products found in database - skipping inventory test${NC}"
    echo ""
fi

echo "========================================="
echo "Testing Complete"
echo "========================================="
echo ""
echo "Notes:"
echo "- If you see 401 Unauthorized, make sure you're logged in"
echo "- If you see 'jq: command not found', install jq for prettier output"
echo "- Some tests may be skipped if no test data exists"
echo ""
echo "To create test data, run: npm run db:seed"
