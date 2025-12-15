#!/bin/bash

# MedicalCoverageSystem Auto Setup Script
# Environment configuration and secure secret generation
# Usage: ./scripts/auto-setup.sh [dev|prod]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_TYPE="dev"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_TEMPLATE="${PROJECT_ROOT}/.env.template"

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[Auto Setup] ${message}${NC}"
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
    local platform_utils_file="${SCRIPT_DIR}/platform-utils.sh"

    if [[ ! -f "$platform_utils_file" ]]; then
        print_error "Platform utilities not found: $platform_utils_file"
        exit 1
    fi

    source "$platform_utils_file"
    init_platform_detection
}

# Parse command line arguments
parse_arguments() {
    if [[ $# -gt 0 ]]; then
        case "$1" in
            dev|prod)
                DEPLOYMENT_TYPE="$1"
                ;;
            *)
                print_error "Invalid deployment type: $1"
                print_info "Usage: $0 [dev|prod]"
                exit 1
                ;;
        esac
    fi

    print_info "Setting up environment for: $DEPLOYMENT_TYPE"
}

# Generate secure random values
generate_secure_values() {
    print_info "Generating secure environment values"

    # Database credentials
    DB_PASSWORD_MAIN=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    DB_PASSWORD_FINANCE=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    DB_USER_MAIN="medical_coverage_user"
    DB_USER_FINANCE="medical_coverage_finance_user"

    # JWT secrets
    JWT_SECRET=$(generate_random_string 64 base64)
    JWT_REFRESH_SECRET=$(generate_random_string 64 base64)
    JWT_EXPIRY_HOURS="${JWT_EXPIRY_HOURS:-24}"
    JWT_REFRESH_EXPIRY_DAYS="${JWT_REFRESH_EXPIRY_DAYS:-7}"

    # Redis configuration
    REDIS_PASSWORD=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    REDIS_HOST="redis"
    REDIS_PORT="6379"
    REDIS_DB="0"

    # Application secrets
    APP_SECRET_KEY=$(generate_random_string 64 base64)
    SESSION_SECRET=$(generate_random_string 64 base64)
    ENCRYPTION_KEY=$(generate_random_string 64 base64)

    # API keys and external service secrets
    API_KEY_SECRET=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    WEBHOOK_SECRET=$(generate_random_string 64 base64)

    # Email configuration
    SMTP_PASSWORD=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    EMAIL_FROM="noreply@$(get_system_hostname)"
    EMAIL_SUPPORT="support@$(get_system_hostname)"

    # SMS configuration
    SMS_API_KEY=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    SMS_API_SECRET=$(generate_random_string 64 base64)

    # File upload and storage
    UPLOAD_SECRET=$(generate_random_string 32 base64 | tr -d '/+=' | head -c 32)
    MAX_FILE_SIZE="10485760"  # 10MB in bytes

    print_success "Secure values generated"
}

# Generate development-specific configurations
generate_dev_config() {
    print_info "Configuring development environment"

    # Database configuration for development
    DB_HOST="localhost"
    DB_PORT_MAIN="5432"
    DB_PORT_FINANCE="5433"  # Different port to avoid conflicts
    DB_NAME_MAIN="medical_coverage_dev"
    DB_NAME_FINANCE="medical_coverage_finance_dev"

    # Application URLs for development
    APP_URL="http://localhost:3000"
    API_URL="http://localhost:3001"
    FINANCE_URL="http://localhost:5000"
    CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

    # SSL configuration for development (self-signed)
    SSL_ENABLED="true"
    SSL_VERIFY="false"
    SSL_CA_PATH="${PROJECT_ROOT}/deployment/ssl/dev/ca-bundle.crt"

    # Logging and debugging
    LOG_LEVEL="debug"
    DEBUG_MODE="true"
    VERBOSE_LOGGING="true"

    # Rate limiting (relaxed for development)
    RATE_LIMIT_ENABLED="false"
    RATE_LIMIT_WINDOW="15"
    RATE_LIMIT_MAX="1000"

    # Email (development mode - local or mailtrap)
    SMTP_HOST="localhost"
    SMTP_PORT="1025"  # Mailhog or mailtrap default
    SMTP_SECURE="false"
    SMTP_USER="dev"
    EMAIL_FROM="dev@localhost"

    # Redis (development)
    REDIS_HOST="localhost"
    REDIS_PORT="6379"
    REDIS_DB="0"

    # File uploads (development)
    UPLOAD_PATH="${PROJECT_ROOT}/uploads"
    MAX_FILE_SIZE="52428800"  # 50MB for development

    # External services (mock mode)
    MOCK_EXTERNAL_APIS="true"
    MOCK_EMAIL_SERVICE="true"
    MOCK_SMS_SERVICE="true"

    print_success "Development configuration generated"
}

# Generate production-specific configurations
generate_prod_config() {
    print_info "Configuring production environment"

    # Database configuration for production
    DB_HOST="db"
    DB_PORT_MAIN="5432"
    DB_PORT_FINANCE="5432"  # Same host, different database
    DB_NAME_MAIN="medical_coverage_main"
    DB_NAME_FINANCE="medical_coverage_finance"

    # Application URLs for production
    local hostname=$(get_system_hostname)
    APP_URL="https://$hostname"
    API_URL="https://$hostname/api"
    FINANCE_URL="https://$hostname/api/finance"
    CORS_ORIGINS="https://$hostname"

    # SSL configuration for production
    SSL_ENABLED="true"
    SSL_VERIFY="true"
    SSL_CA_PATH="${PROJECT_ROOT}/deployment/ssl/prod/ca-bundle.crt"

    # Logging and debugging
    LOG_LEVEL="info"
    DEBUG_MODE="false"
    VERBOSE_LOGGING="false"

    # Rate limiting (strict for production)
    RATE_LIMIT_ENABLED="true"
    RATE_LIMIT_WINDOW="15"
    RATE_LIMIT_MAX="100"

    # Email (production - needs real SMTP)
    SMTP_HOST="${SMTP_HOST:-smtp.example.com}"
    SMTP_PORT="587"
    SMTP_SECURE="true"
    SMTP_USER="noreply"
    SMTP_TLS="true"

    # Redis (production)
    REDIS_HOST="redis"
    REDIS_PORT="6379"
    REDIS_DB="0"
    REDIS_TLS="true"

    # File uploads (production)
    UPLOAD_PATH="/app/uploads"
    MAX_FILE_SIZE="10485760"  # 10MB for production

    # External services (real APIs)
    MOCK_EXTERNAL_APIS="false"
    MOCK_EMAIL_SERVICE="false"
    MOCK_SMS_SERVICE="false"

    # Security headers and monitoring
    SECURITY_HEADERS_ENABLED="true"
    MONITORING_ENABLED="true"
    ALERTING_ENABLED="true"

    print_success "Production configuration generated"
}

# Generate environment file content
generate_env_content() {
    cat << 'EOF'
# =============================================================================
# MedicalCoverageSystem Environment Configuration
# Auto-generated on: $(date)
# Deployment Type: $DEPLOYMENT_TYPE
# =============================================================================

# =============================================================================
# Application Configuration
# =============================================================================
APP_NAME="MedicalCoverageSystem"
APP_VERSION="1.0.0"
APP_ENV="$DEPLOYMENT_TYPE"
APP_DEBUG="$DEBUG_MODE"
APP_URL="$APP_URL"
APP_SECRET_KEY="$APP_SECRET_KEY"

# Session Configuration
SESSION_SECRET="$SESSION_SECRET"
SESSION_EXPIRY="$((24 * 60 * 60))"  # 24 hours
SESSION_SECURE="$SSL_ENABLED"

# =============================================================================
# Database Configuration
# =============================================================================
# Main Database
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT_MAIN"
DB_NAME="$DB_NAME_MAIN"
DB_USER="$DB_USER_MAIN"
DB_PASSWORD="$DB_PASSWORD_MAIN"
DB_SSL="$SSL_ENABLED"
DB_POOL_MIN="5"
DB_POOL_MAX="20"

# Finance Database
DB_FINANCE_HOST="$DB_HOST"
DB_FINANCE_PORT="$DB_PORT_FINANCE"
DB_FINANCE_NAME="$DB_NAME_FINANCE"
DB_FINANCE_USER="$DB_USER_FINANCE"
DB_FINANCE_PASSWORD="$DB_PASSWORD_FINANCE"
DB_FINANCE_SSL="$SSL_ENABLED"
DB_FINANCE_POOL_MIN="3"
DB_FINANCE_POOL_MAX="15"

# =============================================================================
# API Configuration
# =============================================================================
API_URL="$API_URL"
API_VERSION="v1"
API_TIMEOUT="30000"
API_KEY_SECRET="$API_KEY_SECRET"

# Finance API
FINANCE_API_URL="$FINANCE_URL"
FINANCE_API_VERSION="v1"
FINANCE_API_TIMEOUT="30000"

# =============================================================================
# JWT Configuration
# =============================================================================
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRY_HOURS="$JWT_EXPIRY_HOURS"
JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
JWT_REFRESH_EXPIRY_DAYS="$JWT_REFRESH_EXPIRY_DAYS"
JWT_ALGORITHM="HS256"

# =============================================================================
# SSL/TLS Configuration
# =============================================================================
SSL_ENABLED="$SSL_ENABLED"
SSL_VERIFY="$SSL_VERIFY"
SSL_CERT_PATH="${PROJECT_ROOT}/deployment/ssl/${DEPLOYMENT_TYPE}/localhost.crt"
SSL_KEY_PATH="${PROJECT_ROOT}/deployment/ssl/${DEPLOYMENT_TYPE}/localhost.key"
SSL_CA_PATH="$SSL_CA_PATH"

# =============================================================================
# CORS Configuration
# =============================================================================
CORS_ORIGINS="$CORS_ORIGINS"
CORS_METHODS="GET,POST,PUT,DELETE,OPTIONS,PATCH"
CORS_HEADERS="Content-Type,Authorization,X-Requested-With"
CORS_CREDENTIALS="true"

# =============================================================================
# Redis Configuration
# =============================================================================
REDIS_HOST="$REDIS_HOST"
REDIS_PORT="$REDIS_PORT"
REDIS_PASSWORD="$REDIS_PASSWORD"
REDIS_DB="$REDIS_DB"
REDIS_TLS="$REDIS_TLS"

# =============================================================================
# Rate Limiting Configuration
# =============================================================================
RATE_LIMIT_ENABLED="$RATE_LIMIT_ENABLED"
RATE_LIMIT_WINDOW="$RATE_LIMIT_WINDOW"
RATE_LIMIT_MAX="$RATE_LIMIT_MAX"

# =============================================================================
# Email Configuration
# =============================================================================
SMTP_HOST="$SMTP_HOST"
SMTP_PORT="$SMTP_PORT"
SMTP_SECURE="$SMTP_SECURE"
SMTP_USER="$SMTP_USER"
SMTP_PASSWORD="$SMTP_PASSWORD"
SMTP_TLS="$SMTP_TLS"
EMAIL_FROM="$EMAIL_FROM"
EMAIL_SUPPORT="$EMAIL_SUPPORT"

# =============================================================================
# SMS Configuration
# =============================================================================
SMS_PROVIDER="twilio"  # or nexmo, messagebird
SMS_API_KEY="$SMS_API_KEY"
SMS_API_SECRET="$SMS_API_SECRET"
SMS_FROM_NUMBER="+1234567890"

# =============================================================================
# File Upload Configuration
# =============================================================================
UPLOAD_PATH="$UPLOAD_PATH"
UPLOAD_SECRET="$UPLOAD_SECRET"
MAX_FILE_SIZE="$MAX_FILE_SIZE"
ALLOWED_FILE_TYPES="pdf,jpg,jpeg,png,doc,docx"

# =============================================================================
# Logging Configuration
# =============================================================================
LOG_LEVEL="$LOG_LEVEL"
LOG_FORMAT="json"
LOG_FILE="${PROJECT_ROOT}/logs/app.log"
LOG_MAX_SIZE="10485760"  # 10MB
LOG_MAX_FILES="5"

# =============================================================================
# Security Configuration
# =============================================================================
ENCRYPTION_KEY="$ENCRYPTION_KEY"
HASH_ROUNDS="12"
PASSWORD_MIN_LENGTH="8"
SESSION_TIMEOUT="3600"  # 1 hour
MAX_LOGIN_ATTEMPTS="5"
LOCKOUT_DURATION="900"  # 15 minutes

SECURITY_HEADERS_ENABLED="$SECURITY_HEADERS_ENABLED"

# =============================================================================
# Monitoring Configuration
# =============================================================================
MONITORING_ENABLED="$MONITORING_ENABLED"
MONITORING_INTERVAL="60"
HEALTH_CHECK_INTERVAL="30"
METRICS_ENABLED="true"

# =============================================================================
# External Service Configuration
# =============================================================================
MOCK_EXTERNAL_APIS="$MOCK_EXTERNAL_APIS"
MOCK_EMAIL_SERVICE="$MOCK_EMAIL_SERVICE"
MOCK_SMS_SERVICE="$MOCK_SMS_SERVICE"

# Webhook Configuration
WEBHOOK_SECRET="$WEBHOOK_SECRET"
WEBHOOK_TIMEOUT="5000"

# =============================================================================
# Feature Flags
# =============================================================================
FEATURE_BETA_FEATURES="false"
FEATURE_MAINTENANCE_MODE="false"
FEATURE_REGISTRATION_ENABLED="true"
FEATURE_PASSWORD_RESET_ENABLED="true"
FEATURE_EMAIL_VERIFICATION="true"

# =============================================================================
# Docker Configuration
# =============================================================================
COMPOSE_PROJECT_NAME="medical-coveragesystem"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_HTTP_TIMEOUT="120"

# =============================================================================
# Development Overrides (only for dev environment)
EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat << 'EOF'

# =============================================================================
# Development Specific Configuration
# =============================================================================
DEBUG_SQL="true"
SHOW_QUERIES="true"
HOT_RELOAD="true"
LIVERELOAD_PORT="3002"

# Development URLs
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
FINANCE_URL="http://localhost:5000"
NGINX_URL="http://localhost:80"

# Development Database
DB_URL="postgresql://$DB_USER_MAIN:$DB_PASSWORD_MAIN@$DB_HOST:$DB_PORT_MAIN/$DB_NAME_MAIN"
DB_FINANCE_URL="postgresql://$DB_USER_FINANCE:$DB_PASSWORD_FINANCE@$DB_HOST:$DB_PORT_FINANCE/$DB_NAME_FINANCE"

# Development SSL
DEV_SSL_CERT="${PROJECT_ROOT}/deployment/ssl/dev/localhost.crt"
DEV_SSL_KEY="${PROJECT_ROOT}/deployment/ssl/dev/localhost.key"
EOF
    else
        cat << 'EOF'

# =============================================================================
# Production Specific Configuration
# =============================================================================
ALERTING_ENABLED="$ALERTING_ENABLED"
SLACK_WEBHOOK_URL=""
SENTRY_DSN=""
ROLLBAR_ACCESS_TOKEN=""

# Backup Configuration
BACKUP_ENABLED="true"
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS="30"

# Security Headers
STRICT_TRANSPORT_SECURITY="max-age=31536000; includeSubDomains"
CONTENT_SECURITY_POLICY="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'"
X_FRAME_OPTIONS="DENY"
X_CONTENT_TYPE_OPTIONS="nosniff"
X_XSS_PROTECTION="1; mode=block"
EOF
    fi
}

# Create .env file
create_env_file() {
    print_info "Creating environment file"

    local env_content
    env_content=$(eval "cat <<'EOF'
$(generate_env_content)
EOF")

    echo "$env_content" > "$ENV_FILE"

    # Set secure permissions for the .env file
    set_file_permissions "$ENV_FILE" "600"

    print_success "Environment file created: $ENV_FILE"
}

# Validate generated configuration
validate_configuration() {
    print_info "Validating generated configuration"

    local errors=0

    # Check if .env file was created
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not created"
        ((errors++))
    fi

    # Validate required variables are set
    local required_vars=(
        "APP_SECRET_KEY"
        "DB_PASSWORD_MAIN"
        "DB_PASSWORD_FINANCE"
        "JWT_SECRET"
        "REDIS_PASSWORD"
        "ENCRYPTION_KEY"
    )

    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=\"$" "$ENV_FILE"; then
            print_error "Required variable not set or empty: $var"
            ((errors++))
        fi
    done

    # Check file permissions
    if ! validate_secure_permissions "$ENV_FILE" "600"; then
        print_warning "Could not set secure permissions on .env file"
    fi

    if [[ $errors -eq 0 ]]; then
        print_success "Configuration validation passed"
    else
        print_error "Configuration validation failed with $errors errors"
        return 1
    fi
}

# Show configuration summary
show_configuration_summary() {
    print_info "Configuration Summary for $DEPLOYMENT_TYPE"

    cat << EOF
${CYAN}Environment Type:${NC} $DEPLOYMENT_TYPE
${CYAN}Environment File:${NC} $ENV_FILE
${CYAN}Database Host:${NC} $DB_HOST
${CYAN}Main Database:${NC} $DB_NAME_MAIN
${CYAN}Finance Database:${NC} $DB_NAME_FINANCE
${CYAN}Application URL:${NC} $APP_URL
${CYAN}API URL:${NC} $API_URL
${CYAN}Finance API URL:${NC} $FINANCE_URL
${CYAN}SSL Enabled:${NC} $SSL_ENABLED
${CYAN}Rate Limiting:${NC} $RATE_LIMIT_ENABLED
${CYAN}Log Level:${NC} $LOG_LEVEL
${CYAN}Debug Mode:${NC} $DEBUG_MODE
EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat << EOF
${CYAN}CORS Origins:${NC} $CORS_ORIGINS
${CYAN}Mock External APIs:${NC} $MOCK_EXTERNAL_APIS
EOF
    else
        cat << EOF
${CYAN}CORS Origins:${NC} $CORS_ORIGINS
${CYAN}Security Headers:${NC} $SECURITY_HEADERS_ENABLED
${CYAN}Monitoring:${NC} $MONITORING_ENABLED
EOF
    fi

    print_warning "Keep the .env file secure and never commit it to version control"
    print_info "You can customize the configuration by editing: $ENV_FILE"
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "Environment setup failed"
        if [[ -f "$ENV_FILE" ]]; then
            rm -f "$ENV_FILE"
            print_info "Removed incomplete environment file"
        fi
    fi
}

# Main execution
main() {
    print_info "Starting MedicalCoverageSystem environment setup"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute setup steps
    parse_arguments "$@"
    load_platform_utils
    generate_secure_values

    # Generate environment-specific configuration
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        generate_dev_config
    else
        generate_prod_config
    fi

    create_env_file
    validate_configuration
    show_configuration_summary

    print_success "Environment setup completed successfully"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi