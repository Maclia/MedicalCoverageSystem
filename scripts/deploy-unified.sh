#!/bin/bash

# Medical Coverage System Unified Deployment Script
# This script handles unified deployment for all services (main + finance)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_service() {
    local service=$1
    local status=$2
    local message=$3

    case $status in
        starting)
            echo -e "${CYAN}[${service^^}]${NC} $message"
            ;;
        success)
            echo -e "${GREEN}[${service^^}]${NC} $message"
            ;;
        warning)
            echo -e "${YELLOW}[${service^^}]${NC} $message"
            ;;
        error)
            echo -e "${RED}[${service^^}]${NC} $message"
            ;;
        *)
            echo -e "${BLUE}[${service^^}]${NC} $message"
            ;;
    esac
}

# Function to display help
show_help() {
    cat << EOF
Medical Coverage System Unified Deployment Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

Environments:
    dev, development     Deploy development environment
    staging             Deploy staging environment
    prod, production    Deploy production environment

Options:
    --skip-build         Skip Docker build step
    --skip-tests         Skip automated tests
    --skip-backup       Skip database backup (production only)
    --force-rebuild     Force rebuild all images
    --dry-run           Show deployment plan without executing
    --rollback          Rollback to previous deployment
    --logs              Show deployment logs
    --health-check      Run health check after deployment
    --services-only     Deploy specific services only
    --migrate           Run database migrations only
    --cleanup           Clean up old resources
    --monitor            Start monitoring mode
    -h, --help          Show this help message

Service Groups:
    --main               Deploy main application services only
    --finance            Deploy finance services only
    --infrastructure    Deploy infrastructure services only
    --all               Deploy all services (default)

Examples:
    $0 dev                        # Deploy development environment
    $0 prod --skip-tests          # Deploy production without tests
    $0 staging --dry-run          # Show staging deployment plan
    $0 prod --rollback            # Rollback production deployment
    $0 prod --services-only --finance  # Deploy only finance services
    $0 --migrate                  # Run database migrations only
    $0 --cleanup                  # Clean up old resources
    $0 prod --monitor             # Deploy and start monitoring

Environment Variables:
    DOCKER_REGISTRY               Docker registry URL
    TAG                           Docker image tag (default: latest)
    BACKUP_RETENTION_DAYS        Backup retention period (default: 30)
    SLACK_WEBHOOK_URL            Slack webhook for notifications
    HEALTH_CHECK_INTERVAL        Health check interval in seconds
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
        return 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        return 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        return 1
    fi

    # Check available disk space (at least 5GB)
    local available_space=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
    if [ "$available_space" -lt 5 ]; then
        log_error "Insufficient disk space. At least 5GB required, available: ${available_space}GB"
        return 1
    fi

    # Check available memory (at least 2GB free)
    local available_memory=$(free -g | awk 'NR==2{print $7}')
    if [ "$available_memory" -lt 2 ]; then
        log_warning "Low memory available. At least 2GB recommended, available: ${available_memory}GB"
    fi

    # Check environment file
    ENV_FILE=".env.unified"
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Please create environment file with required variables"
        return 1
    fi

    # Load environment variables
    source "$ENV_FILE"

    # Check required environment variables
    REQUIRED_VARS=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "FINANCE_API_KEY"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable missing: $var"
            return 1
        fi
    done

    log_success "Prerequisites check passed"
    return 0
}

# Function to backup databases (production only)
backup_databases() {
    if [ "$ENVIRONMENT" != "prod" ] && [ "$ENVIRONMENT" != "production" ]; then
        return 0
    fi

    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Skipping database backup"
        return 0
    fi

    log_step "Backing Up Databases"

    BACKUP_DIR="backups"
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Backup main database
    MAIN_DB_BACKUP="$BACKUP_DIR/main_database_backup_$BACKUP_TIMESTAMP.sql"
    log_service "database" "starting" "Creating main database backup..."

    if docker exec medcoverage_postgres_unified pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB:-medical_coverage}" > "$MAIN_DB_BACKUP"; then
        log_service "database" "success" "Main database backup created: $MAIN_DB_BACKUP"
        gzip "$MAIN_DB_BACKUP"
        log_service "database" "success" "Main database backup compressed: ${MAIN_DB_BACKUP}.gz"
    else
        log_service "database" "error" "Main database backup failed"
        return 1
    fi

    # Backup finance database
    FINANCE_DB_BACKUP="$BACKUP_DIR/finance_database_backup_$BACKUP_TIMESTAMP.sql"
    log_service "finance-database" "starting" "Creating finance database backup..."

    if docker exec medcoverage_postgres_unified pg_dump -U "${POSTGRES_USER}" "medical_coverage_finance" > "$FINANCE_DB_BACKUP"; then
        log_service "finance-database" "success" "Finance database backup created: $FINANCE_DB_BACKUP"
        gzip "$FINANCE_DB_BACKUP"
        log_service "finance-database" "success" "Finance database backup compressed: ${FINANCE_DB_BACKUP}.gz"
    else
        log_service "finance-database" "error" "Finance database backup failed"
        return 1
    fi

    # Create unified backup manifest
    cat << EOF > "$BACKUP_DIR/backup_manifest_$BACKUP_TIMESTAMP.json"
{
    "backup_timestamp": "$BACKUP_TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "databases": {
        "main": {
            "database": "${POSTGRES_DB:-medical_coverage}",
            "backup_file": "${MAIN_DB_BACKUP}.gz",
            "size": "$(stat -c%s "${MAIN_DB_BACKUP}.gz") bytes"
        },
        "finance": {
            "database": "medical_coverage_finance",
            "backup_file": "${FINANCE_DB_BACKUP}.gz",
            "size": "$(stat -c%s "${FINANCE_DB_BACKUP}.gz") bytes"
        }
    },
    "services": ["main", "finance"],
    "created_by": "$(whoami)",
    "created_at": "$(date -Iseconds)"
}
EOF

    # Clean old backups
    log_service "backup" "starting" "Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "*backup_*" -mtime +$BACKUP_RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "backup_manifest_*" -mtime +$BACKUP_RETENTION_DAYS -delete

    log_service "backup" "success" "Database backup completed successfully"
    return 0
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping automated tests"
        return 0
    fi

    log_step "Running Automated Tests"

    # Unit tests
    log_service "tests" "starting" "Running unit tests..."
    if npm test -- --coverage --watchAll=false; then
        log_service "tests" "success" "Unit tests passed"
    else
        log_service "tests" "error" "Unit tests failed"
        return 1
    fi

    # Integration tests (only in staging and production)
    if [ "$ENVIRONMENT" = "staging" ] || [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
        log_service "tests" "starting" "Running integration tests..."
        if npm run test:integration; then
            log_service "tests" "success" "Integration tests passed"
        else
            log_service "tests" "error" "Integration tests failed"
            return 1
        fi
    fi

    # Finance service tests (if finance services are enabled)
    if [ "$SERVICES_GROUP" = "all" ] || [ "$SERVICES_GROUP" = "finance" ]; then
        log_service "finance-tests" "starting" "Running finance service tests..."
        if npm run test:finance; then
            log_service "finance-tests" "success" "Finance tests passed"
        else
            log_service "finance-tests" "error" "Finance tests failed"
            return 1
        fi
    fi

    log_service "tests" "success" "All tests passed"
    return 0
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

    export TAG

    # Build main application image
    if [ "$SERVICES_GROUP" = "all" ] || [ "$SERVICES_GROUP" = "main" ]; then
        log_service "build" "starting" "Building main application image..."
        if [ "$FORCE_REBUILD" = true ]; then
            docker build --no-cache -t "medcoverage-backend:$TAG" . -f Dockerfile
            docker build --no-cache -t "medcoverage-frontend:$TAG" ./client -f ./client/Dockerfile
        else
            docker build -t "medcoverage-backend:$TAG" . -f Dockerfile
            docker build -t "medcoverage-frontend:$TAG" ./client -f ./client/Dockerfile
        fi
        log_service "build" "success" "Main application images built: medcoverage-backend:$TAG, medcoverage-frontend:$TAG"
    fi

    # Tag with registry if specified
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        docker tag "medcoverage-backend:$TAG" "$DOCKER_REGISTRY/medcoverage-backend:$TAG"
        docker tag "medcoverage-frontend:$TAG" "$DOCKER_REGISTRY/medcoverage-frontend:$TAG"
        log_service "build" "success" "Images tagged for registry: $DOCKER_REGISTRY"
    fi

    log_success "Docker images build completed"
    return 0
}

# Function to run database migrations
run_migrations() {
    if [ "$SERVICES_GROUP" = "infrastructure" ]; then
        return 0
    fi

    log_step "Running Database Migrations"

    # Initialize unified database
    log_service "database" "starting" "Initializing unified database schema..."

    # Check if PostgreSQL container is healthy
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec medcoverage_postgres_unified pg_isready -U "${POSTGRES_USER}" &>/dev/null; then
            break
        fi
        log_service "database" "waiting" "Waiting for PostgreSQL to be ready... (attempt $((attempt + 1))/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -eq $max_attempts ]; then
        log_service "database" "error" "PostgreSQL is not ready after $max_attempts attempts"
        return 1
    fi

    # Run main application migrations
    log_service "database" "starting" "Running main application migrations..."
    if npm run migrate:up; then
        log_service "database" "success" "Main database migrations completed"
    else
        log_service "database" "error" "Main database migrations failed"
        return 1
    fi

    # Run finance service migrations if enabled
    if [ "$SERVICES_GROUP" = "all" ] || [ "$SERVICES_GROUP" = "finance" ]; then
        log_service "finance-database" "starting" "Running finance service migrations..."
        if npm run migrate:finance:up; then
            log_service "finance-database" "success" "Finance database migrations completed"
        else
            log_service "finance-database" "error" "Finance database migrations failed"
            return 1
        fi
    fi

    log_service "database" "success" "All database migrations completed successfully"
    return 0
}

# Function to deploy services
deploy_services() {
    log_step "Deploying Services"

    # Determine compose file
    COMPOSE_FILE="deployment/docker/docker-compose.unified.yml"

    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        return 1
    fi

    # Stop existing containers
    log_service "deployment" "starting" "Stopping existing containers..."
    if docker-compose -f "$COMPOSE_FILE" down --remove-orphans; then
        log_service "deployment" "success" "Existing containers stopped"
    else
        log_service "deployment" "warning" "No existing containers to stop"
    fi

    # Deploy specific service groups
    local compose_args=("-f" "$COMPOSE_FILE")

    case $SERVICES_GROUP in
        main)
            log_service "deployment" "starting" "Deploying main application services only..."
            compose_args+=("--profile" "main")
            ;;
        finance)
            log_service "deployment" "starting" "Deploying finance services only..."
            compose_args+=("--profile" "finance")
            ;;
        infrastructure)
            log_service "deployment" "starting" "Deploying infrastructure services only..."
            compose_args+=("--profile" "infrastructure")
            ;;
        all|*)
            log_service "deployment" "starting" "Deploying all services..."
            ;;
    esac

    # Add backup and monitoring profiles if enabled
    if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
        compose_args+=("--profile" "backup")
    fi

    if [ "$ENABLE_MONITORING" = true ]; then
        compose_args+=("--profile" "monitoring")
    fi

    # Deploy new version
    log_service "deployment" "starting" "Starting new deployment..."
    if docker-compose "${compose_args[@]}" up -d; then
        log_service "deployment" "success" "Services deployment started"
    else
        log_service "deployment" "error" "Services deployment failed"
        return 1
    fi

    # Wait for services to be healthy
    log_service "deployment" "starting" "Waiting for services to be healthy..."
    local max_wait_time=300  # 5 minutes
    local wait_time=0
    local healthy_count=0
    local total_containers=0

    while [ $wait_time -lt $max_wait_time ]; do
        # Count total and healthy containers
        total_containers=$(docker ps --filter "name=medcoverage" --format "{{.Names}}" | wc -l)
        healthy_count=$(docker ps --filter "name=medcoverage" --filter "health=healthy" --format "{{.Names}}" | wc -l)

        if [ $total_containers -gt 0 ] && [ $healthy_count -eq $total_containers ]; then
            log_service "deployment" "success" "All $total_containers services are healthy"
            break
        fi

        log_service "deployment" "waiting" "Services healthy: $healthy_count/$total_containers (${wait_time}s/${max_wait_time}s)"
        sleep 10
        wait_time=$((wait_time + 10))
    done

    if [ $wait_time -ge $max_wait_time ]; then
        log_service "deployment" "warning" "Services health check timeout ($max_wait_time seconds)"
        log_service "deployment" "info" "Unhealthy services:"
        docker ps --filter "name=medcoverage" --format "table {{.Names}}\t{{.Status}}" | grep -v "healthy\|Up (health:"
        return 1
    fi

    log_success "Services deployment completed successfully"
    return 0
}

# Function to check service health
check_service_health() {
    log_step "Checking Service Health"

    # Use unified health check script
    if [ -f "deployment/scripts/health-check-unified.sh" ]; then
        log_service "health" "starting" "Running unified health check..."

        if deployment/scripts/health-check-unified.sh --once --verbose; then
            log_service "health" "success" "All services health checks passed"
        else
            log_service "health" "error" "Some services health checks failed"
            return 1
        fi
    else
        log_service "health" "warning" "Health check script not found, performing manual checks..."

        # Manual health checks
        local services=(
            "Backend API:http://localhost:3001/api/health"
            "Finance API:http://localhost:5000/api/finance/health"
            "Frontend:http://localhost:3000"
        )

        for service_info in "${services[@]}"; do
            local service_name="${service_info%:*}"
            local service_url="${service_info#*:}"

            if curl -f --max-time 10 "$service_url" &>/dev/null; then
                log_service "$service_name" "success" "Service is healthy"
            else
                log_service "$service_name" "error" "Service health check failed"
                return 1
            fi
        done
    fi

    log_success "Service health checks completed successfully"
    return 0
}

# Function to rollback deployment
rollback_deployment() {
    log_step "Rolling Back Deployment"

    # Get previous deployment tag
    PREVIOUS_TAG=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "medcoverage-backend" | tail -2 | head -1 | cut -d':' -f2)

    if [ -z "$PREVIOUS_TAG" ]; then
        log_error "No previous deployment found"
        return 1
    fi

    log_service "rollback" "starting" "Rolling back to tag: $PREVIOUS_TAG"

    # Stop current deployment
    COMPOSE_FILE="deployment/docker/docker-compose.unified.yml"
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans

    # Deploy previous version
    export TAG=$PREVIOUS_TAG
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        log_service "rollback" "success" "Rollback deployment started"
    else
        log_service "rollback" "error" "Rollback deployment failed"
        return 1
    fi

    # Wait for services
    sleep 30

    # Check health
    if check_service_health; then
        log_service "rollback" "success" "Rollback completed successfully"
    else
        log_service "rollback" "error" "Rollback health check failed"
        return 1
    fi

    log_success "Deployment rollback completed successfully"
    return 0
}

# Function to clean up old resources
cleanup_resources() {
    log_step "Cleaning Up Old Resources"

    # Remove unused Docker images
    log_service "cleanup" "starting" "Removing unused Docker images..."
    docker image prune -f

    # Remove unused Docker volumes (be careful with this)
    log_service "cleanup" "warning" "Removing dangling Docker volumes..."
    docker volume prune -f

    # Remove old Docker containers
    log_service "cleanup" "starting" "Removing exited Docker containers..."
    docker container prune -f

    # Clean old logs (keep last 7 days)
    log_service "cleanup" "starting" "Cleaning old application logs..."
    find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || log_service "cleanup" "warning" "No old logs to clean"

    # Clean old backups (keep based on retention policy)
    if [ -n "$BACKUP_RETENTION_DAYS" ]; then
        log_service "cleanup" "starting" "Cleaning old backups (older than $BACKUP_RETENTION_DAYS days)..."
        find backups/ -name "*backup_*" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || log_service "cleanup" "warning" "No old backups to clean"
    fi

    log_service "cleanup" "success" "Resource cleanup completed"
    return 0
}

# Function to show deployment logs
show_logs() {
    log_step "Showing Deployment Logs"

    COMPOSE_FILE="deployment/docker/docker-compose.unified.yml"
    docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
}

# Function to start monitoring
start_monitoring() {
    log_step "Starting Monitoring Mode"

    if [ -f "deployment/scripts/health-check-unified.sh" ]; then
        log_service "monitoring" "starting" "Starting unified health monitoring..."
        deployment/scripts/health-check-unified.sh --interval ${HEALTH_CHECK_INTERVAL:-60} --notify &
        MONITOR_PID=$!
        log_service "monitoring" "success" "Health monitoring started (PID: $MONITOR_PID)"

        # Keep script running and handle interrupt
        trap 'log_service "monitoring" "stopping" "Stopping health monitoring (PID: $MONITOR_PID)"; kill $MONITOR_PID 2>/dev/null; exit 0' INT TERM

        log_info "Monitoring is active. Press Ctrl+C to stop."
        wait $MONITOR_PID
    else
        log_error "Health check script not found. Cannot start monitoring."
        return 1
    fi
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
ENABLE_HEALTH_CHECK=false
ENABLE_MONITORING=false
SERVICES_GROUP="all"
MIGRATE_ONLY=false
CLEANUP_ONLY=false

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
        --health-check)
            ENABLE_HEALTH_CHECK=true
            shift
            ;;
        --monitor)
            ENABLE_MONITORING=true
            shift
            ;;
        --main)
            SERVICES_GROUP="main"
            shift
            ;;
        --finance)
            SERVICES_GROUP="finance"
            shift
            ;;
        --infrastructure)
            SERVICES_GROUP="infrastructure"
            shift
            ;;
        --all)
            SERVICES_GROUP="all"
            shift
            ;;
        --migrate)
            MIGRATE_ONLY=true
            shift
            ;;
        --cleanup)
            CLEANUP_ONLY=true
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
if [ -z "$ENVIRONMENT" ] && [ "$ROLLBACK" = false ] && [ "$SHOW_LOGS" = false ] && [ "$MIGRATE_ONLY" = false ] && [ "$CLEANUP_ONLY" = false ]; then
    log_error "Environment is required"
    show_help
    exit 1
fi

if [ -n "$ENVIRONMENT" ]; then
    validate_environment "$ENVIRONMENT"
fi

# Main execution
main() {
    log_info "Medical Coverage System Unified Deployment"
    echo "=========================================="
    log_info "Environment: ${ENVIRONMENT:-Not specified}"
    log_info "Services Group: $SERVICES_GROUP"
    log_info "Dry Run: $DRY_RUN"
    echo

    # Handle special operations
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

    if [ "$MIGRATE_ONLY" = true ]; then
        if [ "$DRY_RUN" = true ]; then
            log_warning "DRY RUN: Would run database migrations"
            exit 0
        fi
        run_migrations
        exit 0
    fi

    if [ "$CLEANUP_ONLY" = true ]; then
        if [ "$DRY_RUN" = true ]; then
            log_warning "DRY RUN: Would clean up old resources"
            exit 0
        fi
        cleanup_resources
        exit 0
    fi

    # Show deployment plan if dry run
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
        echo
        log_info "Deployment Plan:"
        log_info "1. Check prerequisites"
        log_info "2. Backup databases (production only)"
        log_info "3. Run automated tests"
        log_info "4. Build Docker images"
        log_info "5. Run database migrations"
        log_info "6. Deploy services ($SERVICES_GROUP)"
        log_info "7. Check service health"
        log_info "8. Start monitoring (if enabled)"
        exit 0
    fi

    # Execute deployment steps
    check_prerequisites
    backup_databases
    run_tests
    build_images

    # Start services before migrations for initialization
    deploy_services

    # Run migrations after services are up
    run_migrations

    # Final health check
    if check_service_health; then
        log_success "🎉 Unified deployment completed successfully!"
        log_info "Application is now running at: http://localhost:3000"
        log_info "Finance services are available at: http://localhost:5000"
        log_info "API endpoints: http://localhost:3001/api/"
        log_info "Finance API endpoints: http://localhost:5000/api/finance/"
    else
        log_error "Deployment completed but health checks failed"
        log_warning "Please check the logs and service status"
        exit 1
    fi

    # Start monitoring if enabled
    if [ "$ENABLE_MONITORING" = true ]; then
        start_monitoring
    fi

    # Run health check if requested
    if [ "$ENABLE_HEALTH_CHECK" = true ]; then
        deployment/scripts/health-check-unified.sh --once --verbose
    fi
}

# Run main function
main "$@"