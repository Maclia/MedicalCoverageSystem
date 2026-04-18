#!/bin/bash

# Performance testing script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"
PORT=${PORT:-3005}
DURATION=${DURATION:-30}
CONCURRENCY=${CONCURRENCY:-10}
REQUESTS=${REQUESTS:-1000}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_metric() {
    echo -e "${BLUE}[METRIC]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install curl first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed. JSON output may be limited."
fi

# Check if service is running
print_status "Checking if $SERVICE_NAME is running..."
if ! curl -s --fail "http://localhost:$PORT/health" > /dev/null; then
    print_error "❌ $SERVICE_NAME is not running. Please start the service first."
    exit 1
fi

# Install artillery if not present
if ! command -v artillery &> /dev/null; then
    print_status "Installing artillery for performance testing..."
    npm install -g artillery
fi

# Create test configuration
print_status "Creating performance test configuration..."
cat > performance-test.yml << EOF
config:
  target: "http://localhost:$PORT"
  phases:
    - duration: $DURATION
      arrivalRate: $CONCURRENCY
  defaults:
    headers:
      Content-Type: application/json

scenarios:
  - name: "Create claim"
    flow:
      - post:
          url: "/api/claims"
          json:
            claimNumber: "CLM-2026-{{ \$randomNumber(1000, 9999) }}"
            institutionId: 1
            memberId: 1
            benefitId: 1
            memberName: "John Doe"
            serviceType: "Consultation"
            totalAmount: 1000
            amount: 1000
            description: "Medical consultation"
            diagnosis: "General check-up"
            diagnosisCode: "Z00.0"
            diagnosisCodeType: "ICD-10"

  - name: "Get all claims"
    flow:
      - get:
          url: "/api/claims"

  - name: "Get claim by ID"
    flow:
      - get:
          url: "/api/claims/{{ \$randomNumber(1, 100) }}"

  - name: "Update claim status"
    flow:
      - patch:
          url: "/api/claims/{{ \$randomNumber(1, 100) }}/status"
          json:
            status: "approved"
            notes: "Approved by admin"

  - name: "Delete claim"
    flow:
      - delete:
          url: "/api/claims/{{ \$randomNumber(1, 100) }}"
EOF

# Run performance test
print_status "Running performance test with $REQUESTS requests..."
artillery run performance-test.yml --output performance-results.json

if [ $? -ne 0 ]; then
    print_error "Performance test failed"
    exit 1
fi

# Analyze results
print_status "Analyzing performance test results..."
if command -v jq &> /dev/null; then
    TOTAL_REQUESTS=$(jq '.aggregate.requests' performance-results.json)
    AVG_RESPONSE_TIME=$(jq '.aggregate.mean' performance-results.json)
    MAX_RESPONSE_TIME=$(jq '.aggregate.max' performance-results.json)
    SUCCESS_RATE=$(jq '.aggregate['"'"'successRate'"'"']' performance-results.json)

    print_metric "Total requests: $TOTAL_REQUESTS"
    print_metric "Average response time: $AVG_RESPONSE_TIME ms"
    print_metric "Maximum response time: $MAX_RESPONSE_TIME ms"
    print_metric "Success rate: $SUCCESS_RATE%"
else
    print_warning "jq not installed. Cannot analyze detailed results."
fi

# Generate report
print_status "Generating performance report..."
artillery report performance-results.json

print_status "Performance testing completed successfully!"