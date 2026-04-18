#!/bin/bash

# Security audit script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"
PORT=${PORT:-3005}

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

# Security audit function
security_audit() {
    print_status "Performing security audit on $SERVICE_NAME..."

    # Check for known vulnerabilities
    print_status "Checking for known vulnerabilities..."
    npm audit --audit-level=moderate > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status "✅ No known vulnerabilities found"
    else
        print_warning "⚠️  Known vulnerabilities found. Run 'npm audit' for details."
    fi

    # Check for outdated dependencies
    print_status "Checking for outdated dependencies..."
    npm outdated > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status "✅ All dependencies are up to date"
    else
        print_warning "⚠️  Outdated dependencies found. Run 'npm outdated' for details."
    fi

    # Check for hardcoded secrets
    print_status "Checking for hardcoded secrets..."
    if grep -r "password=" . --exclude-dir=node_modules --exclude-dir=.git > /dev/null 2>&1; then
        print_error "❌ Hardcoded passwords found. Please remove them."
    else
        print_status "✅ No hardcoded passwords found"
    fi

    if grep -r "secret=" . --exclude-dir=node_modules --exclude-dir=.git > /dev/null 2>&1; then
        print_error "❌ Hardcoded secrets found. Please remove them."
    else
        print_status "✅ No hardcoded secrets found"
    fi

    # Check for environment variables
    print_status "Checking environment variables..."
    if [ ! -f .env ]; then
        print_warning "⚠️  .env file not found. Please create one from .env.example"
    else
        print_status "✅ .env file exists"
    fi

    # Check for proper error handling
    print_status "Checking for proper error handling..."
    ERROR_HANDLING_COUNT=$(grep -r "catch.*error" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $ERROR_HANDLING_COUNT -gt 0 ]; then
        print_status "✅ Error handling found in $ERROR_HANDLING_COUNT places"
    else
        print_warning "⚠️  Limited error handling found. Consider adding more."
    fi

    # Check for input validation
    print_status "Checking for input validation..."
    VALIDATION_COUNT=$(grep -r "z\\.object\\|joi\\|express-validator" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $VALIDATION_COUNT -gt 0 ]; then
        print_status "✅ Input validation found in $VALIDATION_COUNT places"
    else
        print_warning "⚠️  Limited input validation found. Consider adding more."
    fi

    # Check for rate limiting
    print_status "Checking for rate limiting..."
    RATE_LIMITING_COUNT=$(grep -r "express-rate-limit" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $RATE_LIMITING_COUNT -gt 0 ]; then
        print_status "✅ Rate limiting found"
    else
        print_warning "⚠️  No rate limiting found. Consider adding it."
    fi

    # Check for CORS configuration
    print_status "Checking for CORS configuration..."
    CORS_COUNT=$(grep -r "cors" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $CORS_COUNT -gt 0 ]; then
        print_status "✅ CORS configuration found"
    else
        print_warning "⚠️  No CORS configuration found. Consider adding it."
    fi

    # Check for helmet security headers
    print_status "Checking for helmet security headers..."
    HELMET_COUNT=$(grep -r "helmet" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $HELMET_COUNT -gt 0 ]; then
        print_status "✅ Helmet security headers found"
    else
        print_warning "⚠️  No helmet security headers found. Consider adding them."
    fi

    # Check for authentication middleware
    print_status "Checking for authentication middleware..."
    AUTH_COUNT=$(grep -r "jwt\\|auth" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $AUTH_COUNT -gt 0 ]; then
        print_status "✅ Authentication middleware found"
    else
        print_warning "⚠️  No authentication middleware found. Consider adding it."
    fi

    # Check for SQL injection prevention
    print_status "Checking for SQL injection prevention..."
    SQL_INJECTION_COUNT=$(grep -r "drizzle-orm" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $SQL_INJECTION_COUNT -gt 0 ]; then
        print_status "✅ SQL injection prevention found"
    else
        print_warning "⚠️  No SQL injection prevention found. Consider adding it."
    fi

    # Check for XSS prevention
    print_status "Checking for XSS prevention..."
    XSS_COUNT=$(grep -r "xss" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $XSS_COUNT -gt 0 ]; then
        print_status "✅ XSS prevention found"
    else
        print_warning "⚠️  No XSS prevention found. Consider adding it."
    fi

    # Check for file upload security
    print_status "Checking for file upload security..."
    FILE_UPLOAD_COUNT=$(grep -r "multer" src/ --exclude-dir=node_modules --exclude-dir=.git | wc -l)
    if [ $FILE_UPLOAD_COUNT -gt 0 ]; then
        print_status "✅ File upload security found"
    else
        print_warning "⚠️  No file upload security found. Consider adding it if needed."
    fi

    # Check for dependency security
    print_status "Checking dependency security..."
    SECURITY_DEPENDENCIES=$(npm list --depth=0 | grep -E "(helmet|cors|express-rate-limit|joi|zod|bcryptjs|jsonwebtoken)" | wc -l)
    if [ $SECURITY_DEPENDENCIES -gt 0 ]; then
        print_status "✅ Security dependencies found"
    else
        print_warning "⚠️  Limited security dependencies found. Consider adding more."
    fi

    print_status "Security audit completed!"
}

# Run security audit
security_audit