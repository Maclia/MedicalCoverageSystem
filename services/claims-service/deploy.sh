#!/bin/bash

# Deployment script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Build the Docker image
print_status "Building Docker image for $SERVICE_NAME..."
docker build -t $SERVICE_NAME .

if [ $? -ne 0 ]; then
    print_error "Failed to build Docker image"
    exit 1
fi

# Stop existing container if running
print_status "Stopping existing container..."
docker stop $SERVICE_NAME > /dev/null 2>&1
docker rm $SERVICE_NAME > /dev/null 2>&1

# Run the new container
print_status "Starting new container..."
docker run -d \
  --name $SERVICE_NAME \
  -p $PORT:3005 \
  -e PORT=3005 \
  -e NODE_ENV=$NODE_ENV \
  --network=medical-coverage-network \
  --restart=unless-stopped \
  $SERVICE_NAME

if [ $? -eq 0 ]; then
    print_status "Successfully deployed $SERVICE_NAME"
    print_status "Service is available at http://localhost:$PORT"
else
    print_error "Failed to start container"
    exit 1
fi

# Wait for service to be ready
print_status "Waiting for service to be ready..."
sleep 5

# Run health check
if ./health-check.sh; then
    print_status "Service is healthy and ready"
else
    print_warning "Service may not be fully ready yet"
fi