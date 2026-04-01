#!/bin/bash
# Medical Coverage System - Centralized Service Configuration
# Source this file to get all service definitions
# Usage: source services-config.sh

##############################################################################
# SERVICE DEFINITIONS
# Format: SERVICE_NAME:PORT:DATABASE_NAME
##############################################################################

# Service mapping - SINGLE SOURCE OF TRUTH
declare -gA SERVICE_PORTS=(
    [api-gateway]=3001
    [billing-service]=3002
    [core-service]=3003
    [finance-service]=3004
    [crm-service]=3005
    [membership-service]=3006
    [hospital-service]=3007
    [insurance-service]=3008
    [wellness-service]=3009
)

declare -gA SERVICE_DATABASES=(
    [api-gateway]="api_gateway"
    [billing-service]="medical_coverage_billing"
    [core-service]="medical_coverage_core"
    [finance-service]="medical_coverage_finance"
    [crm-service]="medical_coverage_crm"
    [membership-service]="medical_coverage_membership"
    [hospital-service]="medical_coverage_hospital"
    [insurance-service]="medical_coverage_insurance"
    [wellness-service]="medical_coverage_wellness"
)

declare -gA SERVICE_CONTEXTS=(
    [api-gateway]="./services/api-gateway"
    [billing-service]="./services/billing-service"
    [core-service]="./services/core-service"
    [finance-service]="./services/finance-service"
    [crm-service]="./services/crm-service"
    [membership-service]="./services/membership-service"
    [hospital-service]="./services/hospital-service"
    [insurance-service]="./services/insurance-service"
    [wellness-service]="./services/wellness-service"
)

declare -gA SERVICE_CONTAINERS=(
    [api-gateway]="medical_api_gateway"
    [billing-service]="medical_billing_service"
    [core-service]="medical_core_service"
    [finance-service]="medical_finance_service"
    [crm-service]="medical_crm_service"
    [membership-service]="medical_membership_service"
    [hospital-service]="medical_hospital_service"
    [insurance-service]="medical_insurance_service"
    [wellness-service]="medical_wellness_service"
)

##############################################################################
# DATABASE CONFIGURATION
##############################################################################

declare -gA DATABASE_CONFIG=(
    [user]="${DB_USER:-postgres}"
    [password]="${DB_PASSWORD:-postgres_password_2024}"
    [host]="${DB_HOST:-postgres}"
    [port]="${DB_PORT:-5432}"
    [name]="medical_coverage"
)

##############################################################################
# REDIS CONFIGURATION
##############################################################################

declare -gA REDIS_CONFIG=(
    [host]="${REDIS_HOST:-redis}"
    [port]="${REDIS_PORT:-6379}"
    [url]="${REDIS_URL:-redis://redis:6379}"
)

##############################################################################
# DOCKER CONFIGURATION
##############################################################################

declare -gA DOCKER_CONFIG=(
    [postgres_container]="medical-postgres"
    [redis_container]="medical-redis"
    [network]="medical-services-network"
    [registry]="${DOCKER_REGISTRY:-}"
    [tag]="${DOCKER_TAG:-latest}"
)

##############################################################################
# DEPLOYMENT CONFIGURATION
##############################################################################

declare -gA DEPLOYMENT_CONFIG=(
    [environment]="${DEPLOYMENT_ENV:-development}"
    [node_env]="${NODE_ENV:-development}"
    [log_level]="${LOG_LEVEL:-info}"
    [service_timeout]="${SERVICE_TIMEOUT:-30000}"
    [health_check_interval]="30s"
    [health_check_timeout]="10s"
    [health_check_retries]="5"
)

##############################################################################
# UTILITY FUNCTIONS FOR SERVICE OPERATIONS
##############################################################################

# Get service port by name
get_service_port() {
    local service=$1
    echo "${SERVICE_PORTS[$service]}"
}

# Get service database by name
get_service_database() {
    local service=$1
    echo "${SERVICE_DATABASES[$service]}"
}

# Get service build context
get_service_context() {
    local service=$1
    echo "${SERVICE_CONTEXTS[$service]}"
}

# Get service container name
get_service_container() {
    local service=$1
    echo "${SERVICE_CONTAINERS[$service]}"
}

# Build database URL for service
build_database_url() {
    local service=$1
    local db="${SERVICE_DATABASES[$service]}"
    local user="${DATABASE_CONFIG[user]}"
    local pass="${DATABASE_CONFIG[password]}"
    local host="${DATABASE_CONFIG[host]}"
    local port="${DATABASE_CONFIG[port]}"
    
    echo "postgresql://${user}:${pass}@${host}:${port}/${db}"
}

# Get all services (list)
get_all_services() {
    echo "${!SERVICE_PORTS[@]}" | tr ' ' '\n' | sort
}

# Get all services count
get_services_count() {
    echo "${#SERVICE_PORTS[@]}"
}

# Validate service exists
is_valid_service() {
    local service=$1
    if [[ -n "${SERVICE_PORTS[$service]}" ]]; then
        return 0
    else
        return 1
    fi
}

# Print service configuration table
print_service_config() {
    local service=$1
    if ! is_valid_service "$service"; then
        echo "ERROR: Invalid service: $service"
        return 1
    fi
    
    local port="${SERVICE_PORTS[$service]}"
    local db="${SERVICE_DATABASES[$service]}"
    local container="${SERVICE_CONTAINERS[$service]}"
    local context="${SERVICE_CONTEXTS[$service]}"
    
    cat << EOF
Service Configuration: $service
├── Port: $port
├── Database: $db
├── Container: $container
└── Context: $context
EOF
}

# Print all services configuration table
print_all_services_config() {
    echo "════════════════════════════════════════════════════════"
    echo "MICROSERVICES CONFIGURATION"
    echo "════════════════════════════════════════════════════════"
    echo ""
    printf "%-25s %-10s %-35s %s\n" "SERVICE" "PORT" "DATABASE" "CONTAINER"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    for service in $(get_all_services); do
        local port="${SERVICE_PORTS[$service]}"
        local db="${SERVICE_DATABASES[$service]}"
        local container="${SERVICE_CONTAINERS[$service]}"
        printf "%-25s %-10s %-35s %s\n" "$service" "$port" "$db" "$container"
    done
    
    echo "────────────────────────────────────────────────────────────────────────────"
    echo "Total Services: $(get_services_count)"
    echo ""
}

# Print environment configuration
print_environment_config() {
    echo "════════════════════════════════════════════════════════"
    echo "ENVIRONMENT CONFIGURATION"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "Database:"
    echo "  Host: ${DATABASE_CONFIG[host]}"
    echo "  Port: ${DATABASE_CONFIG[port]}"
    echo "  User: ${DATABASE_CONFIG[user]}"
    echo "  Admin DB: ${DATABASE_CONFIG[name]}"
    echo ""
    echo "Redis:"
    echo "  Host: ${REDIS_CONFIG[host]}"
    echo "  Port: ${REDIS_CONFIG[port]}"
    echo "  URL: ${REDIS_CONFIG[url]}"
    echo ""
    echo "Docker:"
    echo "  Network: ${DOCKER_CONFIG[network]}"
    echo "  Postgres: ${DOCKER_CONFIG[postgres_container]}"
    echo "  Redis: ${DOCKER_CONFIG[redis_container]}"
    echo "  Registry: ${DOCKER_CONFIG[registry]:-<none>}"
    echo "  Tag: ${DOCKER_CONFIG[tag]}"
    echo ""
    echo "Deployment:"
    echo "  Environment: ${DEPLOYMENT_CONFIG[environment]}"
    echo "  Node Env: ${DEPLOYMENT_CONFIG[node_env]}"
    echo "  Log Level: ${DEPLOYMENT_CONFIG[log_level]}"
    echo "  Service Timeout: ${DEPLOYMENT_CONFIG[service_timeout]}ms"
    echo ""
}

# Generate environment file
generate_env_file() {
    local env_name=$1
    local output_file=".env.${env_name}"
    
    cat > "$output_file" << EOF
# Medical Coverage System - ${env_name} Environment Configuration
# Generated: $(date)

# Environment
ENVIRONMENT=${env_name}
NODE_ENV=${env_name}
LOG_LEVEL=info

# Database
DB_USER=${DATABASE_CONFIG[user]}
DB_PASSWORD=${DATABASE_CONFIG[password]}
DB_HOST=${DATABASE_CONFIG[host]}
DB_PORT=${DATABASE_CONFIG[port]}

# Redis
REDIS_HOST=${REDIS_CONFIG[host]}
REDIS_PORT=${REDIS_CONFIG[port]}
REDIS_URL=${REDIS_CONFIG[url]}

# Docker
DOCKER_TAG=${DOCKER_CONFIG[tag]}

# Service Configuration
SERVICE_TIMEOUT=${DEPLOYMENT_CONFIG[service_timeout]}

# API Gateway
JWT_SECRET=\${JWT_SECRET}
SERVICE_TIMEOUT=30000

# Frontend
VITE_API_URL=http://localhost:3001
VITE_ENVIRONMENT=${env_name}

# Logging
LOG_FORMAT=json
LOG_LEVEL=info

EOF
    
    echo "Generated: $output_file"
}

# Validate configuration
validate_config() {
    echo "Validating service configuration..."
    
    local invalid_services=0
    for service in $(get_all_services); do
        if ! is_valid_service "$service"; then
            echo "  ERROR: Invalid service config for $service"
            ((invalid_services++))
        fi
    done
    
    if [ $invalid_services -eq 0 ]; then
        echo "  ✓ All $(get_services_count) services configured correctly"
        return 0
    else
        echo "  ✗ Found $invalid_services invalid services"
        return 1
    fi
}

# Export all variables for subshells
export -f get_service_port
export -f get_service_database
export -f get_service_context
export -f get_service_container
export -f build_database_url
export -f get_all_services
export -f get_services_count
export -f is_valid_service
export -f print_service_config
export -f print_all_services_config
export -f print_environment_config
export -f generate_env_file
export -f validate_config

# Optional: Print config if sourced directly (for testing)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    print_all_services_config
    echo ""
    print_environment_config
    echo ""
    validate_config
fi
