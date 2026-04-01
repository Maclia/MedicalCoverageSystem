#!/bin/bash

# Service Connectivity Verification Script
# Checks all UI → API → Database connections

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Service Connectivity Verification                      ║"
echo "║  Medical Coverage System - Microservices Architecture   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

PASSED=0
FAILED=0

# Function to check service
check_service() {
  local name=$1
  local port=$2
  local endpoint=${3:-/health}

  echo -n -e "${YELLOW}→ Checking ${name} (port ${port})...${NC} "
  
  if timeout 3 curl -s http://localhost:${port}${endpoint} > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

# Check Frontend
echo -e "${BLUE}Frontend Connectivity${NC}"
echo "────────────────────────────────────────────────────────"
check_service "Frontend (React)" "3000/" "index.html"
check_service "Frontend (Vite Dev)" "5173/" "vite.svg"
echo ""

# Check API Gateway
echo -e "${BLUE}API Gateway${NC}"
echo "────────────────────────────────────────────────────────"
check_service "API Gateway" "3001" "/health"
check_service "API Gateway System Health" "3001" "/api/system/health"
echo ""

# Check Microservices
echo -e "${BLUE}Microservices Health Checks${NC}"
echo "────────────────────────────────────────────────────────"
check_service "Core Service" "3003" "/health"
check_service "Billing Service" "3002" "/health"
check_service "CRM Service" "3005" "/health"
check_service "Insurance Service" "3008" "/health"
check_service "Hospital Service" "3007" "/health"
check_service "Finance Service" "3004" "/health"
check_service "Membership Service" "3006" "/health"
check_service "Wellness Service" "3009" "/health"
echo ""

# Check Database Connectivity (if PostgreSQL is available)
echo -e "${BLUE}Database Connectivity${NC}"
echo "────────────────────────────────────────────────────────"

if command -v psql &> /dev/null; then
  DATABASES=(
    "medical_coverage_core"
    "medical_coverage_billing"
    "medical_coverage_crm"
    "medical_coverage_insurance"
    "medical_coverage_hospital"
    "medical_coverage_finance"
    "medical_coverage_membership"
    "medical_coverage_wellness"
  )

  for db in "${DATABASES[@]}"; do
    echo -n -e "${YELLOW}→ Checking database ${db}...${NC} "
    
    if PGPASSWORD=${POSTGRES_PASSWORD:-postgres} psql -h localhost -U ${POSTGRES_USER:-postgres} -d $db -c "SELECT 1" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Connected${NC}"
      ((PASSED++))
    else
      echo -e "${RED}✗ Failed${NC}"
      ((FAILED++))
    fi
  done
else
  echo -e "${YELLOW}⚠ PostgreSQL client not found, skipping database checks${NC}"
fi
echo ""

# Check Redis Connection
echo -e "${BLUE}Cache & Message Queue${NC}"
echo "────────────────────────────────────────────────────────"

if command -v redis-cli &> /dev/null; then
  echo -n -e "${YELLOW}→ Checking Redis...${NC} "
  if redis-cli -h localhost ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓ Connected${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ Failed${NC}"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⚠ Redis CLI not found, skipping Redis check${NC}"
fi
echo ""

# Check API Gateway Service Registry
echo -e "${BLUE}Service Registry & Inter-Service Communication${NC}"
echo "────────────────────────────────────────────────────────"
echo -n -e "${YELLOW}→ Checking service registry...${NC} "

SERVICE_REGISTRY=$(curl -s http://localhost:3001/api/system/services 2>/dev/null || echo "{}")
if [ ! -z "$SERVICE_REGISTRY" ] && [ "$SERVICE_REGISTRY" != "{}" ]; then
  echo -e "${GREEN}✓ Service registry available${NC}"
  echo "$SERVICE_REGISTRY" | jq '.' 2>/dev/null || echo "$SERVICE_REGISTRY"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ Service registry not available (service may not implement this endpoint)${NC}"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}Passed: ${PASSED}${NC}  ${RED}Failed: ${FAILED}${NC}                                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All connectivity checks passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some connectivity checks failed. Please review errors above.${NC}"
  echo ""
  echo -e "${YELLOW}Troubleshooting Tips:${NC}"
  echo "1. Ensure all services are running: docker-compose ps"
  echo "2. Check service logs: docker-compose logs <service-name>"
  echo "3. Verify environment variables: .env file loaded correctly"
  echo "4. Check database: psql -l (list databases)"
  echo "5. Verify Redis: redis-cli ping"
  exit 1
fi
