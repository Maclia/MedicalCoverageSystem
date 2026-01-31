#!/bin/bash

# ==========================================
# Medical Coverage System - Setup Validation
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

echo
print_header "================================================="
print_header "  Medical Coverage System - Setup Validation"
print_header "================================================="
echo

# Check required files
print_header "Checking Required Files..."

required_files=(
    "docker-compose.yml"
    "server/Dockerfile"
    "client/Dockerfile"
    "client/nginx.conf"
    ".env.example"
    "database/init/01-init-database.sql"
    "database/init/02-sample-data.sql"
    "nginx/conf.d/default.conf"
    "docker-start.sh"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file"
    else
        print_error "$file (missing)"
        missing_files+=("$file")
    fi
done

# Check API routes are registered
print_header "Checking API Routes..."
if grep -q "providerNetworkRoutes" server/routes.ts; then
    print_status "Provider Network API routes registered"
else
    print_error "Provider Network API routes not found"
fi

if grep -q "providerContractRoutes" server/routes.ts; then
    print_status "Provider Contract API routes registered"
else
    print_error "Provider Contract API routes not found"
fi

# Check API files exist
api_files=(
    "server/api/provider-networks.ts"
    "server/api/provider-contracts.ts"
    "server/services/providerNetworkService.ts"
    "server/services/contractService.ts"
    "server/middleware/documentUpload.ts"
)

for file in "${api_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file"
    else
        print_error "$file (missing)"
    fi
done

# Check frontend components
print_header "Checking Frontend Components..."
frontend_files=(
    "client/src/pages/ProviderNetworkManagement.tsx"
    "client/src/pages/ContractManagement.tsx"
    "client/src/components/ProviderNetworkSelector.tsx"
)

for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file"
    else
        print_error "$file (missing)"
    fi
done

# Check schema definitions
print_header "Checking Schema Definitions..."
if grep -q "insertProviderNetworkSchema" shared/schema.ts; then
    print_status "Provider Network insert schema defined"
else
    print_error "Provider Network insert schema missing"
fi

if grep -q "insertProviderContractSchema" shared/schema.ts; then
    print_status "Provider Contract insert schema defined"
else
    print_error "Provider Contract insert schema missing"
fi

# Summary
echo
print_header "Validation Summary:"
if [ ${#missing_files[@]} -eq 0 ]; then
    print_status "All required files are present"
    echo
    print_status "✅ Setup validation completed successfully!"
    echo
    print_header "Next Steps:"
    echo "1. Copy .env.example to .env and configure your settings"
    echo "2. Run './docker-start.sh dev' to start the development environment"
    echo "3. Visit http://localhost:3000 to access the application"
    echo "4. Check './docker-start.sh health' to verify service status"
else
    print_error "Some required files are missing. Please check the errors above."
    exit 1
fi

echo
print_header "Quick Commands:"
echo "  Start development: ./docker-start.sh dev"
echo "  Start production:  ./docker-start.sh prod"
echo "  Check health:      ./docker-start.sh health"
echo "  View logs:         ./docker-start.sh logs"
echo "  Stop services:     ./docker-start.sh stop"
echo
print_header "Documentation:"
echo "  Full Docker Guide: DOCKER_README.md"
echo "  API Documentation: http://localhost:5000/api/docs (when running)"
echo