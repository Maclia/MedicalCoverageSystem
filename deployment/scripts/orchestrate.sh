#!/bin/bash

# Medical Coverage System - Multi-environment deployment orchestrator
# Unified script to manage containers, databases, and services
# Supports: dev, staging, production environments

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-development}"
COMMAND="${2:-start}"

# Common configuration
POSTGRES_CONTAINER="medical-postgres"
REDIS_CONTAINER="medical-redis"
NETWORK_NAME="medical-services-network"

# Database config - sourced from .env if exists
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres_password_2024}"
DB_PORT="${DB_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Service configuration - Define once, reuse everywhere
declare -A SERVICES=(
    [api-gateway]="api_gateway:3001"
    [billing-service]="medical_coverage_billing:3002"
    [core-service]="medical_coverage_core:3003"
    [finance-service]="medical_coverage_finance:3004"
    [crm-service]="medical_coverage_crm:3005"
    [membership-service]="medical_coverage_membership:3006"
    [hospital-service]="medical_coverage_hospital:3007"
    [insurance-service]="medical_coverage_insurance:3008"
    [wellness-service]="medical_coverage_wellness:3009"
)

# ============================================================================
# COLORS AND LOGGING
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error()   { echo -e "${RED}[✗]${NC} $*"; }
log_step()    { echo -e "\n${PURPLE}════════════════════════════════════════${NC}\n${PURPLE}$*${NC}\n${PURPLE}════════════════════════════════════════${NC}\n"; }

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Check if container is running
is_container_running() {
    docker ps --filter "name=$1" --filter "status=running" | grep -q "$1"
}

# Check if container exists (running or stopped)
container_exists() {
    docker ps -a --filter "name=$1" | grep -q "$1"
}

# Wait for container health with timeout
wait_for_container() {
    local container=$1
    local health_check=$2
    local max_attempts=${3:-30}
    local attempt=1

    log_info "Waiting for $container..."
    while [ $attempt -le $max_attempts ]; do
        if eval "$health_check" > /dev/null 2>&1; then
            log_success "$container is ready"
            return 0
        fi
        echo -ne "\r  Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done
    echo ""
    log_error "Timeout waiting for $container"
    return 1
}

# Load environment file
load_env_file() {
    local env_file=".env.${1}"
    if [ -f "$env_file" ]; then
        log_info "Loading $env_file"
        set -a
        source "$env_file"
        set +a
    fi
}

# ============================================================================
# CONTAINER MANAGEMENT
# ============================================================================

start_postgres() {
    log_step "Starting PostgreSQL"
    
    if is_container_running $POSTGRES_CONTAINER; then
        log_warning "PostgreSQL already running"
        return 0
    fi

    if container_exists $POSTGRES_CONTAINER; then
        log_info "Starting existing PostgreSQL container"
        docker start $POSTGRES_CONTAINER
    else
        log_info "Creating new PostgreSQL container"
        docker run -d \
            --name $POSTGRES_CONTAINER \
            -e POSTGRES_USER="$DB_USER" \
            -e POSTGRES_PASSWORD="$DB_PASSWORD" \
            -p "$DB_PORT:5432" \
            -v postgres_data:/var/lib/postgresql/data \
            -v "$SCRIPT_DIR/database/init:/docker-entrypoint-initdb.d" \
            --network $NETWORK_NAME \
            postgres:15-alpine
    fi

    wait_for_container $POSTGRES_CONTAINER "docker exec $POSTGRES_CONTAINER pg_isready -U $DB_USER"
}

start_redis() {
    log_step "Starting Redis"
    
    if is_container_running $REDIS_CONTAINER; then
        log_warning "Redis already running"
        return 0
    fi

    if container_exists $REDIS_CONTAINER; then
        log_info "Starting existing Redis container"
        docker start $REDIS_CONTAINER
    else
        log_info "Creating new Redis container"
        docker run -d \
            --name $REDIS_CONTAINER \
            -p "$REDIS_PORT:6379" \
            -v redis_data:/data \
            --network $NETWORK_NAME \
            redis:7-alpine
    fi

    wait_for_container $REDIS_CONTAINER "docker exec $REDIS_CONTAINER redis-cli ping | grep -q PONG"
}

create_network() {
    log_step "Setting up Docker network"
    docker network create $NETWORK_NAME 2>/dev/null || log_warning "Network already exists"
}

# ============================================================================
# DATABASE SETUP
# ============================================================================

setup_databases() {
    log_step "Creating service databases"
    
    local db_password_escaped="${DB_PASSWORD//\'/\'\'}"
    
    for service_name in "${!SERVICES[@]}"; do
        local db_info="${SERVICES[$service_name]}"
        local db_name="${db_info%%:*}"
        
        log_info "Creating database: $db_name"
        docker exec $POSTGRES_CONTAINER psql -U "$DB_USER" -c "CREATE DATABASE $db_name;" 2>/dev/null \
            || log_warning "Database $db_name may already exist"
    done
    
    log_success "Databases setup complete"
}

# ============================================================================
# DOCKER COMPOSE MANAGEMENT
# ============================================================================

start_services() {
    log_step "Starting services with Docker Compose"
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        return 1
    fi
    
    docker-compose up -d
    log_success "Services started"
}

stop_services() {
    log_step "Stopping services"
    docker-compose down
    log_success "Services stopped"
}

restart_service() {
    local service=$1
    log_step "Restarting service: $service"
    docker-compose restart $service
    log_success "$service restarted"
}

# ============================================================================
# CLEANUP
# ============================================================================

cleanup() {
    local option=$1
    
    case $option in
        containers)
            log_step "Cleaning up containers"
            docker-compose down -v
            log_success "Containers cleaned"
            ;;
        images)
            log_step "Removing Docker images"
            docker-compose down -v --rmi all
            log_success "Images removed"
            ;;
        all)
            log_step "Full cleanup"
            docker-compose down -v --rmi all
            docker volume rm postgres_data redis_data nginx_logs 2>/dev/null || true
            log_success "Full cleanup complete"
            ;;
        *)
            log_warning "Unknown cleanup option: $option"
            ;;
    esac
}

# ============================================================================
# HEALTH & STATUS
# ============================================================================

check_health() {
    log_step "Checking system health"
    
    local healthy=0
    local total=0
    
    for service_name in "${!SERVICES[@]}"; do
        ((total++))
        if is_container_running "medical_${service_name//-/_}_service"; then
            log_success "$service_name is running"
            ((healthy++))
        else
            log_warning "$service_name is not running"
        fi
    done
    
    echo ""
    log_info "Health Status: $healthy/$total services running"
    [ $healthy -eq $total ] && return 0 || return 1
}

show_logs() {
    local service=$1
    if [ -z "$service" ]; then
        log_info "Showing all logs"
        docker-compose logs -f
    else
        log_info "Showing logs for: $service"
        docker-compose logs -f "$service"
    fi
}

# ============================================================================
# MAIN COMMAND ROUTER
# ============================================================================

show_help() {
    cat << EOF
${CYAN}Medical Coverage System - Deployment Orchestrator${NC}

${PURPLE}Usage:${NC}
    $0 [ENVIRONMENT] [COMMAND] [OPTIONS]

${PURPLE}Environments:${NC}
    dev, development     Development environment
    staging             Staging environment  
    prod, production    Production environment

${PURPLE}Commands:${NC}
    start [full]        Start services (full=with DB setup)
    stop                Stop all services
    restart SERVICE     Restart specific service
    status              Show health status
    logs [SERVICE]      Show service logs
    clean [OPTION]      Cleanup resources
                        - containers: Remove containers
                        - images: Remove images
                        - all: Full cleanup
    help                Show this help

${PURPLE}Examples:${NC}
    $0 dev start              # Start development environment
    $0 dev start full         # Start with database initialization
    $0 prod status            # Check production services health
    $0 dev logs core-service  # View core-service logs
    $0 dev clean all          # Full cleanup development

${PURPLE}Environment Files:${NC}
    Create .env.development, .env.staging, .env.production
    to override default environment variables

EOF
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    case $COMMAND in
        start)
            create_network
            start_postgres
            start_redis
            if [ "${3:-}" = "full" ]; then
                setup_databases
            fi
            start_services
            check_health
            ;;
        stop)
            stop_services
            ;;
        restart)
            if [ -z "$3" ]; then
                log_error "Service name required"
                exit 1
            fi
            restart_service "$3"
            ;;
        status|health)
            check_health
            ;;
        logs)
            show_logs "$3"
            ;;
        clean|cleanup)
            cleanup "${3:-containers}"
            ;;
        help|-h|--help)
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main if script is executed (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    load_env_file "$ENVIRONMENT"
    main "$@"
fi
