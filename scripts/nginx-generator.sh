#!/bin/bash

# MedicalCoverageSystem Nginx Configuration Generator
# Dynamic Nginx configuration generation based on deployment settings
# Usage: ./scripts/nginx-generator.sh [dev|prod] [--output-file=path]

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
OUTPUT_FILE="${PROJECT_ROOT}/deployment/configs/nginx-generated.conf"

# Template and output files
TEMPLATE_FILE="${PROJECT_ROOT}/deployment/configs/nginx-template.conf"
GENERATED_FILE="${PROJECT_ROOT}/deployment/configs/nginx-unified.conf"
ENV_FILE="${PROJECT_ROOT}/.env"

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[Nginx Generator] ${message}${NC}"
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

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|prod)
                DEPLOYMENT_TYPE="$1"
                shift
                ;;
            --output-file=*)
                OUTPUT_FILE="${1#*=}"
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
MedicalCoverageSystem Nginx Configuration Generator

USAGE:
    ./scripts/nginx-generator.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev     Generate development configuration (HTTP + optional HTTPS)
    prod    Generate production configuration (HTTPS-only)

OPTIONS:
    --output-file=PATH       Output configuration file path
    --help, -h                Show this help message

EXAMPLES:
    ./scripts/nginx-generator.sh dev
    ./scripts/nginx-generator.sh prod
    ./scripts/nginx-generator.sh prod --output-file=./custom-nginx.conf

DEVELOPMENT CONFIGURATION:
    • HTTP server on port 80
    • Optional HTTPS server with self-signed certificates
    • Relaxed CORS and security headers
    • Hot reload support
    • Debug logging enabled

PRODUCTION CONFIGURATION:
    • HTTPS-only server with HSTS
    • Strict security headers and CSP
    • Aggressive rate limiting
    • SSL optimization
    • Production logging

TEMPLATE SYSTEM:
    Uses deployment/configs/nginx-template.conf as the base template.
    Variables marked with {{VARIABLE}} are replaced during generation:
    - SSL certificates paths
    - Upstream server configurations
    - Rate limiting settings
    - Security headers
    - CORS origins
    - Timeout values

GENERATED FILES:
    - deployment/configs/nginx-unified.conf
    - deployment/ssl/ certificates must exist (run ssl-manager.sh first)

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

    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not found: $ENV_FILE"
        print_info "Please run: ./scripts/auto-setup.sh $DEPLOYMENT_TYPE"
        exit 1
    fi

    # Source environment file (safe loading)
    set -a
    source "$ENV_FILE"
    set +a

    # Set default values if not in environment
    export APP_VERSION="${APP_VERSION:-1.0.0}"
    export APP_ENV="${APP_ENV:-$DEPLOYMENT_TYPE}"
    export SERVER_NAME="${SERVER_NAME:-localhost}"
    export LOG_LEVEL="${LOG_LEVEL:-warn}"

    # Set backend and frontend hosts
    export BACKEND_HOST="${BACKEND_HOST:-backend}"
    export BACKEND_PORT="${BACKEND_PORT:-3001}"
    export FINANCE_HOST="${FINANCE_HOST:-finance}"
    export FINANCE_PORT="${FINANCE_PORT:-5000}"
    export FRONTEND_HOST="${FRONTEND_HOST:-frontend}"
    export FRONTEND_PORT="${FRONTEND_PORT:-3000}"

    # Set SSL paths
    export SSL_CERT_PATH="${SSL_CERT_PATH:-${PROJECT_ROOT}/deployment/ssl/${DEPLOYMENT_TYPE}/localhost.crt}"
    export SSL_KEY_PATH="${SSL_KEY_PATH:-${PROJECT_ROOT}/deployment/ssl/${DEPLOYMENT_TYPE}/localhost.key}"
    export SSL_CA_PATH="${SSL_CA_PATH:-${PROJECT_ROOT}/deployment/ssl/${DEPLOYMENT_TYPE}/ca-bundle.crt}"

    # Set file sizes
    export MAX_FILE_SIZE="${MAX_FILE_SIZE:-10485760}"  # 10MB

    # Set rate limits
    export RATE_LIMIT_GENERAL="${RATE_LIMIT_GENERAL:-10}"
    export RATE_LIMIT_API="${RATE_LIMIT_API:-50}"
    export RATE_LIMIT_FINANCE="${RATE_LIMIT_FINANCE:-30}"
    export RATE_LIMIT_UPLOAD="${RATE_LIMIT_UPLOAD:-5}"

    export RATE_LIMIT_BURST="${RATE_LIMIT_BURST:-20}"
    export RATE_LIMIT_API_BURST="${RATE_LIMIT_API_BURST:-100}"
    export RATE_LIMIT_FINANCE_BURST="${RATE_LIMIT_FINANCE_BURST:-60}"
    export RATE_LIMIT_UPLOAD_BURST="${RATE_LIMIT_UPLOAD_BURST:-10}"

    # Set timeouts (in seconds)
    export API_CONNECT_TIMEOUT="${API_CONNECT_TIMEOUT:-10}"
    export API_SEND_TIMEOUT="${API_SEND_TIMEOUT:-30}"
    export API_READ_TIMEOUT="${API_READ_TIMEOUT:-30}"

    export FINANCE_CONNECT_TIMEOUT="${FINANCE_CONNECT_TIMEOUT:-10}"
    export FINANCE_SEND_TIMEOUT="${FINANCE_SEND_TIMEOUT:-30}"
    export FINANCE_READ_TIMEOUT="${FINANCE_READ_TIMEOUT:-30}"

    export FRONTEND_CONNECT_TIMEOUT="${FRONTEND_CONNECT_TIMEOUT:-10}"
    export FRONTEND_SEND_TIMEOUT="${FRONTEND_SEND_TIMEOUT:-60}"
    export FRONTEND_READ_TIMEOUT="${FRONTEND_READ_TIMEOUT:-60}"

    export UPLOAD_CONNECT_TIMEOUT="${UPLOAD_CONNECT_TIMEOUT:-10}"
    export UPLOAD_SEND_TIMEOUT="${UPLOAD_SEND_TIMEOUT:-300}"  # 5 minutes for uploads
    export UPLOAD_READ_TIMEOUT="${UPLOAD_READ_TIMEOUT:-300}"  # 5 minutes for uploads

    # Set security settings
    export MAX_CONNECTIONS_PER_IP="${MAX_CONNECTIONS_PER_IP:-20}"

    print_success "Environment configuration loaded"
}

# Validate prerequisites
validate_prerequisites() {
    print_step "Validating prerequisites"

    # Check if template file exists
    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        print_error "Nginx template file not found: $TEMPLATE_FILE"
        exit 1
    fi

    # Check if SSL certificates exist (unless disabled)
    if [[ "$SSL_ENABLED" == "true" ]]; then
        local cert_key="${SSL_KEY_PATH}"
        local cert_cert="${SSL_CERT_PATH}"

        if [[ ! -f "$cert_cert" ]]; then
            print_error "SSL certificate not found: $cert_cert"
            print_info "Please run: ./scripts/ssl-manager.sh $DEPLOYMENT_TYPE"
            exit 1
        fi

        if [[ ! -f "$cert_key" ]]; then
            print_error "SSL private key not found: $cert_key"
            print_info "Please run: ./scripts/ssl-manager.sh $DEPLOYMENT_TYPE"
            exit 1
        fi

        # Validate certificate and key match
        local cert_modulus
        local key_modulus

        cert_modulus=$(openssl x509 -noout -modulus -in "$cert_cert" 2>/dev/null | openssl md5)
        key_modulus=$(openssl rsa -noout -modulus -in "$cert_key" 2>/dev/null | openssl md5)

        if [[ "$cert_modulus" != "$key_modulus" ]]; then
            print_error "SSL certificate and private key do not match"
            exit 1
        fi

        print_success "SSL certificates validated"
    fi

    print_success "Prerequisites validated"
}

# Set development-specific configuration
set_dev_configuration() {
    print_info "Configuring development settings"

    # Development security headers (relaxed)
    export X_FRAME_OPTIONS="${X_FRAME_OPTIONS:-SAMEORIGIN}"
    export REFERRER_POLICY="${REFERRER_POLICY:-strict-origin-when-cross-origin}"
    export HSTS_POLICY="${HSTS_POLICY:-max-age=300; includeSubDomains}"
    export CSP_POLICY="${CSP_POLICY:-default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;}"
    export X_CONTENT_SECURITY_POLICY="${X_CONTENT_SECURITY_POLICY:-default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:;}"

    # Development CORS (permissive)
    export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}"
    export CORS_ALLOW_CREDENTIALS="true"

    # Development rate limiting (relaxed)
    export RATE_LIMIT_GENERAL="${RATE_LIMIT_GENERAL:-50}"
    export RATE_LIMIT_API="${RATE_LIMIT_API:-100}"
    export RATE_LIMIT_FINANCE="${RATE_LIMIT_FINANCE:-75}"
    export RATE_LIMIT_UPLOAD="${RATE_LIMIT_UPLOAD:-10}"

    # Development timeouts (longer for debugging)
    export API_CONNECT_TIMEOUT="${API_CONNECT_TIMEOUT:-30}"
    export API_SEND_TIMEOUT="${API_SEND_TIMEOUT:-60}"
    export API_READ_TIMEOUT="${API_READ_TIMEOUT:-60}"

    # Development logging
    export LOG_LEVEL="${LOG_LEVEL:-info}"

    # Development specific headers
    export DEV_HEADERS="true"
    export DEBUG_MODE="true"
}

# Set production-specific configuration
set_prod_configuration() {
    print_info "Configuring production settings"

    # Production security headers (strict)
    export X_FRAME_OPTIONS="${X_FRAME_OPTIONS:-DENY}"
    export REFERRER_POLICY="${REFERRER_POLICY:-no-referrer-when-downgrade}"
    export HSTS_POLICY="${HSTS_POLICY:-max-age=31536000; includeSubDomains; preload}"
    export CSP_POLICY="${CSP_POLICY:-default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';}"
    export X_CONTENT_SECURITY_POLICY="${X_CONTENT_SECURITY_POLICY:-default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;}"

    # Production CORS (restricted)
    local hostname
    hostname=$(get_system_hostname)
    export CORS_ORIGINS="${CORS_ORIGINS:-https://$hostname}"
    export CORS_ALLOW_CREDENTIALS="true"

    # Production rate limiting (strict)
    export RATE_LIMIT_GENERAL="${RATE_LIMIT_GENERAL:-10}"
    export RATE_LIMIT_API="${RATE_LIMIT_API:-50}"
    export RATE_LIMIT_FINANCE="${RATE_LIMIT_FINANCE:-30}"
    export RATE_LIMIT_UPLOAD="${RATE_LIMIT_UPLOAD:-5}"

    # Production timeouts (optimized)
    export API_CONNECT_TIMEOUT="${API_CONNECT_TIMEOUT:-10}"
    export API_SEND_TIMEOUT="${API_SEND_TIMEOUT:-30}"
    export API_READ_TIMEOUT="${API_READ_TIMEOUT:-30}"

    # Production logging
    export LOG_LEVEL="${LOG_LEVEL:-warn}"

    # Production security
    export DEV_HEADERS="false"
    export DEBUG_MODE="false"

    # SSL hardening for production
    export SSL_STRICT="true"

    # Certificate Transparency
    export EXPECT_CT_POLICY="${EXPECT_CT_POLICY:-max-age=30; report-uri='https://report-uri.com/example'}"
}

# Generate DH parameters for SSL
generate_dh_params() {
    local dh_params_file="${PROJECT_ROOT}/deployment/ssl/dhparam.pem"

    if [[ "$DEPLOYMENT_TYPE" == "prod" && "$SSL_ENABLED" == "true" ]]; then
        if [[ ! -f "$dh_params_file" ]]; then
            print_info "Generating DH parameters (this may take a few minutes)..."

            if openssl dhparam -out "$dh_params_file" 2048 > /dev/null 2>&1; then
                print_success "DH parameters generated: $dh_params_file"
                chmod 644 "$dh_params_file"
            else
                print_warning "Failed to generate DH parameters, using fallback"
                # Use built-in DH parameters if generation fails
                dh_params_file=""
            fi
        else
            print_info "DH parameters already exist: $dh_params_file"
        fi
    fi

    export SSL_DH_PATH="$dh_params_file"
}

# Process template variables
process_template() {
    print_step "Processing Nginx configuration template"

    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        print_error "Template file not found: $TEMPLATE_FILE"
        exit 1
    fi

    local temp_config
    temp_config=$(create_temp_file "nginx-config")

    # Copy template to temporary file
    cp "$TEMPLATE_FILE" "$temp_config"

    # Process template variables
    process_template_variables "$temp_config"

    # Process conditional blocks
    process_conditional_blocks "$temp_config"

    # Validate generated configuration
    validate_generated_config "$temp_config"

    # Move to final location
    mv "$temp_config" "$GENERATED_FILE"

    print_success "Configuration generated: $GENERATED_FILE"
}

# Process template variable substitution
process_template_variables() {
    local config_file="$1"

    # Define all variables to substitute
    local variables=(
        "SERVER_NAME"
        "APP_VERSION"
        "APP_ENV"
        "LOG_LEVEL"
        "BACKEND_HOST"
        "BACKEND_PORT"
        "FINANCE_HOST"
        "FINANCE_PORT"
        "FRONTEND_HOST"
        "FRONTEND_PORT"
        "SSL_CERT_PATH"
        "SSL_KEY_PATH"
        "SSL_CA_PATH"
        "SSL_DH_PATH"
        "MAX_FILE_SIZE"
        "RATE_LIMIT_GENERAL"
        "RATE_LIMIT_API"
        "RATE_LIMIT_FINANCE"
        "RATE_LIMIT_UPLOAD"
        "RATE_LIMIT_BURST"
        "RATE_LIMIT_API_BURST"
        "RATE_LIMIT_FINANCE_BURST"
        "RATE_LIMIT_UPLOAD_BURST"
        "API_CONNECT_TIMEOUT"
        "API_SEND_TIMEOUT"
        "API_READ_TIMEOUT"
        "FINANCE_CONNECT_TIMEOUT"
        "FINANCE_SEND_TIMEOUT"
        "FINANCE_READ_TIMEOUT"
        "FRONTEND_CONNECT_TIMEOUT"
        "FRONTEND_SEND_TIMEOUT"
        "FRONTEND_READ_TIMEOUT"
        "UPLOAD_CONNECT_TIMEOUT"
        "UPLOAD_SEND_TIMEOUT"
        "UPLOAD_READ_TIMEOUT"
        "MAX_CONNECTIONS_PER_IP"
        "CORS_ORIGINS"
        "X_FRAME_OPTIONS"
        "REFERRER_POLICY"
        "HSTS_POLICY"
        "CSP_POLICY"
        "X_CONTENT_SECURITY_POLICY"
        "EXPECT_CT_POLICY"
    )

    # Substitute variables
    for var in "${variables[@]}"; do
        local value="${!var:-}"
        # Escape special characters for sed
        value=$(echo "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')
        sed -i "s/{{$var}}/$value/g" "$config_file"
    done

    # Special handling for SSL_ENABLED and conditional blocks
    local ssl_enabled="${SSL_ENABLED:-false}"
    sed -i "s/{{SSL_ENABLED}}/$ssl_enabled/g" "$config_file"
}

# Process conditional blocks
process_conditional_blocks() {
    local config_file="$1"

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        # Development: Include HTTP server, optional HTTPS
        if [[ "$SSL_ENABLED" == "true" ]]; then
            # Keep both HTTP and HTTPS blocks for development
            sed -i '/^{{#HTTP_SERVER_BLOCK}}$/,/^{{\/HTTP_SERVER_BLOCK}}$/{s/^{{#HTTP_SERVER_BLOCK}}$//; s/^{{\/HTTP_SERVER_BLOCK}}$//; /^{{#REDIRECT_TO_HTTPS}}$/,/^{{\/REDIRECT_TO_HTTPS}}$/{s/^{{#REDIRECT_TO_HTTPS}}$//; s/^{{\/REDIRECT_TO_HTTPS}}$//; d;}; /^{{#SERVE_HTTP_DIRECT}}$/,/^{{\/SERVE_HTTP_DIRECT}}$/{s/^{{#SERVE_HTTP_DIRECT}}$//; s/^{{\/SERVE_HTTP_DIRECT}}$//;};}' "$config_file"
        else
            # Remove HTTP redirect block, keep direct serving
            sed -i '/^{{#HTTP_SERVER_BLOCK}}$/,/^{{\/HTTP_SERVER_BLOCK}}$/{s/^{{#HTTP_SERVER_BLOCK}}$//; s/^{{\/HTTP_SERVER_BLOCK}}$//; /^{{#REDIRECT_TO_HTTPS}}$/,/^{{\/REDIRECT_TO_HTTPS}}$/{d;}; /^{{#SERVE_HTTP_DIRECT}}$/,/^{{\/SERVE_HTTP_DIRECT}}$/{s/^{{#SERVE_HTTP_DIRECT}}$//; s/^{{\/SERVE_HTTP_DIRECT}}$//;};}' "$config_file"
        fi

        # Remove HTTPS server block if SSL disabled
        if [[ "$SSL_ENABLED" != "true" ]]; then
            sed -i '/^{{#HTTPS_SERVER_BLOCK}}$/,/^{{\/HTTPS_SERVER_BLOCK}}$/d' "$config_file"
        else
            sed -i '/^{{#HTTPS_SERVER_BLOCK}}$/,/^{{\/HTTPS_SERVER_BLOCK}}$/{s/^{{#HTTPS_SERVER_BLOCK}}$//; s/^{{\/HTTPS_SERVER_BLOCK}}$//; /^{{#GEO_BLOCK}}$/,/^{{\/GEO_BLOCK}}$/{s/^{{#GEO_BLOCK}}$//; s/^{{\/GEO_BLOCK}}$//; d;}; /^{{#ADMIN_IPS}}$/,/^{{\/ADMIN_IPS}}$/{s/^{{#ADMIN_IPS}}$//; s/^{{\/ADMIN_IPS}}$//; d;}; /^{{#EXPECT_CT}}$/,/^{{\/EXPECT_CT}}$/{s/^{{#EXPECT_CT}}$//; s/^{{\/EXPECT_CT}}$//; d;};}' "$config_file"
        fi

        # Remove TCP proxy in development
        sed -i '/^{{#TCP_PROXY}}$/,/^{{\/TCP_PROXY}}$/d' "$config_file"

    else
        # Production: Remove HTTP server block, keep HTTPS only
        sed -i '/^{{#HTTP_SERVER_BLOCK}}$/,/^{{\/HTTP_SERVER_BLOCK}}$/d' "$config_file"

        # Process HTTPS server block
        sed -i '/^{{#HTTPS_SERVER_BLOCK}}$/,/^{{\/HTTPS_SERVER_BLOCK}}$/{s/^{{#HTTPS_SERVER_BLOCK}}$//; s/^{{\/HTTPS_SERVER_BLOCK}}$//; /^{{#GEO_BLOCK}}$/,/^{{\/GEO_BLOCK}}$/{s/^{{#GEO_BLOCK}}$//; s/^{{\/GEO_BLOCK}}$//;}; /^{{#ADMIN_IPS}}$/,/^{{\/ADMIN_IPS}}$/{s/^{{#ADMIN_IPS}}$//; s/^{{\/ADMIN_IPS}}$//; d;}; /^{{#EXPECT_CT}}$/,/^{{\/EXPECT_CT}}$/{s/^{{#EXPECT_CT}}$//; s/^{{\/EXPECT_CT}}$//;};}' "$config_file"

        # Remove TCP proxy unless specifically configured
        if [[ "${TCP_PROXY_ENABLED:-false}" != "true" ]]; then
            sed -i '/^{{#TCP_PROXY}}$/,/^{{\/TCP_PROXY}}$/d' "$config_file"
        fi
    fi

    # Remove any remaining conditional markers
    sed -i '/^{{#[A-Z_]*}}$/d; /^{{\/[A-Z_]*}}$/d' "$config_file"
}

# Validate generated configuration
validate_generated_config() {
    print_info "Validating generated Nginx configuration"

    local config_file="$1"

    # Check if nginx binary is available for testing
    if command -v nginx &> /dev/null; then
        if nginx -t -c "$config_file" > /dev/null 2>&1; then
            print_success "Generated configuration is valid"
        else
            print_error "Generated configuration has syntax errors"
            nginx -t -c "$config_file" || true
            exit 1
        fi
    else
        print_warning "Nginx not available for syntax validation"
    fi

    # Check for critical placeholders that weren't replaced
    local remaining_placeholders
    remaining_placeholders=$(grep -o '{{[A-Z_]*}}' "$config_file" | sort -u | tr '\n' ' ')

    if [[ -n "$remaining_placeholders" ]]; then
        print_error "Unresolved template variables: $remaining_placeholders"
        print_info "These variables need to be set in the environment file"
        exit 1
    fi

    print_success "Configuration validation completed"
}

# Create Nginx configuration summary
create_configuration_summary() {
    print_info "Creating configuration summary"

    local summary_file="${PROJECT_ROOT}/deployment/configs/nginx-summary.json"
    local current_timestamp
    current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$summary_file" << EOF
{
    "generated_at": "$current_timestamp",
    "deployment_type": "$DEPLOYMENT_TYPE",
    "configuration_file": "$GENERATED_FILE",
    "template_file": "$TEMPLATE_FILE",
    "ssl_enabled": "$SSL_ENABLED",
    "servers": [
EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat >> "$summary_file" << EOF
        {
            "port": 80,
            "protocol": "http",
            "server_name": "$SERVER_NAME",
            "ssl": false,
            "cors_origins": "$CORS_ORIGINS",
            "rate_limiting": "relaxed"
        }
EOF

        if [[ "$SSL_ENABLED" == "true" ]]; then
            cat >> "$summary_file" << EOF
        ,{
            "port": 443,
            "protocol": "https",
            "server_name": "$SERVER_NAME",
            "ssl": true,
            "cors_origins": "$CORS_ORIGINS",
            "rate_limiting": "relaxed",
            "security_headers": "development"
        }
EOF
        fi
    else
        cat >> "$summary_file" << EOF
        {
            "port": 443,
            "protocol": "https",
            "server_name": "$SERVER_NAME",
            "ssl": true,
            "cors_origins": "$CORS_ORIGINS",
            "rate_limiting": "strict",
            "security_headers": "production",
            "hsts": "$HSTS_POLICY"
        }
EOF
    fi

    cat >> "$summary_file" << EOF
    ],
    "upstreams": [
        {
            "name": "frontend",
            "servers": ["$FRONTEND_HOST:$FRONTEND_PORT"],
            "type": "http"
        },
        {
            "name": "backend",
            "servers": ["$BACKEND_HOST:$BACKEND_PORT"],
            "type": "http"
        },
        {
            "name": "finance_api",
            "servers": ["$FINANCE_HOST:$FINANCE_PORT"],
            "type": "http"
        }
    ],
    "rate_limits": {
        "general": "$RATE_LIMIT_GENERAL r/s",
        "api": "$RATE_LIMIT_API r/s",
        "finance": "$RATE_LIMIT_FINANCE r/s",
        "upload": "$RATE_LIMIT_UPLOAD r/s"
    },
    "timeouts": {
        "api_connect": "${API_CONNECT_TIMEOUT}s",
        "api_send": "${API_SEND_TIMEOUT}s",
        "api_read": "${API_READ_TIMEOUT}s",
        "frontend_connect": "${FRONTEND_CONNECT_TIMEOUT}s",
        "frontend_send": "${FRONTEND_SEND_TIMEOUT}s",
        "frontend_read": "${FRONTEND_READ_TIMEOUT}s",
        "upload_connect": "${UPLOAD_CONNECT_TIMEOUT}s",
        "upload_send": "${UPLOAD_SEND_TIMEOUT}s",
        "upload_read": "${UPLOAD_READ_TIMEOUT}s"
    },
    "ssl": {
        "certificate": "$SSL_CERT_PATH",
        "private_key": "$SSL_KEY_PATH",
        "ca_bundle": "$SSL_CA_PATH",
        "dh_params": "$SSL_DH_PATH"
    }
}
EOF

    print_success "Configuration summary saved: $summary_file"
}

# Show configuration information
show_configuration_info() {
    print_info "Nginx Configuration Generated for $DEPLOYMENT_TYPE"

    cat << EOF
${CYAN}Configuration File:${NC} $GENERATED_FILE
${CYAN}Template Used:${NC} $TEMPLATE_FILE
${CYAN}Deployment Type:${NC} $DEPLOYMENT_TYPE
${CYAN}SSL Enabled:${NC} $SSL_ENABLED
${CYAN}Server Name:${NC} $SERVER_NAME

${CYAN}Upstream Servers:${NC}
• Frontend: $FRONTEND_HOST:$FRONTEND_PORT
• Backend: $BACKEND_HOST:$BACKEND_PORT
• Finance API: $FINANCE_HOST:$FINANCE_PORT

${CYAN}Rate Limiting:${NC}
• General: $RATE_LIMIT_GENERAL req/s
• API: $RATE_LIMIT_API req/s
• Finance: $RATE_LIMIT_FINANCE req/s
• Upload: $RATE_LIMIT_UPLOAD req/s

${CYAN}Security Configuration:${NC}
• X-Frame-Options: $X_FRAME_OPTIONS
• Referrer Policy: $REFERRER_POLICY
• CSP: Content Security Policy enabled
• CORS Origins: $CORS_ORIGINS

EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat << EOF
${GREEN}Development Features:${NC}
• HTTP server on port 80
${GREEN}• Optional HTTPS server${NC} on port 443
${GREEN}• Relaxed security headers${NC} for easier testing
${GREEN}• Debug logging enabled${NC}
${GREEN}• CORS allowed from localhost${NC}

${CYAN}To use with Docker:${NC}
docker run -p 80:80 -p 443:443 -v $(pwd)/deployment/configs/nginx-generated.conf:/etc/nginx/nginx.conf nginx

EOF
    else
        cat << EOF
${GREEN}Production Features:${NC}
• HTTPS-only server with HSTS
${GREEN}• Strict security headers${NC} and CSP
${GREEN}• Aggressive rate limiting${NC} for security
${GREEN}• SSL optimization${NC} with DH parameters
${GREEN}• Certificate Transparency${NC} reporting

${CYAN}To use with Docker:${NC}
docker run -p 443:443 -p 80:80 -v $(pwd)/deployment/configs/nginx-generated.conf:/etc/nginx/nginx.conf -v $(pwd)/deployment/ssl:/ssl:ro nginx

EOF
    fi

    cat << EOF
${CYAN}Configuration Commands:${NC}
• Test configuration: nginx -t -c deployment/configs/nginx-generated.conf
• Reload configuration: nginx -s reload -c deployment/configs/nginx-generated.conf
• View configuration: less deployment/configs/nginx-generated.conf

${GREEN}✅ Nginx configuration generated successfully${NC}

EOF
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "Nginx configuration generation failed"
        print_info "Check the error messages above for troubleshooting"
        if [[ -f "$temp_config" ]]; then
            rm -f "$temp_config"
            print_info "Removed temporary configuration file"
        fi
    fi
}

# Main execution
main() {
    print_info "Starting Nginx configuration generation for $DEPLOYMENT_TYPE"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute generation steps
    parse_arguments "$@"
    load_platform_utils
    load_environment
    validate_prerequisites

    # Configure deployment-specific settings
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        set_dev_configuration
    else
        set_prod_configuration
    fi

    generate_dh_params
    process_template
    create_configuration_summary
    show_configuration_info

    print_success "Nginx configuration generation completed"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi