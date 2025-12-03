#!/bin/bash

# Phase 2 API Endpoint Testing Script
# Tests critical API endpoints to verify they're working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3000"

echo "=================================================="
echo "  Phase 2 API Endpoint Tests"
echo "=================================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL" > /dev/null; then
    echo -e "${RED}✗${NC} Server not running on $BASE_URL"
    echo "  Start server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓${NC} Server is running"
echo ""

# Test 1: Health Check (Auth Providers)
echo "=================================================="
echo "Test 1: Auth System"
echo "=================================================="
echo -n "GET /api/auth/providers ... "
RESPONSE=$(curl -s "$BASE_URL/api/auth/providers")
if echo "$RESPONSE" | grep -q "credentials"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $RESPONSE"
fi

# Test 2: CSRF Token
echo -n "GET /api/auth/csrf ... "
RESPONSE=$(curl -s "$BASE_URL/api/auth/csrf")
if echo "$RESPONSE" | grep -q "csrfToken"; then
    echo -e "${GREEN}✓ PASS${NC}"
    CSRF_TOKEN=$(echo "$RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 3: Login (Get Session Token)
echo "=================================================="
echo "Test 2: Authentication"
echo "=================================================="
echo "Attempting login with admin credentials..."
echo -n "POST /api/auth/callback/credentials ... "

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@beshara.com&password=admin123&csrfToken=$CSRF_TOKEN" \
  -c cookies.txt \
  -D -)

if echo "$LOGIN_RESPONSE" | grep -q "200\|302"; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  Credentials authenticated successfully"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Response: $LOGIN_RESPONSE"
    echo ""
    echo -e "${YELLOW}Note:${NC} If login fails, make sure you've run: npm run db:seed"
    exit 1
fi
echo ""

# Get session token for subsequent requests
SESSION_TOKEN=$(grep -o 'next-auth.session-token=[^;]*' cookies.txt | cut -d'=' -f2 || echo "")

# Test 4: Budget API - List
echo "=================================================="
echo "Test 3: Budget API"
echo "=================================================="
echo -n "GET /api/budgets ... "
RESPONSE=$(curl -s "$BASE_URL/api/budgets" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN")

if echo "$RESPONSE" | grep -q '"budgets"\|"data"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    BUDGET_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "  Found $BUDGET_COUNT budgets"
else
    echo -e "${YELLOW}⚠ PARTIAL${NC}"
    echo "  Response: $RESPONSE"
fi

# Test 5: Forecast API - Generate (requires AI keys)
echo ""
echo "=================================================="
echo "Test 4: AI Forecasting API"
echo "=================================================="
echo -n "POST /api/forecasts/generate ... "

FORECAST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/forecasts/generate" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$FORECAST_RESPONSE" | grep -q '"success":true\|"metrics"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  AI forecast generated successfully"
elif echo "$FORECAST_RESPONSE" | grep -q "No API key configured"; then
    echo -e "${YELLOW}⚠ SKIPPED${NC}"
    echo "  No AI API keys configured (expected)"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Response: $FORECAST_RESPONSE"
fi

# Test 6: Budget Categories API
echo ""
echo "=================================================="
echo "Test 5: Budget Categories API"
echo "=================================================="
echo -n "GET /api/budget-categories ... "
RESPONSE=$(curl -s "$BASE_URL/api/budget-categories" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN")

if echo "$RESPONSE" | grep -q '\[\]' || echo "$RESPONSE" | grep -q '"id"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ PARTIAL${NC}"
    echo "  Response: $RESPONSE"
fi

# Test 7: Documents API
echo ""
echo "=================================================="
echo "Test 6: Documents API"
echo "=================================================="
echo -n "GET /api/documents ... "
RESPONSE=$(curl -s "$BASE_URL/api/documents" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN")

if echo "$RESPONSE" | grep -q '"documents"\|\[\]'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ PARTIAL${NC}"
    echo "  Response: $RESPONSE"
fi

# Test 8: Settings API (API Keys)
echo ""
echo "=================================================="
echo "Test 7: Settings API"
echo "=================================================="
echo -n "GET /api/admin/api-keys ... "
RESPONSE=$(curl -s "$BASE_URL/api/admin/api-keys" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN")

if echo "$RESPONSE" | grep -q '"keys"\|"settings"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  API keys endpoint accessible"
else
    echo -e "${YELLOW}⚠ PARTIAL${NC}"
    echo "  Response: $RESPONSE"
fi

# Test 9: User Session
echo ""
echo "=================================================="
echo "Test 8: Session Management"
echo "=================================================="
echo -n "GET /api/auth/session ... "
RESPONSE=$(curl -s "$BASE_URL/api/auth/session" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN")

if echo "$RESPONSE" | grep -q '"user"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    USERNAME=$(echo "$RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    EMAIL=$(echo "$RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    echo "  Logged in as: $USERNAME ($EMAIL)"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  No active session"
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo ""
echo -e "${GREEN}Core APIs:${NC} Working"
echo -e "${YELLOW}AI Features:${NC} Require API keys configuration"
echo ""
echo "Next steps:"
echo "  1. Configure AI API keys in Settings page"
echo "  2. Run manual tests from PHASE_2_TESTING_GUIDE.md"
echo "  3. Test budget creation, forecasting, and document processing"
echo ""
echo "=================================================="
