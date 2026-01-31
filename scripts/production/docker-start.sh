#!/bin/bash

# ==========================================
# Medical Coverage System - Docker Startup Script
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Set environment variables
export NODE_ENV=${NODE_ENV:-development}
export COMPOSE_PROJECT_NAME=medical-coverage-system

print_header "================================================="
print_header "  Medical Coverage System - Docker Startup"
print_header "================================================="
print_status "Environment: $NODE_ENV"
print_status "Project: $COMPOSE_PROJECT_NAME"
echo

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p backups
mkdir -p nginx/ssl
mkdir -p uploads/contracts

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before running in production."
fi

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  dev         Start development environment"
    echo "  prod        Start production environment"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show logs for all services"
    echo "  migrate     Run database migrations"
    echo "  seed        Seed database with sample data"
    echo "  backup      Backup database"
    echo "  clean       Clean up containers and volumes"
    echo "  health      Check health of all services"
    echo "  help        Show this help message"
    echo
    echo "Options:"
    echo "  --no-cache  Build without cache"
    echo "  --pull      Pull latest images before building"
    echo "  --verbose   Verbose output"
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    docker-compose --profile dev up --build
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    docker-compose --profile production up -d --build

    print_status "Waiting for services to be ready..."
    sleep 30

    print_status "Checking service health..."
    check_health
}

# Function to stop services
stop_services() {
    print_status "Stopping all services..."
    docker-compose down
}

# Function to restart services
restart_services() {
    print_status "Restarting all services..."
    docker-compose restart
}

# Function to show logs
show_logs() {
    docker-compose logs -f --tail=100
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    docker-compose exec backend npm run db:push
}

# Function to seed database
seed_database() {
    print_status "Seeding database with sample data..."
    docker-compose exec postgres psql -U postgres -d medical_coverage_db -f /docker-entrypoint-initdb.d/02-sample-data.sql
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    BACKUP_FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
    docker-compose exec postgres pg_dump -U postgres medical_coverage_db > "$BACKUP_FILE"
    print_status "Backup created: $BACKUP_FILE"
}

# Function to clean up
clean_up() {
    print_warning "This will remove all containers, networks, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        print_status "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to check health
check_health() {
    print_status "Checking service health..."

    services=("postgres" "redis" "backend" "frontend")
    all_healthy=true

    for service in "${services[@]}"; do
        health=$(docker-compose ps -q "$service" | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck")
        if [ "$health" = "healthy" ]; then
            print_status "✓ $service: healthy"
        else
            print_error "✗ $service: $health"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = true ]; then
        print_status "All services are healthy!"
        echo
        print_status "Application URLs:"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:5000"
        if [ "$NODE_ENV" = "production" ]; then
            print_status "Production (via Nginx): https://localhost"
        fi
    else
        print_error "Some services are not healthy. Check logs for details."
    fi
}

# Parse command line arguments
COMMAND=${1:-help}
BUILD_ARGS=""

if [[ "$*" == *"--no-cache"* ]]; then
    BUILD_ARGS="$BUILD_ARGS --no-cache"
fi

if [[ "$*" == *"--pull"* ]]; then
    BUILD_ARGS="$BUILD_ARGS --pull"
fi

if [[ "$*" == *"--verbose"* ]]; then
    set -x
fi

case $COMMAND in
    "dev")
        start_dev
        ;;
    "prod")
        start_prod
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        show_logs
        ;;
    "migrate")
        run_migrations
        ;;
    "seed")
        seed_database
        ;;
    "backup")
        backup_database
        ;;
    "clean")
        clean_up
        ;;
    "health")
        check_health
        ;;
    "help"|*)
        show_help
        ;;
esac