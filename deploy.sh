#!/bin/bash

# MedicalCoverageSystem Automated Docker Deployment
# Cross-platform deployment orchestrator with zero-configuration setup
# Usage: ./deploy.sh [dev|prod] [--skip-ssl] [--custom-cert-path=/path/to/certs]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DEPLOYMENT_TYPE="dev"
SKIP_SSL=false
CUSTOM_CERT_PATH=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|prod)
                DEPLOYMENT_TYPE="$1"
                shift
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --custom-cert-path=*)
                CUSTOM_CERT_PATH="${1#*=}"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo -e "${RED}Error: Unknown option $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help information
show_help() {
    cat << EOF
MedicalCoverageSystem Automated Docker Deployment

USAGE:
    ./deploy.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev     Development deployment with self-signed certificates
    prod    Production deployment with custom certificates

OPTIONS:
    --skip-ssl                    Skip SSL certificate generation
    --custom-cert-path=PATH       Path to custom SSL certificates (prod only)
    --help, -h                    Show this help message

EXAMPLES:
    ./deploy.sh dev                           # Development deployment
    ./deploy.sh prod                          # Production deployment
    ./deploy.sh prod --custom-cert-path=/etc/ssl/certs
    ./deploy.sh dev --skip-ssl                # Development without SSL

FEATURES:
    • Cross-platform compatibility (Windows/macOS/Linux)
    • Automatic directory creation and permissions
    • SSL certificate management (self-signed or custom)
    • Environment configuration with secure secrets
    • Docker container orchestration with health checks
    • Database initialization and migrations
    • Service monitoring and readiness detection
    • Clear success messages with access URLs

EOF
}

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

print_step() {
    print_status "$BLUE" "STEP: $1"
}

print_success() {
    print_status "$GREEN" "✅ $1"
}

print_warning() {
    print_status "$YELLOW" "⚠️  $1"
}

print_error() {
    print_status "$RED" "❌ $1"
}

print_info() {
    print_status "$CYAN" "ℹ️  $1"
}

# Load platform utilities
load_platform_utils() {
    local platform_utils_file="${SCRIPT_DIR}/scripts/platform-utils.sh"

    if [[ ! -f "$platform_utils_file" ]]; then
        print_error "Platform utilities not found: $platform_utils_file"
        exit 1
    fi

    source "$platform_utils_file"

    # Initialize platform detection
    init_platform_detection

    print_success "Platform utilities loaded for $(get_os_name)"
}

# Validate prerequisites
validate_prerequisites() {
    print_step "Validating prerequisites"

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        print_info "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        print_info "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi

    # Check if OpenSSL is available (unless SSL is skipped)
    if [[ "$SKIP_SSL" != "true" ]]; then
        if ! command -v openssl &> /dev/null; then
            print_error "OpenSSL is not installed. Please install OpenSSL first."
            print_info "Or use --skip-ssl to skip SSL certificate generation."
            exit 1
        fi
    fi

    # Check Docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    print_success "All prerequisites validated"
}

# Create directory structure
create_directory_structure() {
    print_step "Creating directory structure"

    local directories=(
        "deployment/ssl/dev"
        "deployment/ssl/prod"
        "deployment/configs"
        "deployment/docker"
        "deployment/logs"
        "scripts"
        "database/init"
        "logs"
        "temp"
    )

    for dir in "${directories[@]}"; do
        local full_path="${PROJECT_ROOT}/$dir"
        if [[ ! -d "$full_path" ]]; then
            mkdir -p "$full_path"
            print_info "Created directory: $dir"
        fi
    done

    # Set proper permissions
    chmod 755 "${PROJECT_ROOT}/deployment"
    chmod 700 "${PROJECT_ROOT}/deployment/ssl"
    chmod 755 "${PROJECT_ROOT}/scripts"

    print_success "Directory structure created"
}

# Run environment setup
run_environment_setup() {
    print_step "Setting up environment configuration"

    local auto_setup_script="${SCRIPT_DIR}/scripts/auto-setup.sh"

    if [[ ! -f "$auto_setup_script" ]]; then
        print_error "Auto setup script not found: $auto_setup_script"
        exit 1
    fi

    # Make script executable
    chmod +x "$auto_setup_script"

    # Run environment setup
    if "$auto_setup_script" "$DEPLOYMENT_TYPE"; then
        print_success "Environment configuration completed"
    else
        print_error "Environment setup failed"
        exit 1
    fi
}

# Handle SSL certificates
handle_ssl_certificates() {
    if [[ "$SKIP_SSL" == "true" ]]; then
        print_warning "SSL certificate generation skipped"
        return 0
    fi

    print_step "Setting up SSL certificates"

    local ssl_manager_script="${SCRIPT_DIR}/scripts/ssl-manager.sh"

    if [[ ! -f "$ssl_manager_script" ]]; then
        print_error "SSL manager script not found: $ssl_manager_script"
        exit 1
    fi

    # Make script executable
    chmod +x "$ssl_manager_script"

    # Build SSL arguments
    local ssl_args=("$DEPLOYMENT_TYPE")

    if [[ -n "$CUSTOM_CERT_PATH" ]]; then
        ssl_args+=("--custom-cert-path=$CUSTOM_CERT_PATH")
    fi

    # Run SSL certificate setup
    if "$ssl_manager_script" "${ssl_args[@]}"; then
        print_success "SSL certificates setup completed"
    else
        print_error "SSL certificate setup failed"
        exit 1
    fi
}

# Generate Nginx configuration
generate_nginx_config() {
    print_step "Generating Nginx configuration"

    local nginx_generator_script="${SCRIPT_DIR}/scripts/nginx-generator.sh"

    if [[ ! -f "$nginx_generator_script" ]]; then
        print_error "Nginx generator script not found: $nginx_generator_script"
        exit 1
    fi

    # Make script executable
    chmod +x "$nginx_generator_script"

    # Run Nginx configuration generation
    if "$nginx_generator_script" "$DEPLOYMENT_TYPE"; then
        print_success "Nginx configuration generated"
    else
        print_error "Nginx configuration generation failed"
        exit 1
    fi
}

# Setup database
setup_database() {
    print_step "Setting up database"

    local db_setup_script="${SCRIPT_DIR}/scripts/db-setup.sh"

    if [[ ! -f "$db_setup_script" ]]; then
        print_error "Database setup script not found: $db_setup_script"
        exit 1
    fi

    # Make script executable
    chmod +x "$db_setup_script"

    # Run database setup
    if "$db_setup_script" "$DEPLOYMENT_TYPE"; then
        print_success "Database setup completed"
    else
        print_error "Database setup failed"
        exit 1
    fi
}

# Build and start Docker containers
build_and_start_containers() {
    print_step "Building and starting Docker containers"

    # Determine which Docker Compose file to use
    local compose_file="docker-compose.yml"
    local unified_compose_file="deployment/docker/docker-compose.unified.yml"

    if [[ -f "$unified_compose_file" ]]; then
        compose_file="$unified_compose_file"
    fi

    print_info "Using Docker Compose file: $compose_file"

    # Stop any existing containers
    print_info "Stopping existing containers..."
    docker-compose -f "$compose_file" --env-file "${PROJECT_ROOT}/.env" down --remove-orphans || true

    # Build and start containers
    print_info "Building containers..."
    docker-compose -f "$compose_file" --env-file "${PROJECT_ROOT}/.env" build --no-cache

    print_info "Starting containers..."
    docker-compose -f "$compose_file" --env-file "${PROJECT_ROOT}/.env" up -d

    # Wait for containers to start
    print_info "Waiting for containers to initialize..."
    sleep 30

    print_success "Docker containers built and started"
}

# Monitor service health
monitor_service_health() {
    print_step "Monitoring service health and readiness"

    local health_monitor_script="${SCRIPT_DIR}/scripts/health-monitor.sh"

    if [[ ! -f "$health_monitor_script" ]]; then
        print_error "Health monitor script not found: $health_monitor_script"
        exit 1
    fi

    # Make script executable
    chmod +x "$health_monitor_script"

    # Run health monitoring
    if "$health_monitor_script" "$DEPLOYMENT_TYPE"; then
        print_success "All services are healthy and ready"
    else
        print_warning "Some services may not be fully ready yet"
        print_info "You can monitor service status using: docker-compose logs -f"
    fi
}

# Display success message with URLs
display_success_message() {
    local protocol="http"
    if [[ "$DEPLOYMENT_TYPE" == "prod" || "$SKIP_SSL" != "true" ]]; then
        protocol="https"
    fi

    local hostname="localhost"
    if [[ "$DEPLOYMENT_TYPE" == "prod" ]]; then
        # Try to detect the actual hostname for production
        hostname=$(hostname -f 2>/dev/null || echo "your-domain.com")
    fi

    cat << EOF

${GREEN}✅ Deployment completed successfully!${NC}

${CYAN}🌐 Frontend:${NC} ${protocol}://${hostname}:3000
${CYAN}🔒 Frontend (HTTPS):${NC} ${protocol}://${hostname}:3000
${CYAN}📡 Backend API:${NC} ${protocol}://${hostname}:3001
${CYAN}📊 Finance API:${NC} ${protocol}://${hostname}:5000
${CYAN}🗄️  Database:${NC} postgresql://${hostname}:5432/medical_coverage_main
${CYAN}📋 Health Monitor:${NC} ${protocol}://${hostname}:3001/health

EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat << EOF
${YELLOW}Default Login: admin@example.com / password123${NC}
${YELLOW}Note: SSL certificates are self-signed for development${NC}
EOF
    else
        cat << EOF
${RED}⚠️  Important:${NC}
- Default admin credentials have been generated
- SSL certificates will expire on $(date -d '+1 year' '+%Y-%m-%d' 2>/dev/null || echo '2025-12-31')
- Database backups should be configured
- Monitor health endpoints for service status
EOF
    fi

    cat << EOF

${CYAN}Useful Commands:${NC}
• View logs: docker-compose logs -f
• Stop services: docker-compose down
• Restart services: docker-compose restart
• Check status: docker-compose ps

EOF
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "Deployment failed"
        print_info "Check the logs above for error details"
        print_info "You can clean up with: docker-compose down --volumes"
    fi
}

# Main execution
main() {
    print_step "Starting MedicalCoverageSystem deployment"
    print_info "Deployment type: $DEPLOYMENT_TYPE"
    print_info "SSL generation: $([[ "$SKIP_SSL" == "true" ]] && echo "Disabled" || echo "Enabled")"
    print_info "Custom certificates: $([[ -n "$CUSTOM_CERT_PATH" ]] && echo "$CUSTOM_CERT_PATH" || echo "None")"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute deployment steps
    validate_prerequisites
    load_platform_utils
    create_directory_structure
    run_environment_setup
    handle_ssl_certificates
    generate_nginx_config
    setup_database
    build_and_start_containers
    monitor_service_health

    # Display success message
    display_success_message
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main "$@"
fi