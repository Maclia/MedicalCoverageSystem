#!/bin/bash

# ==============================================
# Medical Coverage System - Production Deployment
# ==============================================
# This script automates the production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="medcov"
BACKUP_DIR="/opt/backups/${PROJECT_NAME}"
DEPLOY_LOG="/var/log/${PROJECT_NAME}-deploy.log"
HEALTH_CHECK_URL="http://localhost:3000/health"
ROLLBACK_FILE="/tmp/rollback-marker"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOY_LOG"
}

# Function to log errors
error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOY_LOG"
}

# Function to log success
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOY_LOG"
}

# Function to log warnings
warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOY_LOG"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f .env ]; then
        error ".env file not found. Please create it from .env.example"
        exit 1
    fi

    # Check required environment variables
    source .env
    required_vars=("DATABASE_URL" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    success "Prerequisites check passed"
}

# Function to create backup
create_backup() {
    log "Creating backup of current deployment..."

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
    BACKUP_PATH="$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"

    # Backup database
    if docker-compose ps postgres-prod | grep -q "Up"; then
        log "Backing up database..."
        docker-compose exec postgres-prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_PATH/database.sql"
        success "Database backup created"
    fi

    # Backup uploads
    if [ -d "uploads" ]; then
        log "Backing up uploads..."
        cp -r uploads "$BACKUP_PATH/"
        success "Uploads backup created"
    fi

    # Backup configuration
    log "Backing up configuration..."
    cp .env "$BACKUP_PATH/"
    cp docker-compose.prod.yml "$BACKUP_PATH/" 2>/dev/null || true
    success "Configuration backup created"

    # Create rollback marker
    echo "$BACKUP_PATH" > "$ROLLBACK_FILE"
    success "Backup completed: $BACKUP_PATH"
}

# Function to build and deploy
deploy_application() {
    log "Starting application deployment..."

    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f docker-compose.prod.yml pull

    # Build application
    log "Building application image..."
    docker-compose -f docker-compose.prod.yml build --no-cache

    # Stop existing services
    log "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down

    # Run database migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.prod.yml run --rm app-prod npm run db:migrate

    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    success "Application deployed successfully"
}

# Function to perform health checks
health_check() {
    log "Performing health checks..."

    # Wait for services to start
    log "Waiting for services to start..."
    sleep 30

    # Check application health
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f "$HEALTH_CHECK_URL" &> /dev/null; then
            success "Application health check passed"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            error "Health check failed after $max_attempts attempts"
            return 1
        fi

        log "Health check attempt $attempt/$max_attempts failed. Retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done

    # Check database connection
    log "Checking database connection..."
    if docker-compose -f docker-compose.prod.yml exec postgres-prod pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
        success "Database connection check passed"
    else
        error "Database connection check failed"
        return 1
    fi

    # Check Redis connection
    if docker-compose -f docker-compose.prod.yml exec redis-prod redis-cli ping | grep -q "PONG"; then
        success "Redis connection check passed"
    else
        warning "Redis connection check failed (Redis might be disabled)"
    fi

    success "All health checks passed"
}

# Function to cleanup old containers and images
cleanup() {
    log "Cleaning up old Docker resources..."

    # Remove unused containers
    docker container prune -f

    # Remove unused images
    docker image prune -f

    # Remove unused volumes (with confirmation)
    read -p "Remove unused Docker volumes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
    fi

    success "Cleanup completed"
}

# Function to rollback deployment
rollback() {
    if [ ! -f "$ROLLBACK_FILE" ]; then
        error "No rollback information found"
        exit 1
    fi

    BACKUP_PATH=$(cat "$ROLLBACK_FILE")
    log "Rolling back to previous deployment: $BACKUP_PATH"

    # Stop current services
    docker-compose -f docker-compose.prod.yml down

    # Restore database if backup exists
    if [ -f "$BACKUP_PATH/database.sql" ]; then
        log "Restoring database..."
        docker-compose -f docker-compose.prod.yml up -d postgres-prod
        sleep 10
        docker-compose -f docker-compose.prod.yml exec postgres-prod psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_PATH/database.sql"
    fi

    # Restore uploads if backup exists
    if [ -d "$BACKUP_PATH/uploads" ]; then
        log "Restoring uploads..."
        rm -rf uploads
        cp -r "$BACKUP_PATH/uploads" .
    fi

    # Start services
    log "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    success "Rollback completed"
}

# Function to show deployment status
status() {
    log "Deployment Status:"
    echo

    # Show running containers
    echo "=== Docker Containers ==="
    docker-compose -f docker-compose.prod.yml ps
    echo

    # Show resource usage
    echo "=== Resource Usage ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    echo

    # Show recent logs
    echo "=== Recent Logs (last 20 lines) ==="
    docker-compose -f docker-compose.prod.yml logs --tail=20
}

# Main deployment function
main() {
    log "Starting production deployment of Medical Coverage System"

    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            deploy_application
            health_check
            cleanup
            success "Deployment completed successfully! 🎉"
            ;;
        "rollback")
            rollback
            health_check
            success "Rollback completed successfully!"
            ;;
        "status")
            status
            ;;
        "health")
            health_check
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|health|cleanup}"
            echo
            echo "Commands:"
            echo "  deploy   - Deploy the application to production"
            echo "  rollback - Rollback to previous deployment"
            echo "  status   - Show deployment status"
            echo "  health   - Perform health checks"
            echo "  cleanup  - Clean up Docker resources"
            exit 1
            ;;
    esac
}

# Trap to handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"