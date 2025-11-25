#!/bin/bash

# Medical Coverage System Health Check Script
# This script monitors the health of all deployed services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
EMAIL_ALERTS=${EMAIL_ALERTS:-false}

# Health check endpoints
BACKEND_URL="http://localhost:3001/api/health"
FRONTEND_URL="http://localhost:3000"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Status tracking
OVERALL_STATUS="healthy"
FAILED_SERVICES=()
LAST_CHECK_TIME=""

# Logger functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to show help
show_help() {
    cat << EOF
Medical Coverage System Health Check Script

Usage: $0 [OPTIONS]

Options:
    --interval SECONDS    Health check interval (default: 30)
    --timeout SECONDS    Health check timeout (default: 10)
    --once               Run health check once and exit
    --notify             Enable notifications (requires SLACK_WEBHOOK_URL)
    --email              Enable email alerts
    --verbose            Show detailed health information
    --json               Output results in JSON format
    -h, --help           Show this help message

Examples:
    $0 --once                      # Run health check once
    $0 --interval 60 --notify      # Check every 60 seconds with Slack notifications
    $0 --json --verbose            # Detailed health check in JSON format

Environment Variables:
    SLACK_WEBHOOK_URL    Slack webhook for notifications
    EMAIL_ALERTS         Enable email alerts (true/false)
    HEALTH_CHECK_INTERVAL Check interval in seconds
    HEALTH_CHECK_TIMEOUT  Request timeout in seconds
EOF
}

# Function to send Slack notification
send_slack_notification() {
    local status=$1
    local message=$2
    local color=${3:-good}

    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        return 0
    fi

    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Medical Coverage System Health Alert",
            "text": "$message",
            "fields": [
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$timestamp",
                    "short": true
                },
                {
                    "title": "Failed Services",
                    "value": "${FAILED_SERVICES[*]:-None}",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)

    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" &>/dev/null || log_warning "Failed to send Slack notification"
}

# Function to send email alert
send_email_alert() {
    local subject=$1
    local message=$2

    if [ "$EMAIL_ALERTS" != "true" ]; then
        return 0
    fi

    # This would require email configuration
    # For now, just log the email that would be sent
    log_info "EMAIL ALERT - Subject: $subject"
    log_info "EMAIL ALERT - Message: $message"
}

# Function to check HTTP service health
check_http_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}

    if [ "$VERBOSE" = true ]; then
        log_info "Checking $service_name at $url"
    fi

    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ]; then
        if [ "$VERBOSE" = true ]; then
            log_success "$service_name is healthy (HTTP $response)"
        fi
        return 0
    else
        log_error "$service_name is unhealthy (HTTP $response, expected $expected_status)"
        return 1
    fi
}

# Function to check database health
check_database_health() {
    if [ "$VERBOSE" = true ]; then
        log_info "Checking PostgreSQL database health"
    fi

    # Try to connect to PostgreSQL
    if docker exec medcoverage-postgres pg_isready -U postgres -d medical_coverage &>/dev/null; then
        # Check if database is responsive
        if docker exec medcoverage-postgres psql -U postgres -d medical_coverage -c "SELECT 1;" &>/dev/null; then
            if [ "$VERBOSE" = true ]; then
                log_success "PostgreSQL database is healthy"
            fi
            return 0
        fi
    fi

    log_error "PostgreSQL database is unhealthy"
    return 1
}

# Function to check Redis health
check_redis_health() {
    if [ "$VERBOSE" = true ]; then
        log_info "Checking Redis health"
    fi

    # Try to connect to Redis
    if docker exec medcoverage-redis redis-cli ping &>/dev/null; then
        if [ "$VERBOSE" = true ]; then
            log_success "Redis is healthy"
        fi
        return 0
    fi

    log_error "Redis is unhealthy"
    return 1
}

# Function to check Docker containers
check_containers() {
    if [ "$VERBOSE" = true ]; then
        log_info "Checking Docker container health"
    fi

    local containers=("medcoverage-postgres" "medcoverage-redis" "medcoverage-backend" "medcoverage-frontend")
    local unhealthy_containers=()

    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" --format "{{.Names}}" | grep -q "$container"; then
            # Check if container has health check defined
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

            if [ "$health_status" = "healthy" ] || [ "$health_status" = "none" ]; then
                if [ "$VERBOSE" = true ]; then
                    log_success "Container $container is running"
                fi
            else
                log_error "Container $container is unhealthy ($health_status)"
                unhealthy_containers+=("$container")
            fi
        else
            log_error "Container $container is not running"
            unhealthy_containers+=("$container")
        fi
    done

    if [ ${#unhealthy_containers[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Function to get system metrics
get_system_metrics() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df -h / | awk 'NR==2{printf "%s", $5}')

    if [ "$JSON_OUTPUT" = true ]; then
        cat <<EOF
    "system_metrics": {
        "cpu_usage": "$cpu_usage%",
        "memory_usage": "$memory_usage%",
        "disk_usage": "$disk_usage"
    },
EOF
    else
        log_info "System Metrics - CPU: $cpu_usage%, Memory: $memory_usage%, Disk: $disk_usage"
    fi
}

# Function to get service metrics
get_service_metrics() {
    if [ "$JSON_OUTPUT" = true ]; then
        cat <<EOF
    "service_metrics": {
        "docker_containers": $(docker ps --filter "name=medcoverage" --format "{{.Names}}" | wc -l),
        "active_connections": $(netstat -an | grep :3000 | grep ESTABLISHED | wc -l),
        "total_memory_usage": "$(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | grep medcoverage | awk '{sum+=$2} END {print sum "MiB"}')"
    },
EOF
    fi
}

# Function to perform comprehensive health check
perform_health_check() {
    local check_start_time=$(date +%s)
    FAILED_SERVICES=()

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"timestamp\": \"$(date '+%Y-%m-%d %H:%M:%S')\","
        echo "  \"overall_status\": \"checking\","
    fi

    # Check Docker containers
    if ! check_containers; then
        FAILED_SERVICES+=("containers")
        OVERALL_STATUS="unhealthy"
    fi

    # Check database
    if ! check_database_health; then
        FAILED_SERVICES+=("database")
        OVERALL_STATUS="unhealthy"
    fi

    # Check Redis
    if ! check_redis_health; then
        FAILED_SERVICES+=("redis")
        OVERALL_STATUS="degraded"
    fi

    # Check backend API
    if ! check_http_service "Backend API" "$BACKEND_URL"; then
        FAILED_SERVICES+=("backend")
        OVERALL_STATUS="unhealthy"
    fi

    # Check frontend
    if ! check_http_service "Frontend" "$FRONTEND_URL"; then
        FAILED_SERVICES+=("frontend")
        OVERALL_STATUS="degraded"
    fi

    local check_end_time=$(date +%s)
    local check_duration=$((check_end_time - check_start_time))
    LAST_CHECK_TIME=$(date '+%Y-%m-%d %H:%M:%S')

    # Determine final status
    if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
        OVERALL_STATUS="healthy"
        if [ "$JSON_OUTPUT" != true ]; then
            log_success "All services are healthy"
        fi
    else
        if [ "$JSON_OUTPUT" != true ]; then
            log_error "Failed services: ${FAILED_SERVICES[*]}"
        fi
    fi

    if [ "$JSON_OUTPUT" = true ]; then
        echo "  \"overall_status\": \"$OVERALL_STATUS\","
        echo "  \"check_duration_seconds\": $check_duration,"
        echo "  \"failed_services\": [$(printf '"%s",' "${FAILED_SERVICES[@]}" | sed 's/,$//')],"
        get_system_metrics
        get_service_metrics
        echo "  \"services\": {"
        echo "    \"backend\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ backend ] && echo "unhealthy" || echo "healthy")\", \"url\": \"$BACKEND_URL\" },"
        echo "    \"frontend\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ frontend ] && echo "unhealthy" || echo "healthy")\", \"url\": \"$FRONTEND_URL\" },"
        echo "    \"database\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ database ] && echo "unhealthy" || echo "healthy\")\" },"
        echo "    \"redis\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ redis ] && echo "unhealthy" || echo "healthy")\" }"
        echo "  }"
        echo "}"
    else
        log_info "Health check completed in ${check_duration}s"
    fi

    # Send notifications if needed
    if [ "$ENABLE_NOTIFICATIONS" = true ]; then
        if [ "$OVERALL_STATUS" != "healthy" ]; then
            local alert_color="danger"
            local alert_message="System health check failed: ${FAILED_SERVICES[*]}"

            send_slack_notification "$OVERALL_STATUS" "$alert_message" "$alert_color"
            send_email_alert "Medical Coverage System Health Alert: $OVERALL_STATUS" "$alert_message"
        fi
    fi
}

# Function to run continuous health monitoring
run_continuous_monitoring() {
    log_info "Starting continuous health monitoring (interval: ${HEALTH_CHECK_INTERVAL}s)"
    log_info "Press Ctrl+C to stop monitoring"

    while true; do
        perform_health_check

        if [ "$VERBOSE" = true ] || [ "$OVERALL_STATUS" != "healthy" ]; then
            echo "----------------------------------------"
        fi

        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Parse command line arguments
RUN_ONCE=false
ENABLE_NOTIFICATIONS=false
VERBOSE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --interval)
            HEALTH_CHECK_INTERVAL=$2
            shift 2
            ;;
        --timeout)
            HEALTH_CHECK_TIMEOUT=$2
            shift 2
            ;;
        --once)
            RUN_ONCE=true
            shift
            ;;
        --notify)
            ENABLE_NOTIFICATIONS=true
            shift
            ;;
        --email)
            EMAIL_ALERTS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
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

# Main execution
main() {
    log_info "Medical Coverage System Health Check"
    echo "========================================"

    # Perform initial health check
    perform_health_check

    # Exit if running once
    if [ "$RUN_ONCE" = true ]; then
        exit 0
    fi

    # Run continuous monitoring
    run_continuous_monitoring
}

# Handle interrupt signal
trap 'log_info "Health monitoring stopped"; exit 0' INT

# Run main function
main "$@"