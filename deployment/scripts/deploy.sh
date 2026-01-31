#!/bin/bash

# Medical Coverage System Deployment Script
# This script handles deployment for development, staging, and production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logger functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
}

# Function to display help
show_help() {
    cat << EOF
Medical Coverage System Deployment Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

Environments:
    dev, development     Deploy development environment
    staging             Deploy staging environment
    prod, production    Deploy production environment

Options:
    --skip-build        Skip Docker build step
    --skip-tests        Skip automated tests
    --skip-backup       Skip database backup (production only)
    --force-rebuild     Force rebuild all images
    --dry-run           Show deployment plan without executing
    --rollback          Rollback to previous deployment
    --logs              Show deployment logs
    -h, --help          Show this help message

Examples:
    $0 dev                    # Deploy development environment
    $0 prod --skip-tests      # Deploy production without tests
    $0 staging --dry-run      # Show staging deployment plan
    $0 prod --rollback        # Rollback production deployment

Environment Variables:
    DOCKER_REGISTRY           Docker registry URL
    TAG                       Docker image tag (default: latest)
    BACKUP_RETENTION_DAYS     Backup retention period (default: 7)
EOF
}

# Function to validate environment
validate_environment() {
    local env=$1
    case $env in
        dev|development|staging|prod|production)
            return 0
            ;;
        *)
            log_error "Invalid environment: $env"
            log_info "Valid environments: dev, development, staging, prod, production"
            return 1
            ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi

    # Check environment file
    ENV_FILE="../.env.${ENVIRONMENT}"
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Please create the environment file with required variables"
        exit 1
    fi

    # Check required environment variables
    source "$ENV_FILE"
    REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET")
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable missing: $var"
            exit 1
        fi
    done

    log_success "Prerequisites check passed"
}

# Function to backup database (production only)
backup_database() {
    if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "production" ]; then
        return 0
    fi

    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping database backup"
        return 0
    fi

    log_step "Backing up Database"

    BACKUP_DIR="../backups"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Get database credentials
    source "../.env.production"

    # Create backup
    log_info "Creating database backup..."
    if docker exec medcoverage-postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$BACKUP_FILE"; then
        log_success "Database backup created: $BACKUP_FILE"

        # Compress backup
        gzip "$BACKUP_FILE"
        log_success "Backup compressed: ${BACKUP_FILE}.gz"

        # Clean old backups
        find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
        log_info "Cleaned backups older than $BACKUP_RETENTION_DAYS days"
    else
        log_error "Database backup failed"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping automated tests"
        return 0
    fi

    log_step "Running Automated Tests"

    # Unit tests
    log_info "Running unit tests..."
    if npm test -- --coverage --watchAll=false; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        exit 1
    fi

    # Integration tests (only in staging and production)
    if [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
        log_info "Running integration tests..."
        if npm run test:integration; then
            log_success "Integration tests passed"
        else
            log_error "Integration tests failed"
            exit 1
        fi
    fi

    log_success "All tests passed"
}

# Function to build Docker images
build_images() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping Docker build"
        return 0
    fi

    log_step "Building Docker Images"

    # Determine image tag
    TAG=${TAG:-latest}
    if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "development" ]; then
        TAG="prod-$(date +%Y%m%d-%H%M%S)"
    fi

    # Build backend
    log_info "Building backend image..."
    if [ "$FORCE_REBUILD" = true ]; then
        docker build --no-cache -t "medcoverage-backend:$TAG" .. -f ../Dockerfile
    else
        docker build -t "medcoverage-backend:$TAG" .. -f ../Dockerfile
    fi
    log_success "Backend image built: medcoverage-backend:$TAG"

    # Build frontend
    log_info "Building frontend image..."
    if [ "$FORCE_REBUILD" = true ]; then
        docker build --no-cache -t "medcoverage-frontend:$TAG" ../client -f ../client/Dockerfile
    else
        docker build -t "medcoverage-frontend:$TAG" ../client -f ../client/Dockerfile
    fi
    log_success "Frontend image built: medcoverage-frontend:$TAG"

    # Tag with registry if specified
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        docker tag "medcoverage-backend:$TAG" "$DOCKER_REGISTRY/medcoverage-backend:$TAG"
        docker tag "medcoverage-frontend:$TAG" "$DOCKER_REGISTRY/medcoverage-frontend:$TAG"
        log_info "Images tagged for registry: $DOCKER_REGISTRY"
    fi

    export TAG
}

# Function to deploy environment
deploy_environment() {
    log_step "Deploying $ENVIRONMENT Environment"

    # Choose compose file
    COMPOSE_FILE=""
    case $ENVIRONMENT in
        dev|development)
            COMPOSE_FILE="docker-compose.dev.yml"
            ;;
        staging|prod|production)
            COMPOSE_FILE="docker-compose.prod.yml"
            ;;
    esac

    if [ ! -f "docker/$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: docker/$COMPOSE_FILE"
        exit 1
    fi

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "docker/$COMPOSE_FILE" down

    # Deploy new version
    log_info "Deploying new version..."

    # Export environment variables
    source "../.env.${ENVIRONMENT}"
    export TAG

    # Start services
    docker-compose -f "docker/$COMPOSE_FILE" up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30

    # Check service health
    check_health

    log_success "Deployment completed successfully"
}

# Function to check service health
check_health() {
    log_info "Checking service health..."

    # Check backend health
    BACKEND_HEALTH=false
    for i in {1..30}; do
        if curl -f http://localhost:3001/api/health &> /dev/null; then
            BACKEND_HEALTH=true
            break
        fi
        sleep 2
    done

    if [ "$BACKEND_HEALTH" = true ]; then
        log_success "Backend service is healthy"
    else
        log_error "Backend service health check failed"
        docker-compose logs backend
        exit 1
    fi

    # Check frontend health
    FRONTEND_HEALTH=false
    for i in {1..30}; do
        if curl -f http://localhost:3000 &> /dev/null; then
            FRONTEND_HEALTH=true
            break
        fi
        sleep 2
    done

    if [ "$FRONTEND_HEALTH" = true ]; then
        log_success "Frontend service is healthy"
    else
        log_error "Frontend service health check failed"
        docker-compose logs frontend
        exit 1
    fi
}

# Function to rollback deployment
rollback_deployment() {
    log_step "Rolling Back Deployment"

    # Get previous deployment tag
    PREVIOUS_TAG=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "medcoverage-backend" | tail -2 | head -1 | cut -d':' -f2)

    if [ -z "$PREVIOUS_TAG" ]; then
        log_error "No previous deployment found"
        exit 1
    fi

    log_info "Rolling back to tag: $PREVIOUS_TAG"

    # Stop current deployment
    docker-compose -f docker/docker-compose.prod.yml down

    # Deploy previous version
    export TAG=$PREVIOUS_TAG
    docker-compose -f docker/docker-compose.prod.yml up -d

    # Wait for services
    sleep 30
    check_health

    log_success "Rollback completed successfully"
}

# Function to show deployment logs
show_logs() {
    log_info "Showing deployment logs..."
    docker-compose -f docker/docker-compose.prod.yml logs -f --tail=100
}

# Parse command line arguments
ENVIRONMENT=""
SKIP_BUILD=false
SKIP_TESTS=false
SKIP_BACKUP=false
FORCE_REBUILD=false
DRY_RUN=false
ROLLBACK=false
SHOW_LOGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|development|staging|prod|production)
            ENVIRONMENT=$1
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force-rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [ -z "$ENVIRONMENT" ] && [ "$ROLLBACK" = false ] && [ "$SHOW_LOGS" = false ]; then
    log_error "Environment is required"
    show_help
    exit 1
fi

# Change to deployment directory
cd "$(dirname "$0")/.."

# Main execution
main() {
    log_info "Medical Coverage System Deployment"
    echo "====================================="
    log_info "Environment: ${ENVIRONMENT:-Not specified}"
    log_info "Dry Run: $DRY_RUN"
    echo

    if [ "$SHOW_LOGS" = true ]; then
        show_logs
        exit 0
    fi

    if [ "$ROLLBACK" = true ]; then
        if [ "$DRY_RUN" = true ]; then
            log_warning "DRY RUN: Would rollback to previous deployment"
            exit 0
        fi
        rollback_deployment
        exit 0
    fi

    # Validate environment
    validate_environment "$ENVIRONMENT"

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
        echo
        log_info "Deployment Plan:"
        log_info "1. Check prerequisites"
        log_info "2. Backup database (production only)"
        log_info "3. Run automated tests"
        log_info "4. Build Docker images"
        log_info "5. Deploy environment"
        log_info "6. Check service health"
        exit 0
    fi

    # Execute deployment steps
    check_prerequisites
    backup_database
    run_tests
    build_images
    deploy_environment

    echo
    log_success "🎉 Deployment completed successfully!"
    log_info "Application is now running at: http://localhost:${PORT:-3000}"
}

# Run main function
main "$@"