#!/bin/bash

# Database migration script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Some migration features may be limited."
fi

# Check if drizzle-kit is installed
if ! command -v drizzle-kit &> /dev/null; then
    print_status "Installing drizzle-kit..."
    npm install --save-dev drizzle-kit
fi

# Check database connection
print_status "Checking database connection..."
if ! node -e "require('./src/config/database').checkDatabaseConnection()" > /dev/null 2>&1; then
    print_error "❌ Database connection failed. Please check your configuration."
    exit 1
fi

# Generate migration
print_status "Generating migration..."
npx drizzle-kit generate

if [ $? -ne 0 ]; then
    print_error "❌ Failed to generate migration"
    exit 1
fi

print_status "✅ Migration generated successfully"

# Show migration status
print_status "Migration status:"
npx drizzle-kit studio

# Ask to run migration
read -p "Do you want to run the migration now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running migration..."
    npx drizzle-kit migrate

    if [ $? -eq 0 ]; then
        print_status "✅ Migration completed successfully"
    else
        print_error "❌ Migration failed"
        exit 1
    fi
else
    print_warning "Migration cancelled. Run 'npx drizzle-kit migrate' to apply later."
fi