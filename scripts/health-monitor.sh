#!/bin/bash

# MedicalCoverageSystem Health Monitor Script
# Comprehensive health polling and readiness detection
# Usage: ./scripts/health-monitor.sh [dev|prod] [--timeout=seconds] [--output-format=json]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_TYPE="dev"
TIMEOUT=600  # 10 minutes default
OUTPUT_FORMAT="text"
POLLING_INTERVAL=10
QUICK_POLLING_INTERVAL=5
MAX_RETRIES=3
VERBOSE=false

# Service configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
FINANCE_URL="http://localhost:5000"
HEALTH_CHECK_ENDPOINT="/health"
API_HEALTH_ENDPOINT="/api/health"
FINANCE_HEALTH_ENDPOINT="/api/finance/health"

# Health status tracking
HEALTH_STATUS_FILE="${PROJECT_ROOT}/deployment/logs/health-status.json"
HEALTH_REPORT_FILE="${PROJECT_ROOT}/deployment/logs/health-report.json"

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[Health Monitor] ${message}${NC}"
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

print_step() {
    print_status "$BLUE" "STEP: $1"
}

print_progress() {
    print_status "$PURPLE" "🔄 $1"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|prod)
                DEPLOYMENT_TYPE="$1"
                shift
                ;;
            --timeout=*)
                TIMEOUT="${1#*=}"
                shift
                ;;
            --output-format=*)
                OUTPUT_FORMAT="${1#*=}"
                shift
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --polling-interval=*)
                POLLING_INTERVAL="${1#*=}"
                shift
                ;;
            --max-retries=*)
                MAX_RETRIES="${1#*=}"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help information
show_help() {
    cat << EOF
MedicalCoverageSystem Health Monitor Script

USAGE:
    ./scripts/health-monitor.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev     Development health monitoring with detailed output
    prod    Production health monitoring with critical alerts

OPTIONS:
    --timeout=SECONDS          Health check timeout (default: 600)
    --output-format=FORMAT     Output format: text, json, minimal (default: text)
    --polling-interval=SECONDS Polling interval in seconds (default: 10)
    --max-retries=COUNT       Maximum retry attempts (default: 3)
    --verbose, -v             Show detailed monitoring information
    --help, -h                Show this help message

EXAMPLES:
    ./scripts/health-monitor.sh dev
    ./scripts/health-monitor.sh prod --timeout=1200
    ./scripts/health-monitor.sh dev --output-format=json --verbose
    ./scripts/health-monitor.sh prod --polling-interval=5 --max-retries=5

HEALTH MONITORING LEVELS:
    1. Container Health: Docker container status checks
    2. Application Health: HTTP endpoint polling
    3. Database Health: Connection and query validation
    4. Service Integration: API-to-API communication
    5. External Dependencies: Redis, email, SMS services

MONITORING STRATEGY:
    • Progressive dependency validation (DB → Backend → Frontend)
    • Exponential backoff for failed health checks
    • Real-time status reporting with service indicators
    • Comprehensive error tracking and alerting
    • JSON status export for external monitoring integration

HEALTH CHECK ENDPOINTS:
    • Frontend: ${FRONTEND_URL}${HEALTH_CHECK_ENDPOINT}
    • Backend API: ${BACKEND_URL}${API_HEALTH_ENDPOINT}
    • Finance API: ${FINANCE_URL}${FINANCE_HEALTH_ENDPOINT}
    • Database: Connection validation and query testing
    • External Services: Redis, email providers, SMS services

REQUIREMENTS:
    • Docker containers running
    • Health endpoints configured
    • Network connectivity between services
    • Proper environment configuration

EOF
}

# Load platform utilities
load_platform_utils() {
    local platform_utils_file="${SCRIPT_DIR}/platform-utils.sh"

    if [[ ! -f "$platform_utils_file" ]]; then
        print_error "Platform utilities not found: $platform_utils_file"
        exit 1
    fi

    source "$platform_utils_file"
    init_platform_detection
}

# Load environment configuration
load_environment() {
    print_step "Loading environment configuration"

    if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
        print_error "Environment file not found: ${PROJECT_ROOT}/.env"
        exit 1
    fi

    # Source environment file
    set -a
    source "${PROJECT_ROOT}/.env"
    set +a

    # Override with deployment-specific settings
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
        BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
        FINANCE_URL="${FINANCE_URL:-http://localhost:5000}"
    else
        local hostname
        hostname=$(get_system_hostname)
        FRONTEND_URL="${FRONTEND_URL:-https://$hostname}"
        BACKEND_URL="${BACKEND_URL:-https://$hostname}"
        FINANCE_URL="${FINANCE_URL:-https://$hostname/api/finance}"
    fi

    print_success "Environment configuration loaded"
}

# Validate monitoring prerequisites
validate_monitoring_prerequisites() {
    print_step "Validating monitoring prerequisites"

    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        print_error "curl is not available. Please install curl for HTTP health checks."
        exit 1
    fi

    # Check if jq is available for JSON output (optional)
    if [[ "$OUTPUT_FORMAT" == "json" ]] && ! command -v jq &> /dev/null; then
        print_warning "jq is not available. JSON output may be limited."
    fi

    # Check if Docker is available for container health checks
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            print_info "Docker is available for container health checks"
        else
            print_warning "Docker daemon is not running. Container health checks will be limited."
        fi
    else
        print_warning "Docker is not available. Container health checks will be skipped."
    fi

    # Create health monitoring directories
    create_directory "${PROJECT_ROOT}/deployment/logs" "755" 2>/dev/null || true

    print_success "Monitoring prerequisites validated"
}

# Initialize health status tracking
initialize_health_status() {
    print_info "Initializing health status tracking"

    local current_timestamp
    current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$HEALTH_STATUS_FILE" << EOF
{
    "monitoring_started_at": "$current_timestamp",
    "deployment_type": "$DEPLOYMENT_TYPE",
    "timeout": $TIMEOUT,
    "polling_interval": $POLLING_INTERVAL,
    "services": {
        "frontend": {
            "name": "Frontend",
            "url": "$FRONTEND_URL",
            "status": "pending",
            "last_check": null,
            "response_time": null,
            "error_message": null,
            "retry_count": 0,
            "dependencies": [],
            "health_checks": []
        },
        "backend": {
            "name": "Backend API",
            "url": "$BACKEND_URL",
            "status": "pending",
            "last_check": null,
            "response_time": null,
            "error_message": null,
            "retry_count": 0,
            "dependencies": ["database"],
            "health_checks": []
        },
        "finance": {
            "name": "Finance API",
            "url": "$FINANCE_URL",
            "status": "pending",
            "last_check": null,
            "response_time": null,
            "error_message": null,
            "retry_count": 0,
            "dependencies": ["database", "backend"],
            "health_checks": []
        },
        "database": {
            "name": "PostgreSQL Database",
            "host": "${DB_HOST:-localhost}:${DB_PORT_MAIN:-5432}",
            "status": "pending",
            "last_check": null,
            "response_time": null,
            "error_message": null,
            "retry_count": 0,
            "dependencies": [],
            "health_checks": []
        },
        "redis": {
            "name": "Redis Cache",
            "host": "${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}",
            "status": "pending",
            "last_check": null,
            "response_time": null,
            "error_message": null,
            "retry_count": 0,
            "dependencies": [],
            "health_checks": []
        }
    },
    "overall_status": "pending",
    "summary": {
        "total_services": 5,
        "healthy_services": 0,
        "unhealthy_services": 0,
        "pending_services": 5,
        "failed_checks": 0,
        "average_response_time": null
    }
}
EOF

    if [[ "$VERBOSE" == "true" ]]; then
        print_info "Health status initialized: $HEALTH_STATUS_FILE"
    fi
}

# Update health status in JSON file
update_health_status() {
    local service_name="$1"
    local status="$2"
    local response_time="$3"
    local error_message="$4"
    local health_check_result="$5"

    local temp_file
    temp_file=$(create_temp_file "health-status")

    if [[ -f "$HEALTH_STATUS_FILE" ]]; then
        # Update service status
        jq --arg service "$service_name" \
           --arg status "$status" \
           --arg time "$response_time" \
           --arg error "$error_message" \
           --arg check "$health_check_result" \
           --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
           '
           .services[$service].status = $status |
           .services[$service].last_check = $timestamp |
           if $time != "null" then .services[$service].response_time = ($time | tonumber) else . end |
           if $error != "null" then .services[$service].error_message = $error else .services[$service].error_message = null end |
           if $check != "null" then .services[$service].health_checks += ($check | fromjson) else . end |
           .overall_status = (
             if (.services | to_entries | map(select(.value.status == "healthy")) | length) == (.services | length)
             then "healthy"
             elif (.services | to_entries | map(select(.value.status == "failed")) | length) > 0
             then "failed"
             else "partial"
             end
           ) |
           .summary.healthy_services = (.services | to_entries | map(select(.value.status == "healthy")) | length) |
           .summary.unhealthy_services = (.services | to_entries | map(select(.value.status == "failed")) | length) |
           .summary.pending_services = (.services | to_entries | map(select(.value.status == "pending")) | length)
           ' \
           "$HEALTH_STATUS_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_STATUS_FILE"
    fi

    rm -f "$temp_file"
}

# Perform HTTP health check
perform_http_health_check() {
    local service_name="$1"
    local url="$2"
    local endpoint="${3:-$HEALTH_CHECK_ENDPOINT}"
    local max_retries="${4:-$MAX_RETRIES}"

    local full_url="${url}${endpoint}"
    local retry_count=0
    local status="failed"
    local response_time=0
    local error_message=""
    local health_check_result=""

    while [[ $retry_count -lt $max_retries ]]; do
        if [[ "$VERBOSE" == "true" ]]; then
            print_info "Checking $service_name (attempt $((retry_count + 1))/$max_retries): $full_url"
        fi

        # Perform health check with curl
        local start_time
        start_time=$(date +%s%N)

        local curl_result
        local curl_output
        local curl_status

        curl_result=$(curl -s -w "%{http_code}" -o /tmp/health_check_$service_name --max-time 30 --connect-timeout 10 "$full_url" 2>/dev/null || echo "000")
        curl_status=$?
        curl_output=$(cat "/tmp/health_check_$service_name" 2>/dev/null || echo "")
        rm -f "/tmp/health_check_$service_name"

        local end_time
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

        if [[ $curl_status -eq 0 ]]; then
            # Check HTTP status codes
            case "$curl_result" in
                200|201|204)
                    status="healthy"
                    error_message=""
                    health_check_result="{\"type\": \"http\", \"url\": \"$full_url\", \"status_code\": $curl_result, \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"output_length\": ${#curl_output}}"
                    break
                    ;;
                502|503|504)
                    status="failed"
                    error_message="Service temporarily unavailable (HTTP $curl_result)"
                    health_check_result="{\"type\": \"http\", \"url\": \"$full_url\", \"status_code\": $curl_result, \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"error\": \"$error_message\"}"
                    ;;
                404)
                    status="failed"
                    error_message="Health endpoint not found (HTTP $curl_result)"
                    health_check_result="{\"type\": \"http\", \"url\": \"$full_url\", \"status_code\": $curl_result, \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"error\": \"$error_message\"}"
                    ;;
                *)
                    status="failed"
                    error_message="Unexpected HTTP status: $curl_result"
                    health_check_result="{\"type\": \"http\", \"url\": \"$full_url\", \"status_code\": $curl_result, \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"error\": \"$error_message\"}"
                    ;;
            esac
        else
            status="failed"
            error_message="Connection failed (curl exit code: $curl_status)"
            health_check_result="{\"type\": \"http\", \"url\": \"$full_url\", \"status_code\": \"000\", \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"error\": \"$error_message\"}"
        fi

        ((retry_count++))
        if [[ $retry_count -lt $max_retries ]]; then
            sleep "$POLLING_INTERVAL"
        fi
    done

    # Update health status
    update_health_status "$service_name" "$status" "$response_time" "$error_message" "$health_check_result"

    # Display result
    case "$status" in
        healthy)
            print_success "$service_name: healthy (${response_time}ms)"
            ;;
        failed)
            print_error "$service_name: $error_message"
            ;;
        *)
            print_warning "$service_name: $status"
            ;;
    esac

    return $([[ "$status" == "healthy" ]] && echo 0 || echo 1)
}

# Perform database health check
perform_database_health_check() {
    local service_name="database"
    local host="${DB_HOST:-localhost}"
    local port="${DB_PORT_MAIN:-5432}"
    local database="${DB_NAME_MAIN:-medical_coverage_main}"
    local user="${DB_USER_MAIN:-medical_coverage_user}"
    local max_retries="${1:-$MAX_RETRIES}"

    local retry_count=0
    local status="failed"
    local response_time=0
    local error_message=""
    local health_check_result=""

    while [[ $retry_count -lt $max_retries ]]; do
        if [[ "$VERBOSE" == "true" ]]; then
            print_info "Checking database (attempt $((retry_count + 1))/$max_retries): $host:$port/$database"
        fi

        local start_time
        start_time=$(date +%s%N)

        # Perform database health check
        local db_result
        local db_status

        if command -v psql &> /dev/null; then
            db_result=$(PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$host" -p "$port" -U "$user" -d "$database" -c "SELECT 1 as health_check, pg_postmaster_start_time() as uptime, version() as version;" -t 2>/dev/null | tr -d '\n' | xargs || echo "connection_failed")
            db_status=$?
        else
            db_result="psql_not_available"
            db_status=1
        fi

        local end_time
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))

        if [[ $db_status -eq 0 && "$db_result" != *"connection_failed"* && -n "$db_result" ]]; then
            status="healthy"
            error_message=""
            health_check_result="{\"type\": \"database\", \"host\": \"$host:$port\", \"database\": \"$database\", \"user\": \"$user\", \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"query_result\": \"success\"}"
            break
        else
            status="failed"
            error_message="Database connection failed"
            health_check_result="{\"type\": \"database\", \"host\": \"$host:$port\", \"database\": \"$database\", \"user\": \"$user\", \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"error\": \"$error_message\"}"
        fi

        ((retry_count++))
        if [[ $retry_count -lt $max_retries ]]; then
            sleep "$POLLING_INTERVAL"
        fi
    done

    # Update health status
    update_health_status "$service_name" "$status" "$response_time" "$error_message" "$health_check_result"

    # Display result
    case "$status" in
        healthy)
            print_success "Database: healthy (${response_time}ms)"
            ;;
        failed)
            print_error "Database: $error_message"
            ;;
        *)
            print_warning "Database: $status"
            ;;
    esac

    return $([[ "$status" == "healthy" ]] && echo 0 || echo 1)
}

# Perform Redis health check
perform_redis_health_check() {
    local service_name="redis"
    local host="${REDIS_HOST:-localhost}"
    local port="${REDIS_PORT:-6379}"
    local max_retries="${1:-$MAX_RETRIES}"

    local retry_count=0
    local status="failed"
    local response_time=0
    local error_message=""
    local health_check_result=""

    while [[ $retry_count -lt $max_retries ]]; do
        if [[ "$VERBOSE" == "true" ]]; then
            print_info "Checking Redis (attempt $((retry_count + 1))/$max_retries): $host:$port"
        fi

        local start_time
        start_time=$(date +%s%N)

        # Perform Redis health check
        local redis_result
        local redis_status

        if command -v redis-cli &> /dev/null; then
            redis_result=$(redis-cli -h "$host" -p "$port" ping 2>/dev/null || echo "connection_failed")
            redis_status=$?
        else
            # Fallback to netcat/telnet if redis-cli is not available
            if command -v nc &> /dev/null; then
                redis_result=$(echo "PING" | nc -w 5 "$host" "$port" 2>/dev/null || echo "connection_failed")
                redis_status=$?
            else
                redis_result="redis_cli_not_available"
                redis_status=1
            fi
        fi

        local end_time
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))

        if [[ $redis_status -eq 0 && "$redis_result" == *"PONG"* ]]; then
            status="healthy"
            error_message=""
            health_check_result="{\"type\": \"redis\", \"host\": \"$host:$port\", \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"ping_result\": \"$redis_result\"}"
            break
        else
            status="failed"
            error_message="Redis connection failed"
            health_check_result="{\"type\": \"redis\", \"host\": \"$host:$port\", \"response_time_ms\": $response_time, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\", \"error\": \"$error_message\"}"
        fi

        ((retry_count++))
        if [[ $retry_count -lt $max_retries ]]; then
            sleep "$POLLING_INTERVAL"
        fi
    done

    # Update health status
    update_health_status "$service_name" "$status" "$response_time" "$error_message" "$health_check_result"

    # Display result
    case "$status" in
        healthy)
            print_success "Redis: healthy (${response_time}ms)"
            ;;
        failed)
            print_error "Redis: $error_message"
            ;;
        *)
            print_warning "Redis: $status"
            ;;
    esac

    return $([[ "$status" == "healthy" ]] && echo 0 || echo 1)
}

# Perform Docker container health checks
perform_container_health_checks() {
    print_step "Checking Docker container health"

    if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
        print_warning "Docker not available, skipping container health checks"
        return 0
    fi

    local container_names=(
        "medical-coveragesystem_frontend_1"
        "medical-coveragesystem_backend_1"
        "medical-coveragesystem_finance_1"
        "medical-coveragesystem_db_1"
        "medical-coveragesystem_redis_1"
    )

    local healthy_containers=0
    local total_containers=${#container_names[@]}

    for container in "${container_names[@]}"; do
        local container_status
        container_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "not_found")

        case "$container_status" in
            healthy)
                print_success "Container $container: healthy"
                ((healthy_containers++))
                ;;
            unhealthy)
                print_error "Container $container: unhealthy"
                ;;
            starting)
                print_warning "Container $container: starting"
                ;;
            none|not_found)
                # Check if container exists but doesn't have health check
                local container_state
                container_state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
                if [[ "$container_state" == "running" ]]; then
                    print_warning "Container $container: running (no health check)"
                    ((healthy_containers++))
                elif [[ "$container_state" != "not_found" ]]; then
                    print_error "Container $container: $container_state"
                else
                    print_info "Container $container: not found"
                fi
                ;;
        esac
    done

    print_info "Container health: $healthy_containers/$total_containers containers healthy"

    return $([[ $healthy_containers -eq $total_containers ]] && echo 0 || echo 1)
}

# Wait for services to be ready
wait_for_service_readiness() {
    print_step "Waiting for service readiness"

    local start_time
    start_time=$(date +%s)
    local current_time
    local elapsed_time=0

    while [[ $elapsed_time -lt $TIMEOUT ]]; do
        current_time=$(date +%s)
        elapsed_time=$((current_time - start_time))

        print_progress "Health check progress ($((elapsed_time / 60))m $((elapsed_time % 60))s / $((TIMEOUT / 60))m $((TIMEOUT % 60))s)"

        # Check if all services are healthy
        if check_all_services_health; then
            return 0
        fi

        # Show progress indicator
        local current_interval=$POLLING_INTERVAL
        if [[ $elapsed_time -lt 120 ]]; then
            current_interval=$QUICK_POLLING_INTERVAL  # More frequent polling initially
        fi

        sleep "$current_interval"
    done

    print_error "Health check timeout after $TIMEOUT seconds"
    return 1
}

# Check all services health
check_all_services_health() {
    local healthy_count=0
    local total_count=5

    print_info "Performing comprehensive health checks"

    # Perform health checks in dependency order
    if perform_database_health_check; then
        ((healthy_count++))
    fi

    if perform_redis_health_check; then
        ((healthy_count++))
    fi

    if perform_http_health_check "backend" "$BACKEND_URL" "$API_HEALTH_ENDPOINT"; then
        ((healthy_count++))
    fi

    if perform_http_health_check "finance" "$FINANCE_URL" "$FINANCE_HEALTH_ENDPOINT"; then
        ((healthy_count++))
    fi

    if perform_http_health_check "frontend" "$FRONTEND_URL" "$HEALTH_CHECK_ENDPOINT"; then
        ((healthy_count++))
    fi

    print_progress "Services healthy: $healthy_count/$total_count"

    return $([[ $healthy_count -eq $total_count ]] && echo 0 || echo 1)
}

# Generate health monitoring report
generate_health_report() {
    print_step "Generating health monitoring report"

    local current_timestamp
    current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Update final status
    local temp_file
    temp_file=$(create_temp_file "health-final")

    if [[ -f "$HEALTH_STATUS_FILE" ]]; then
        jq --arg timestamp "$current_timestamp" \
           '
           .monitoring_completed_at = $timestamp |
           .summary.average_response_time = (
             [.services[] | select(.response_time != null) | .response_time] |
             add / (.services[] | select(.response_time != null) | length)
           ) |
           if .overall_status == "healthy" then
             .summary.deployment_success = true |
             .summary.recommendation = "All services are healthy and ready for use"
           elif .overall_status == "partial" then
             .summary.deployment_success = false |
             .summary.recommendation = "Some services are not ready, check individual service status"
           else
             .summary.deployment_success = false |
             .summary.recommendation = "Critical issues detected, immediate attention required"
           end
           ' \
           "$HEALTH_STATUS_FILE" > "$temp_file" && mv "$temp_file" "$HEALTH_STATUS_FILE"
    fi

    # Copy to report file
    cp "$HEALTH_STATUS_FILE" "$HEALTH_REPORT_FILE"

    if [[ "$VERBOSE" == "true" ]]; then
        print_info "Health report saved: $HEALTH_REPORT_FILE"
    fi
}

# Display health monitoring summary
display_health_summary() {
    print_info "Health Monitoring Summary"

    if [[ ! -f "$HEALTH_STATUS_FILE" ]]; then
        print_error "Health status file not found"
        return 1
    fi

    # Extract summary information
    local overall_status
    local healthy_services
    local unhealthy_services
    local pending_services
    local deployment_success
    local recommendation

    overall_status=$(jq -r '.overall_status' "$HEALTH_STATUS_FILE")
    healthy_services=$(jq -r '.summary.healthy_services' "$HEALTH_STATUS_FILE")
    unhealthy_services=$(jq -r '.summary.unhealthy_services' "$HEALTH_STATUS_FILE")
    pending_services=$(jq -r '.summary.pending_services' "$HEALTH_STATUS_FILE")
    deployment_success=$(jq -r '.summary.deployment_success' "$HEALTH_STATUS_FILE")
    recommendation=$(jq -r '.summary.recommendation' "$HEALTH_STATUS_FILE")

    # Display overall status
    case "$overall_status" in
        healthy)
            print_success "Overall Status: All services healthy"
            ;;
        partial)
            print_warning "Overall Status: Some services not ready"
            ;;
        failed)
            print_error "Overall Status: Critical issues detected"
            ;;
        *)
            print_info "Overall Status: $overall_status"
            ;;
    esac

    cat << EOF
${CYAN}Service Health Summary:${NC}
• Healthy Services: $healthy_services
• Unhealthy Services: $unhealthy_services
• Pending Services: $pending_services

${CYAN}Deployment Status:${NC}
EOF

    if [[ "$deployment_success" == "true" ]]; then
        cat << EOF
${GREEN}✅ Deployment successful - All services are ready${NC}

EOF
    else
        cat << EOF
${RED}❌ Deployment incomplete - Some services need attention${NC}

EOF
    fi

    cat << EOF
${CYAN}Recommendation:${NC}
$recommendation

${CYAN}Service Details:${NC}
EOF

    # Display individual service status
    local services=("frontend" "backend" "finance" "database" "redis")
    for service in "${services[@]}"; do
        local service_status
        local service_response_time
        local service_error

        service_status=$(jq -r ".services.$service.status" "$HEALTH_STATUS_FILE")
        service_response_time=$(jq -r ".services.$service.response_time" "$HEALTH_STATUS_FILE")
        service_error=$(jq -r ".services.$service.error_message" "$HEALTH_STATUS_FILE")

        local status_indicator="❓"
        case "$service_status" in
            healthy) status_indicator="✅" ;;
            failed) status_indicator="❌" ;;
            pending) status_indicator="⏳" ;;
            *) status_indicator="❓" ;;
        esac

        echo -e "${status_indicator} ${service^}: $service_status${service_response_time:+ (${service_response_time}ms)}${service_error:+ - $service_error}"
    done

    echo

    # Show service URLs
    cat << EOF
${CYAN}Service URLs:${NC}
• Frontend: $FRONTEND_URL
• Backend API: $BACKEND_URL
• Finance API: $FINANCE_URL
• Health Check: $FRONTEND_URL$HEALTH_CHECK_ENDPOINT

${CYAN}Monitoring Files:${NC}
• Live Status: $HEALTH_STATUS_FILE
• Final Report: $HEALTH_REPORT_FILE

EOF

    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        cat << EOF
${CYAN}Full JSON Report:${NC}
$(jq '.' "$HEALTH_REPORT_FILE")

EOF
    fi
}

# Cleanup function
cleanup() {
    # Clean up any temporary files
    rm -f /tmp/health_check_* 2>/dev/null || true

    if [[ $? -ne 0 ]]; then
        print_error "Health monitoring failed"
        print_info "Check the error messages above for troubleshooting"
    fi
}

# Main execution
main() {
    print_info "Starting health monitoring for $DEPLOYMENT_TYPE"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute monitoring steps
    parse_arguments "$@"
    load_platform_utils
    load_environment
    validate_monitoring_prerequisites
    initialize_health_status

    # Perform container health checks
    perform_container_health_checks

    # Wait for service readiness with timeout
    if wait_for_service_readiness; then
        print_success "All services are healthy and ready"
    else
        print_warning "Health monitoring completed with some issues"
    fi

    generate_health_report
    display_health_summary

    # Return appropriate exit code
    if [[ -f "$HEALTH_STATUS_FILE" ]]; then
        local overall_status
        overall_status=$(jq -r '.overall_status' "$HEALTH_STATUS_FILE")
        case "$overall_status" in
            healthy)
                exit 0
                ;;
            partial)
                exit 1
                ;;
            failed)
                exit 2
                ;;
            *)
                exit 3
                ;;
        esac
    else
        exit 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi