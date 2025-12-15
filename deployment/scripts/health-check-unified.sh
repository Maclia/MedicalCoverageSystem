#!/bin/bash

# Medical Coverage System Unified Health Check Script
# Monitors health of all services in the unified deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
EMAIL_ALERTS=${EMAIL_ALERTS:-false}

# Health check endpoints
BACKEND_URL="http://localhost:3001/api/health"
FINANCE_URL="http://localhost:5000/api/finance/health"
FRONTEND_URL="http://localhost:3000"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
FINANCE_DB_NAME="medical_coverage_finance"
MAIN_DB_NAME="medical_coverage"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Status tracking
OVERALL_STATUS="healthy"
FAILED_SERVICES=()
DEGRADED_SERVICES=()
LAST_CHECK_TIME=""
HEALTH_HISTORY=()

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

log_service() {
    local service=$1
    local status=$2
    local details=$3
    case $status in
        healthy)
            echo -e "${GREEN}[${service^^}]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $details"
            ;;
        degraded)
            echo -e "${YELLOW}[${service^^}]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $details"
            ;;
        unhealthy)
            echo -e "${RED}[${service^^}]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $details"
            ;;
        *)
            echo -e "${CYAN}[${service^^}]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $details"
            ;;
    esac
}

# Function to show help
show_help() {
    cat << EOF
Medical Coverage System Unified Health Check Script

Usage: $0 [OPTIONS]

Options:
    --interval SECONDS    Health check interval (default: 30)
    --timeout SECONDS    Health check timeout (default: 10)
    --once               Run health check once and exit
    --notify             Enable notifications (requires SLACK_WEBHOOK_URL)
    --email              Enable email alerts
    --verbose            Show detailed health information
    --json               Output results in JSON format
    --service SERVICE    Check specific service only (backend|finance|frontend|database|redis|all)
    --history            Show health status history
    --metrics            Show performance metrics
    -h, --help           Show this help message

Examples:
    $0 --once                      # Run health check once
    $0 --interval 60 --notify      # Check every 60 seconds with Slack notifications
    $0 --json --verbose            # Detailed health check in JSON format
    $0 --service finance           # Check only finance service
    $0 --metrics                   # Show performance metrics

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
    local failed_services_list=$(printf "%s, " "${FAILED_SERVICES[@]}" | sed 's/, $//')
    local degraded_services_list=$(printf "%s, " "${DEGRADED_SERVICES[@]}" | sed 's/, $//')

    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Medical Coverage System Health Alert",
            "text": "$message",
            "fields": [
                {
                    "title": "Overall Status",
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
                    "value": "${failed_services_list:-None}",
                    "short": false
                },
                {
                    "title": "Degraded Services",
                    "value": "${degraded_services_list:-None}",
                    "short": false
                },
                {
                    "title": "Health Check Duration",
                    "value": "$HEALTH_DURATION seconds",
                    "short": true
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
    local timeout=${HEALTH_CHECK_TIMEOUT}

    if [ "$VERBOSE" = true ]; then
        log_info "Checking $service_name at $url"
    fi

    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$timeout" "$url" 2>/dev/null || echo "0.000")

    if [ "$response" = "$expected_status" ]; then
        if [ "$VERBOSE" = true ]; then
            log_service "$service_name" "healthy" "HTTP $response (${response_time}s)"
        fi
        return 0
    else
        log_service "$service_name" "unhealthy" "HTTP $response (expected $expected_status, ${response_time}s)"
        return 1
    fi
}

# Function to check database health
check_database_health() {
    local db_name=${1:-$MAIN_DB_NAME}
    local db_service_name="$2"

    if [ -z "$db_service_name" ]; then
        db_service_name="database-$db_name"
    fi

    if [ "$VERBOSE" = true ]; then
        log_info "Checking PostgreSQL database health for $db_name"
    fi

    # Try to connect to PostgreSQL
    local container_name="medcoverage_postgres_unified"
    local pg_result=$(docker exec "$container_name" pg_isready -U postgres 2>/dev/null || echo "failed")

    if [ "$pg_result" = "failed" ]; then
        log_service "$db_service_name" "unhealthy" "PostgreSQL connection failed"
        return 1
    fi

    # Check if specific database is responsive
    local db_check_result=$(docker exec "$container_name" psql -U postgres -d "$db_name" -c "SELECT 1;" -t 2>/dev/null | tr -d ' ' || echo "failed")

    if [ "$db_check_result" = "1" ]; then
        # Check database connections and performance
        local connection_count=$(docker exec "$container_name" psql -U postgres -d "$db_name" -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" -t 2>/dev/null | tr -d ' ' || echo "0")
        local database_size=$(docker exec "$container_name" psql -U postgres -d "$db_name" -c "SELECT pg_size_pretty(pg_database_size('$db_name'));" -t 2>/dev/null | tr -d ' ' || echo "unknown")

        if [ "$VERBOSE" = true ]; then
            log_service "$db_service_name" "healthy" "Database responsive (connections: $connection_count, size: $database_size)"
        fi
        return 0
    else
        log_service "$db_service_name" "unhealthy" "Database $db_name not responsive"
        return 1
    fi
}

# Function to check Redis health
check_redis_health() {
    if [ "$VERBOSE" = true ]; then
        log_info "Checking Redis health"
    fi

    local container_name="medcoverage_redis_unified"

    # Try to connect to Redis
    local ping_result=$(docker exec "$container_name" redis-cli ping 2>/dev/null || echo "failed")

    if [ "$ping_result" = "PONG" ]; then
        # Check Redis performance metrics
        local redis_info=$(docker exec "$container_name" redis-cli info memory 2>/dev/null || echo "failed")
        local used_memory=$(echo "$redis_info" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r' || echo "unknown")
        local connected_clients=$(docker exec "$container_name" redis-cli info clients 2>/dev/null | grep "connected_clients:" | cut -d: -f2 | tr -d '\r' || echo "0")

        # Test basic operations
        local test_key="health_check_$(date +%s)"
        local test_result=$(docker exec "$container_name" redis-cli set "$test_key" "ok" && docker exec "$container_name" redis-cli get "$test_key" 2>/dev/null || echo "failed")
        docker exec "$container_name" redis-cli del "$test_key" &>/dev/null

        if [ "$test_result" = "ok" ]; then
            if [ "$VERBOSE" = true ]; then
                log_service "redis" "healthy" "Redis responsive (clients: $connected_clients, memory: $used_memory)"
            fi
            return 0
        else
            log_service "redis" "degraded" "Redis ping successful but operations failed"
            return 2
        fi
    else
        log_service "redis" "unhealthy" "Redis connection failed"
        return 1
    fi
}

# Function to check Docker containers
check_containers() {
    if [ "$VERBOSE" = true ]; then
        log_info "Checking Docker container health"
    fi

    local containers=(
        "medcoverage_postgres_unified:postgresql"
        "medcoverage_redis_unified:redis"
        "medcoverage_backend_unified:backend"
        "medcoverage_finance_unified:finance"
        "medcoverage_frontend_unified:frontend"
        "medcoverage_nginx_unified:nginx"
        "medcoverage_worker_unified:worker"
    )

    local unhealthy_containers=()
    local degraded_containers=()

    for container_info in "${containers[@]}"; do
        local container_name="${container_info%:*}"
        local container_service="${container_info#*:}"

        if docker ps --filter "name=$container_name" --filter "status=running" --format "{{.Names}}" | grep -q "$container_name"; then
            # Check if container has health check defined
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")

            if [ "$health_status" = "healthy" ] || [ "$health_status" = "none" ]; then
                if [ "$VERBOSE" = true ]; then
                    log_service "$container_service" "healthy" "Container $container_name running"
                fi
            elif [ "$health_status" = "starting" ]; then
                log_service "$container_service" "degraded" "Container $container_name starting"
                degraded_containers+=("$container_service")
            else
                log_service "$container_service" "unhealthy" "Container $container_name $health_status"
                unhealthy_containers+=("$container_service")
            fi
        else
            log_service "$container_service" "unhealthy" "Container $container_name not running"
            unhealthy_containers+=("$container_service")
        fi
    done

    if [ ${#unhealthy_containers[@]} -eq 0 ] && [ ${#degraded_containers[@]} -eq 0 ]; then
        return 0
    elif [ ${#unhealthy_containers[@]} -eq 0 ]; then
        FAILED_SERVICES+=("${degraded_containers[@]}")
        DEGRADED_SERVICES+=("${degraded_containers[@]}")
        return 2
    else
        FAILED_SERVICES+=("${unhealthy_containers[@]}")
        return 1
    fi
}

# Function to get system metrics
get_system_metrics() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    local disk_usage=$(df -h / | awk 'NR==2{printf "%s", $5}')
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')

    if [ "$JSON_OUTPUT" = true ]; then
        cat <<EOF
    "system_metrics": {
        "cpu_usage": "$cpu_usage%",
        "memory_usage": "$memory_usage%",
        "disk_usage": "$disk_usage",
        "load_average": "$load_avg"
    },
EOF
    else
        log_info "System Metrics - CPU: $cpu_usage%, Memory: $memory_usage%, Disk: $disk_usage, Load: $load_avg"
    fi
}

# Function to get service metrics
get_service_metrics() {
    if [ "$JSON_OUTPUT" = true ]; then
        cat <<EOF
    "service_metrics": {
        "docker_containers": $(docker ps --filter "name=medcoverage" --format "{{.Names}}" | wc -l),
        "active_connections": $(netstat -an | grep -E ":(3000|3001|5000|5432|6379)" | grep ESTABLISHED | wc -l),
        "container_stats": $(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep medcoverage | wc -l)
    },
EOF
    fi

    # Docker container resource usage
    if [ "$VERBOSE" = true ]; then
        log_info "Container Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" | grep medcoverage || log_warning "No container stats available"
    fi
}

# Function to get database metrics
get_database_metrics() {
    if [ "$JSON_OUTPUT" = true ]; then
        cat <<EOF
    "database_metrics": {
        "main_database": {
            "connections": $(docker exec medcoverage_postgres_unified psql -U postgres -d "$MAIN_DB_NAME" -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" -t 2>/dev/null | tr -d ' ' || echo "0"),
            "size": "$(docker exec medcoverage_postgres_unified psql -U postgres -d "$MAIN_DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$MAIN_DB_NAME'));" -t 2>/dev/null | tr -d ' ' || echo "unknown")"
        },
        "finance_database": {
            "connections": $(docker exec medcoverage_postgres_unified psql -U postgres -d "$FINANCE_DB_NAME" -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" -t 2>/dev/null | tr -d ' ' || echo "0"),
            "size": "$(docker exec medcoverage_postgres_unified psql -U postgres -d "$FINANCE_DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$FINANCE_DB_NAME'));" -t 2>/dev/null | tr -d ' ' || echo "unknown")"
        }
    },
EOF
    elif [ "$VERBOSE" = true ]; then
        local main_db_size=$(docker exec medcoverage_postgres_unified psql -U postgres -d "$MAIN_DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$MAIN_DB_NAME'));" -t 2>/dev/null | tr -d ' ' || echo "unknown")
        local finance_db_size=$(docker exec medcoverage_postgres_unified psql -U postgres -d "$FINANCE_DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$FINANCE_DB_NAME'));" -t 2>/dev/null | tr -d ' ' || echo "unknown")
        log_info "Database Metrics - Main: $main_db_size, Finance: $finance_db_size"
    fi
}

# Function to get health history
show_health_history() {
    if [ ${#HEALTH_HISTORY[@]} -eq 0 ]; then
        log_info "No health history available"
        return 0
    fi

    echo ""
    log_info "Health Status History (last 10 checks):"
    echo "------------------------------------------"

    for ((i=${#HEALTH_HISTORY[@]}-1; i>=0 && i>=$((${#HEALTH_HISTORY[@]}-10)); i--)); do
        local history_entry="${HEALTH_HISTORY[i]}"
        local timestamp=$(echo "$history_entry" | cut -d'|' -f1)
        local status=$(echo "$history_entry" | cut -d'|' -f2)
        local duration=$(echo "$history_entry" | cut -d'|' -f3)
        local failed_count=$(echo "$history_entry" | cut -d'|' -f4)

        case $status in
            healthy)
                echo -e "${GREEN}$timestamp${NC} - ${GREEN}HEALTHY${NC} (${duration}s)"
                ;;
            degraded)
                echo -e "${GREEN}$timestamp${NC} - ${YELLOW}DEGRADED${NC} (${duration}s, $failed_count degraded)"
                ;;
            unhealthy)
                echo -e "${GREEN}$timestamp${NC} - ${RED}UNHEALTHY${NC} (${duration}s, $failed_count failed)"
                ;;
        esac
    done
}

# Function to show detailed metrics
show_metrics() {
    echo ""
    log_info "Performance Metrics"
    echo "===================="

    get_system_metrics
    echo ""

    log_info "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" | grep medcoverage || log_warning "No container stats available"
    echo ""

    log_info "Database Metrics:"
    get_database_metrics
    echo ""

    log_info "Network Connections:"
    echo "Active connections by port:"
    netstat -an | grep -E ":(3000|3001|5000|5432|6379)" | grep ESTABLISHED | awk '{print $4}' | sort | uniq -c | sort -nr
}

# Function to perform comprehensive health check
perform_health_check() {
    local check_start_time=$(date +%s)
    FAILED_SERVICES=()
    DEGRADED_SERVICES=()

    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"timestamp\": \"$(date '+%Y-%m-%d %H:%M:%S')\","
        echo "  \"overall_status\": \"checking\","
    fi

    # Check specific service if requested
    if [ -n "$CHECK_SERVICE" ] && [ "$CHECK_SERVICE" != "all" ]; then
        case $CHECK_SERVICE in
            backend)
                check_http_service "Backend API" "$BACKEND_URL" || FAILED_SERVICES+=("backend")
                ;;
            finance)
                check_http_service "Finance API" "$FINANCE_URL" || FAILED_SERVICES+=("finance")
                ;;
            frontend)
                check_http_service "Frontend" "$FRONTEND_URL" || FAILED_SERVICES+=("frontend")
                ;;
            database)
                check_database_health "$MAIN_DB_NAME" "main-database" || FAILED_SERVICES+=("main-database")
                check_database_health "$FINANCE_DB_NAME" "finance-database" || FAILED_SERVICES+=("finance-database")
                ;;
            redis)
                check_redis_health || FAILED_SERVICES+=("redis")
                ;;
        esac
    else
        # Full health check
        if [ "$JSON_OUTPUT" = true ]; then
            echo "  \"checks\": {"
        fi

        # Check Docker containers
        if ! check_containers; then
            OVERALL_STATUS="unhealthy"
        fi

        # Check main database
        if ! check_database_health "$MAIN_DB_NAME" "main-database"; then
            FAILED_SERVICES+=("main-database")
            OVERALL_STATUS="unhealthy"
        fi

        # Check finance database
        if ! check_database_health "$FINANCE_DB_NAME" "finance-database"; then
            FAILED_SERVICES+=("finance-database")
            OVERALL_STATUS="unhealthy"
        fi

        # Check Redis
        local redis_status=0
        if ! check_redis_health; then
            redis_status=$?
            if [ $redis_status -eq 2 ]; then
                FAILED_SERVICES+=("redis")
                OVERALL_STATUS="degraded"
            else
                FAILED_SERVICES+=("redis")
                OVERALL_STATUS="unhealthy"
            fi
        fi

        # Check backend API
        if ! check_http_service "Backend API" "$BACKEND_URL"; then
            FAILED_SERVICES+=("backend")
            OVERALL_STATUS="unhealthy"
        fi

        # Check finance API
        if ! check_http_service "Finance API" "$FINANCE_URL"; then
            FAILED_SERVICES+=("finance")
            OVERALL_STATUS="unhealthy"
        fi

        # Check frontend
        if ! check_http_service "Frontend" "$FRONTEND_URL"; then
            FAILED_SERVICES+=("frontend")
            OVERALL_STATUS="degraded"
        fi

        if [ "$JSON_OUTPUT" = true ]; then
            echo "  },"
        fi
    fi

    local check_end_time=$(date +%s)
    local check_duration=$((check_end_time - check_start_time))
    LAST_CHECK_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    HEALTH_DURATION=$check_duration

    # Determine final status
    local failed_count=${#FAILED_SERVICES[@]}
    local degraded_count=${#DEGRADED_SERVICES[@]}

    if [ $failed_count -eq 0 ] && [ $degraded_count -eq 0 ]; then
        OVERALL_STATUS="healthy"
    elif [ $failed_count -eq 0 ]; then
        OVERALL_STATUS="degraded"
    else
        OVERALL_STATUS="unhealthy"
    fi

    # Add to health history
    local history_entry="$LAST_CHECK_TIME|$OVERALL_STATUS|$check_duration|$((failed_count + degraded_count))"
    HEALTH_HISTORY+=("$history_entry")
    # Keep only last 100 entries
    if [ ${#HEALTH_HISTORY[@]} -gt 100 ]; then
        HEALTH_HISTORY=("${HEALTH_HISTORY[@]:1}")
    fi

    if [ "$JSON_OUTPUT" = true ]; then
        echo "  \"overall_status\": \"$OVERALL_STATUS\","
        echo "  \"check_duration_seconds\": $check_duration,"
        echo "  \"failed_services\": [$(printf '"%s",' "${FAILED_SERVICES[@]}" | sed 's/,$//')],"
        echo "  \"degraded_services\": [$(printf '"%s",' "${DEGRADED_SERVICES[@]}" | sed 's/,$//')],"
        get_system_metrics
        get_service_metrics
        get_database_metrics
        echo "  \"services\": {"
        echo "    \"backend\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ backend ] && echo "unhealthy" || ([ "${DEGRADED_SERVICES[*]}" =~ backend ] && echo "degraded" || echo "healthy"))\", \"url\": \"$BACKEND_URL\" },"
        echo "    \"finance\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ finance ] && echo "unhealthy" || ([ "${DEGRADED_SERVICES[*]}" =~ finance ] && echo "degraded" || echo "healthy"))\", \"url\": \"$FINANCE_URL\" },"
        echo "    \"frontend\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ frontend ] && echo "unhealthy" || ([ "${DEGRADED_SERVICES[*]}" =~ frontend ] && echo "degraded" || echo "healthy"))\", \"url\": \"$FRONTEND_URL\" },"
        echo "    \"main_database\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ main-database ] && echo "unhealthy" || "healthy")\", \"database\": \"$MAIN_DB_NAME\" },"
        echo "    \"finance_database\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ finance-database ] && echo "unhealthy" || "healthy")\", \"database\": \"$FINANCE_DB_NAME\" },"
        echo "    \"redis\": { \"status\": \"$([ "${FAILED_SERVICES[*]}" =~ redis ] && echo "unhealthy" || ([ "${DEGRADED_SERVICES[*]}" =~ redis ] && echo "degraded" || echo "healthy"))\" }"
        echo "  }"
        echo "}"
    else
        if [ $failed_count -eq 0 ] && [ $degraded_count -eq 0 ]; then
            log_success "All services are healthy"
        else
            if [ $failed_count -gt 0 ]; then
                log_error "Failed services: ${FAILED_SERVICES[*]}"
            fi
            if [ $degraded_count -gt 0 ]; then
                log_warning "Degraded services: ${DEGRADED_SERVICES[*]}"
            fi
        fi
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
CHECK_SERVICE=""
SHOW_HISTORY=false
SHOW_METRICS=false

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
        --service)
            CHECK_SERVICE=$2
            shift 2
            ;;
        --history)
            SHOW_HISTORY=true
            shift
            ;;
        --metrics)
            SHOW_METRICS=true
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
    log_info "Medical Coverage System Unified Health Check"
    echo "==========================================="

    # Show history if requested
    if [ "$SHOW_HISTORY" = true ]; then
        show_health_history
        exit 0
    fi

    # Show metrics if requested
    if [ "$SHOW_METRICS" = true ]; then
        show_metrics
        exit 0
    fi

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