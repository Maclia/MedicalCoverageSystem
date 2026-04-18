#!/bin/bash

# Monitoring script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"
PORT=${PORT:-3005}
NODE_ENV=${NODE_ENV:-production}

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Some monitoring features may be limited."
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

# Get service status
print_status "Checking $SERVICE_NAME status..."
if curl -s --fail "http://localhost:$PORT/health" > /dev/null; then
    print_status "✅ $SERVICE_NAME is UP"
else
    print_error "❌ $SERVICE_NAME is DOWN"
    exit 1
fi

# Get service details
print_status "Fetching service details..."
SERVICE_DETAILS=$(curl -s "http://localhost:$PORT/health")
if [ -n "$SERVICE_DETAILS" ]; then
    if command -v jq &> /dev/null; then
        echo "$SERVICE_DETAILS" | jq '.'
    else
        echo "$SERVICE_DETAILS"
    fi
fi

# Check database connection
print_status "Checking database connection..."
DB_STATUS=$(echo "$SERVICE_DETAILS" | jq -r '.database.connected' 2>/dev/null || echo "unknown")
if [ "$DB_STATUS" = "true" ]; then
    print_status "✅ Database connection is healthy"
else
    print_error "❌ Database connection is unhealthy"
fi

# Check memory usage
print_metric "Memory usage:"
MEMORY_USAGE=$(ps aux | grep "[n]ode.*$SERVICE_NAME" | awk '{sum+=$6} END {print sum/1024 " MB"}' 2>/dev/null || echo "N/A")
print_metric "  Process memory: $MEMORY_USAGE"

# Check CPU usage
print_metric "CPU usage:"
CPU_USAGE=$(ps aux | grep "[n]ode.*$SERVICE_NAME" | awk '{sum+=$3} END {print sum "%"}' 2>/dev/null || echo "N/A")
print_metric "  Process CPU: $CPU_USAGE"

# Check running processes
print_metric "Running processes:"
ps aux | grep "[n]ode.*$SERVICE_NAME" | head -5

# Check Docker container (if running)
if command -v docker &> /dev/null; then
    print_metric "Docker container status:"
    docker ps --filter "name=$SERVICE_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No Docker container found"
fi

# Check logs (if available)
print_metric "Recent logs:"
if [ -d "logs" ]; then
    tail -n 10 logs/combined.log 2>/dev/null || echo "No logs found"
else
    echo "No logs directory found"
fi

print_status "Monitoring completed successfully!"