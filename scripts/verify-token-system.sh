#!/bin/bash

# Token System Verification Script
# This script verifies the token system is properly configured and ready for deployment

set -e

echo "=================================================="
echo "Token System Verification Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Function to print results
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((FAIL++))
  fi
}

print_warning() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
  ((WARN++))
}

echo "1. Checking Backend Service Files..."
echo "-----------------------------------"

# Check backend services exist
if [ -f "server/services/tokenWalletService.ts" ]; then
  print_result 0 "tokenWalletService.ts exists"
else
  print_result 1 "tokenWalletService.ts missing"
fi

if [ -f "server/services/tokenPurchaseService.ts" ]; then
  print_result 0 "tokenPurchaseService.ts exists"
else
  print_result 1 "tokenPurchaseService.ts missing"
fi

if [ -f "server/services/tokenSubscriptionService.ts" ]; then
  print_result 0 "tokenSubscriptionService.ts exists"
else
  print_result 1 "tokenSubscriptionService.ts missing"
fi

if [ -f "server/services/tokenBillingIntegration.ts" ]; then
  print_result 0 "tokenBillingIntegration.ts exists"
else
  print_result 1 "tokenBillingIntegration.ts missing"
fi

if [ -f "server/services/autoTopupService.ts" ]; then
  print_result 0 "autoTopupService.ts exists"
else
  print_result 1 "autoTopupService.ts missing"
fi

echo ""
echo "2. Checking Routes and Middleware..."
echo "-----------------------------------"

# Check routes exist
if [ -f "server/routes/tokens.ts" ]; then
  print_result 0 "Token routes file exists"
else
  print_result 1 "Token routes file missing"
fi

# Check routes are registered
if grep -q "import tokenRoutes from \"./routes/tokens\"" server/routes.ts 2>/dev/null; then
  print_result 0 "Token routes imported in routes.ts"
else
  print_result 1 "Token routes NOT imported in routes.ts"
fi

if grep -q "app.use(\"/api/tokens\", tokenRoutes)" server/routes.ts 2>/dev/null; then
  print_result 0 "Token routes registered at /api/tokens"
else
  print_result 1 "Token routes NOT registered"
fi

# Check middleware exists
if [ -f "server/middleware/tokenPermissions.ts" ]; then
  print_result 0 "Token permissions middleware exists"
else
  print_result 1 "Token permissions middleware missing"
fi

echo ""
echo "3. Checking Background Jobs..."
echo "-----------------------------------"

if [ -f "server/jobs/tokenJobs.ts" ]; then
  print_result 0 "Token background jobs file exists"
else
  print_result 1 "Token background jobs file missing"
fi

echo ""
echo "4. Checking Frontend Components..."
echo "-----------------------------------"

# Check API client
if [ -f "client/src/api/tokens.ts" ]; then
  print_result 0 "Token API client exists"
else
  print_result 1 "Token API client missing"
fi

# Check pages
if [ -f "client/src/pages/tokens/TokenPurchasePage.tsx" ]; then
  print_result 0 "TokenPurchasePage exists"
else
  print_result 1 "TokenPurchasePage missing"
fi

if [ -f "client/src/pages/tokens/PurchaseHistoryPage.tsx" ]; then
  print_result 0 "PurchaseHistoryPage exists"
else
  print_result 1 "PurchaseHistoryPage missing"
fi

if [ -f "client/src/pages/tokens/SubscriptionManagementPage.tsx" ]; then
  print_result 0 "SubscriptionManagementPage exists"
else
  print_result 1 "SubscriptionManagementPage missing"
fi

if [ -f "client/src/pages/tokens/TokenSettingsPage.tsx" ]; then
  print_result 0 "TokenSettingsPage exists"
else
  print_result 1 "TokenSettingsPage missing"
fi

# Check components
if [ -f "client/src/components/tokens/TokenWalletWidget.tsx" ]; then
  print_result 0 "TokenWalletWidget component exists"
else
  print_result 1 "TokenWalletWidget component missing"
fi

if [ -f "client/src/components/finance/TokenRevenueCard.tsx" ]; then
  print_result 0 "TokenRevenueCard component exists"
else
  print_result 1 "TokenRevenueCard component missing"
fi

echo ""
echo "5. Checking Finance Integration..."
echo "-----------------------------------"

# Check finance dashboard integration
if grep -q "import TokenRevenueCard from './TokenRevenueCard'" client/src/components/finance/FinanceDashboard.tsx 2>/dev/null; then
  print_result 0 "TokenRevenueCard imported in FinanceDashboard"
else
  print_result 1 "TokenRevenueCard NOT imported in FinanceDashboard"
fi

if grep -q "<TokenRevenueCard" client/src/components/finance/FinanceDashboard.tsx 2>/dev/null; then
  print_result 0 "TokenRevenueCard rendered in FinanceDashboard"
else
  print_result 1 "TokenRevenueCard NOT rendered in FinanceDashboard"
fi

echo ""
echo "6. Checking Configuration..."
echo "-----------------------------------"

# Check environment variables documented
if grep -q "TOKEN_SYSTEM" .env.example 2>/dev/null; then
  print_result 0 "Token environment variables documented"
else
  print_result 1 "Token environment variables NOT documented"
fi

# Check schema modifications
if grep -q "organizationTokenWallets" shared/schema.ts 2>/dev/null; then
  print_result 0 "Token wallet schema defined"
else
  print_result 1 "Token wallet schema missing"
fi

if grep -q "tokenPurchases" shared/schema.ts 2>/dev/null; then
  print_result 0 "Token purchases schema defined"
else
  print_result 1 "Token purchases schema missing"
fi

if grep -q "tokenSubscriptions" shared/schema.ts 2>/dev/null; then
  print_result 0 "Token subscriptions schema defined"
else
  print_result 1 "Token subscriptions schema missing"
fi

echo ""
echo "7. Checking Documentation..."
echo "-----------------------------------"

if [ -f "TOKEN_SYSTEM_DEPLOYMENT.md" ]; then
  print_result 0 "Deployment documentation exists"
else
  print_result 1 "Deployment documentation missing"
fi

if [ -f "FINANCE_INTEGRATION_SUMMARY.md" ]; then
  print_result 0 "Finance integration documentation exists"
else
  print_result 1 "Finance integration documentation missing"
fi

echo ""
echo "8. Running TypeScript Checks..."
echo "-----------------------------------"

# Run TypeScript type checking (only check for token-specific errors)
if npm run check 2>&1 | grep -qE "(token|Token).*error"; then
  print_result 1 "TypeScript errors found in token code"
else
  print_result 0 "No TypeScript errors in token code"
fi

echo ""
echo "9. Checking Dependencies..."
echo "-----------------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
  print_result 0 "Dependencies installed"
else
  print_result 1 "Dependencies NOT installed - run 'npm install'"
fi

# Check for required packages
if [ -f "package.json" ]; then
  if grep -q "uuid" package.json 2>/dev/null; then
    print_result 0 "uuid package present"
  else
    print_warning "uuid package may be missing"
  fi

  if grep -q "drizzle-orm" package.json 2>/dev/null; then
    print_result 0 "drizzle-orm package present"
  else
    print_result 1 "drizzle-orm package missing"
  fi
fi

echo ""
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${RED}Failed:${NC} $FAIL"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ Token system is ready for deployment!${NC}"
  exit 0
else
  echo -e "${RED}✗ Token system has issues that need to be resolved.${NC}"
  echo "Please review the failed checks above."
  exit 1
fi
