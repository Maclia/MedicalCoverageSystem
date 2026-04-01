#!/bin/bash

# Install Dependencies for All Services
# This script installs npm dependencies for all microservices and the client

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Installing Dependencies for All Services               ║"
echo "║  Medical Coverage System - Microservices Architecture   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Array of services to install
SERVICES=(
  "api-gateway"
  "billing-service"
  "core-service"
  "crm-service"
  "finance-service"
  "hospital-service"
  "insurance-service"
  "membership-service"
  "wellness-service"
)

FAILED_SERVICES=()
PASSED_SERVICES=()

# Install root dependencies
echo -e "${YELLOW}Installing root dependencies...${NC}"
if npm install; then
  echo -e "${GREEN}✓ Root dependencies installed${NC}"
  PASSED_SERVICES+=("root")
else
  echo -e "${RED}✗ Root dependencies failed${NC}"
  FAILED_SERVICES+=("root")
fi
echo ""

# Install client dependencies
echo -e "${YELLOW}Installing client dependencies...${NC}"
if cd client && npm install && cd ..; then
  echo -e "${GREEN}✓ Client dependencies installed${NC}"
  PASSED_SERVICES+=("client")
else
  echo -e "${RED}✗ Client dependencies failed${NC}"
  FAILED_SERVICES+=("client")
  cd ..
fi
echo ""

# Install service dependencies
echo -e "${YELLOW}Installing microservice dependencies...${NC}"
echo "────────────────────────────────────────────────────────"
for service in "${SERVICES[@]}"; do
  echo -e "${BLUE}→ Installing ${service}...${NC}"
  
  if cd "services/${service}" && npm install && cd ../..; then
    echo -e "${GREEN}✓ ${service} dependencies installed${NC}"
    PASSED_SERVICES+=("${service}")
  else
    echo -e "${RED}✗ ${service} dependencies failed${NC}"
    FAILED_SERVICES+=("${service}")
    cd ..
  fi
done

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo -e "║  Installation Summary${NC}"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

if [ ${#PASSED_SERVICES[@]} -gt 0 ]; then
  echo -e "${GREEN}Successfully Installed (${#PASSED_SERVICES[@]}):${NC}"
  for service in "${PASSED_SERVICES[@]}"; do
    echo "  ✓ ${service}"
  done
fi

echo ""

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
  echo -e "${RED}Failed Installations (${#FAILED_SERVICES[@]}):${NC}"
  for service in "${FAILED_SERVICES[@]}"; do
    echo "  ✗ ${service}"
  done
  echo ""
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo "  1. Check internet connection"
  echo "  2. Verify npm is installed: npm --version"
  echo "  3. Clear npm cache: npm cache clean --force"
  echo "  4. Try installing individual service:"
  echo "     cd services/<service-name> && npm install"
  echo ""
  exit 1
else
  echo -e "${GREEN}✓ All dependencies installed successfully!${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo "  1. Verify TypeScript setup: npm run check"
  echo "  2. Create environment file: cp .env.services.template .env"
  echo "  3. Update .env with your configuration"
  echo "  4. Run verification: ./scripts/verify-connections.sh"
  echo ""
  exit 0
fi
