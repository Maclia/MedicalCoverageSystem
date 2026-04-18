#!/bin/bash

# Cleanup script for Claims Service

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
    print_warning "Docker is not installed. Some cleanup features may be limited."
fi

# Cleanup function
cleanup() {
    print_status "Cleaning up $SERVICE_NAME..."

    # Stop and remove Docker container
    if command -v docker &> /dev/null; then
        print_status "Stopping and removing Docker container..."
        docker stop $SERVICE_NAME > /dev/null 2>&1
        docker rm $SERVICE_NAME > /dev/null 2>&1
    fi

    # Remove build artifacts
    print_status "Removing build artifacts..."
    rm -rf dist > /dev/null 2>&1

    # Clear logs
    print_status "Clearing logs..."
    if [ -d "logs" ]; then
        rm -f logs/*.log > /dev/null 2>&1
    fi

    # Clear node_modules
    print_status "Clearing node_modules..."
    rm -rf node_modules > /dev/null 2>&1

    # Clear temporary files
    print_status "Clearing temporary files..."
    find . -name "*.tmp" -type f -delete > /dev/null 2>&1
    find . -name "*.log" -type f -delete > /dev/null 2>&1

    # Clear cache
    print_status "Clearing npm cache..."
    npm cache clean --force > /dev/null 2>&1

    print_status "Cleanup completed successfully!"
}

# Ask for confirmation
read -p "Are you sure you want to cleanup $SERVICE_NAME? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cleanup
else
    print_warning "Cleanup cancelled."
fi