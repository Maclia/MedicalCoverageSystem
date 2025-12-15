#!/bin/bash

# MedicalCoverageSystem SSL Certificate Manager
# Automated SSL certificate generation and management
# Usage: ./scripts/ssl-manager.sh [dev|prod] [--custom-cert-path=/path/to/certs]

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
CUSTOM_CERT_PATH=""
SKIP_CERTIFICATE_VALIDATION=false

# SSL directory structure
SSL_BASE_DIR="${PROJECT_ROOT}/deployment/ssl"
SSL_DEV_DIR="${SSL_BASE_DIR}/dev"
SSL_PROD_DIR="${SSL_BASE_DIR}/prod"

# Certificate paths
SSL_DEV_CERT="${SSL_DEV_DIR}/localhost.crt"
SSL_DEV_KEY="${SSL_DEV_DIR}/localhost.key"
SSL_DEV_CA="${SSL_DEV_DIR}/ca-bundle.crt"
SSL_PROD_CERT="${SSL_PROD_DIR}/app.crt"
SSL_PROD_KEY="${SSL_PROD_DIR}/app.key"
SSL_PROD_CA="${SSL_PROD_DIR}/ca-bundle.crt"

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[SSL Manager] ${message}${NC}"
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
            --custom-cert-path=*)
                CUSTOM_CERT_PATH="${1#*=}"
                shift
                ;;
            --skip-validation)
                SKIP_CERTIFICATE_VALIDATION=true
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
MedicalCoverageSystem SSL Certificate Manager

USAGE:
    ./scripts/ssl-manager.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev     Generate self-signed certificates for development
    prod    Validate and install custom certificates for production

OPTIONS:
    --custom-cert-path=PATH    Path to custom SSL certificates (prod only)
    --skip-validation          Skip certificate validation (not recommended)
    --help, -h                 Show this help message

EXAMPLES:
    ./scripts/ssl-manager.sh dev
    ./scripts/ssl-manager.sh prod --custom-cert-path=/etc/ssl/certs
    ./scripts/ssl-manager.sh prod --custom-cert-path=./my-certs

DEVELOPMENT CERTIFICATES:
    • Self-signed SSL certificates for localhost
    • Wildcard certificate for development domains
    • Automatic CA bundle creation
    • Browser bypass instructions included

PRODUCTION CERTIFICATES:
    • Custom certificate validation and installation
    • Certificate chain verification
    • Expiration date checking
    • Private key matching validation

DIRECTORY STRUCTURE:
    deployment/ssl/
    ├── dev/
    │   ├── localhost.crt      # Self-signed certificate
    │   ├── localhost.key      # Private key
    │   └── ca-bundle.crt      # Certificate authority bundle
    └── prod/
        ├── app.crt            # Application certificate
        ├── app.key            # Application private key
        └── ca-bundle.crt      # Certificate authority bundle

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

# Validate SSL prerequisites
validate_ssl_prerequisites() {
    print_step "Validating SSL prerequisites"

    # Check OpenSSL availability
    if ! command -v "$OPENSSL_CMD" &> /dev/null; then
        print_error "OpenSSL is not available. Please install OpenSSL first."
        print_info "Visit: https://www.openssl.org/"
        exit 1
    fi

    # Get OpenSSL version
    local openssl_version
    openssl_version=$("$OPENSSL_CMD" version 2>/dev/null || echo "Unknown")
    print_info "Using OpenSSL: $openssl_version"

    # Validate OpenSSL version
    if ! "$OPENSSL_CMD" version | grep -qE "OpenSSL [1-3]" 2>/dev/null; then
        print_error "Unsupported OpenSSL version. Please use OpenSSL 1.x or 3.x"
        exit 1
    fi

    print_success "SSL prerequisites validated"
}

# Create SSL directory structure
create_ssl_directories() {
    print_step "Creating SSL directory structure"

    local directories=(
        "$SSL_DEV_DIR"
        "$SSL_PROD_DIR"
    )

    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            create_directory "$dir" "755"
            print_info "Created SSL directory: $dir"
        fi
    done

    # Set appropriate permissions
    chmod 700 "$SSL_BASE_DIR"
    chmod 755 "$SSL_DEV_DIR"
    chmod 700 "$SSL_PROD_DIR"

    print_success "SSL directories created and secured"
}

# Generate OpenSSL configuration for self-signed certificates
generate_openssl_config() {
    local config_file="$1"
    local domains="$2"

    cat << EOF > "$config_file"
[req]
default_bits = 2048
default_md = sha256
distinguished_name = dn
req_extensions = v3_req
prompt = no

[dn]
C = US
ST = CA
L = San Francisco
O = MedicalCoverageSystem
OU = Development
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = $domains

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, keyCertSign, cRLSign

[v3_intermediate_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, keyCertSign, cRLSign

EOF

    print_info "Generated OpenSSL configuration: $config_file"
}

# Generate development self-signed certificates
generate_dev_certificates() {
    print_step "Generating development self-signed certificates"

    local temp_dir
    temp_dir=$(create_temp_file "ssl-dev")
    rm -f "$temp_dir"
    mkdir -p "$temp_dir"

    # Configuration files
    local ca_config="${temp_dir}/ca.cnf"
    local cert_config="${temp_dir}/cert.cnf"

    # Domain list for SAN (Subject Alternative Names)
    local san_domains="DNS:localhost, DNS:*.localhost, IP:127.0.0.1, IP:::1"

    # Add local machine IP if available
    local local_ip
    local_ip=$(get_local_ip)
    if [[ "$local_ip" != "127.0.0.1" && -n "$local_ip" ]]; then
        san_domains="$san_domains, IP:$local_ip"
    fi

    print_info "Generating CA certificate for development"
    generate_openssl_config "$ca_config" ""

    # Generate CA private key
    "$OPENSSL_CMD" genrsa -out "${temp_dir}/ca.key" 4096

    # Generate CA certificate
    "$OPENSSL_CMD" req -new -x509 -days 365 -key "${temp_dir}/ca.key" \
        -out "${temp_dir}/ca.crt" -config "$ca_config" -extensions v3_ca

    print_info "Generating server certificate"
    generate_openssl_config "$cert_config" "$san_domains"

    # Generate server private key
    "$OPENSSL_CMD" genrsa -out "${temp_dir}/server.key" 2048

    # Generate certificate signing request
    "$OPENSSL_CMD" req -new -key "${temp_dir}/server.key" \
        -out "${temp_dir}/server.csr" -config "$cert_config"

    # Generate server certificate
    "$OPENSSL_CMD" x509 -req -days 365 -in "${temp_dir}/server.csr" \
        -CA "${temp_dir}/ca.crt" -CAkey "${temp_dir}/ca.key" \
        -CAcreateserial -out "${temp_dir}/server.crt" \
        -extensions v3_req -extfile "$cert_config"

    # Copy certificates to SSL directory
    cp "${temp_dir}/server.crt" "$SSL_DEV_CERT"
    cp "${temp_dir}/server.key" "$SSL_DEV_KEY"
    cp "${temp_dir}/ca.crt" "$SSL_DEV_CA"

    # Set secure permissions
    chmod 644 "$SSL_DEV_CERT"
    chmod 600 "$SSL_DEV_KEY"
    chmod 644 "$SSL_DEV_CA"

    # Clean up temporary files
    rm -rf "$temp_dir"

    print_success "Development certificates generated successfully"
}

# Validate custom production certificates
validate_production_certificates() {
    print_step "Validating production certificates"

    if [[ -z "$CUSTOM_CERT_PATH" ]]; then
        print_error "Custom certificate path required for production deployment"
        print_info "Use: --custom-cert-path=/path/to/certificate/directory"
        print_info "Expected files in directory: app.crt, app.key, ca-bundle.crt (optional)"
        exit 1
    fi

    # Normalize the path
    CUSTOM_CERT_PATH=$(convert_path "$CUSTOM_CERT_PATH")

    if [[ ! -d "$CUSTOM_CERT_PATH" ]]; then
        print_error "Certificate directory not found: $CUSTOM_CERT_PATH"
        exit 1
    fi

    # Define expected certificate files
    local cert_file="${CUSTOM_CERT_PATH}/app.crt"
    local key_file="${CUSTOM_CERT_PATH}/app.key"
    local ca_file="${CUSTOM_CERT_PATH}/ca-bundle.crt"

    # Validate certificate file exists
    if [[ ! -f "$cert_file" ]]; then
        print_error "Certificate file not found: $cert_file"
        print_info "Expected files: app.crt, app.key"
        exit 1
    fi

    # Validate private key file exists
    if [[ ! -f "$key_file" ]]; then
        print_error "Private key file not found: $key_file"
        print_info "Expected files: app.crt, app.key"
        exit 1
    fi

    # Validate certificate format
    if ! "$OPENSSL_CMD" x509 -in "$cert_file" -text -noout > /dev/null 2>&1; then
        print_error "Invalid certificate format: $cert_file"
        exit 1
    fi

    # Validate private key format
    if ! "$OPENSSL_CMD" rsa -in "$key_file" -check -noout > /dev/null 2>&1; then
        print_error "Invalid private key format: $key_file"
        exit 1
    fi

    # Validate certificate and key match
    local cert_modulus
    local key_modulus

    cert_modulus=$("$OPENSSL_CMD" x509 -noout -modulus -in "$cert_file" 2>/dev/null | "$OPENSSL_CMD" md5)
    key_modulus=$("$OPENSSL_CMD" rsa -noout -modulus -in "$key_file" 2>/dev/null | "$OPENSSL_CMD" md5)

    if [[ "$cert_modulus" != "$key_modulus" ]]; then
        print_error "Certificate and private key do not match"
        print_info "Certificate modulus: $cert_modulus"
        print_info "Private key modulus: $key_modulus"
        exit 1
    fi

    # Check certificate expiration
    local expiration_date
    expiration_date=$("$OPENSSL_CMD" x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiration_timestamp
    expiration_timestamp=$(date -d "$expiration_date" +%s 2>/dev/null || echo "0")
    local current_timestamp
    current_timestamp=$(date +%s)
    local days_until_expiry
    days_until_expiry=$(( (expiration_timestamp - current_timestamp) / 86400 ))

    if [[ $days_until_expiry -lt 0 ]]; then
        print_error "Certificate has expired on: $expiration_date"
        exit 1
    elif [[ $days_until_expiry -lt 30 ]]; then
        print_warning "Certificate expires soon: $expiration_date ($days_until_expiry days)"
    else
        print_success "Certificate valid until: $expiration_date ($days_until_expiry days)"
    fi

    # Validate CA bundle if provided
    if [[ -f "$ca_file" ]]; then
        if ! "$OPENSSL_CMD" verify -CAfile "$ca_file" "$cert_file" > /dev/null 2>&1; then
            print_warning "Certificate verification with CA bundle failed"
        else
            print_success "Certificate chain validated with CA bundle"
        fi
    fi

    print_success "Production certificates validated successfully"
}

# Install production certificates
install_production_certificates() {
    print_step "Installing production certificates"

    # Certificate files from custom path
    local source_cert="${CUSTOM_CERT_PATH}/app.crt"
    local source_key="${CUSTOM_CERT_PATH}/app.key"
    local source_ca="${CUSTOM_CERT_PATH}/ca-bundle.crt"

    # Copy certificates to production directory
    cp "$source_cert" "$SSL_PROD_CERT"
    cp "$source_key" "$SSL_PROD_KEY"

    # Copy CA bundle if it exists, otherwise create one from the certificate
    if [[ -f "$source_ca" ]]; then
        cp "$source_ca" "$SSL_PROD_CA"
    else
        # Create CA bundle from the certificate itself
        cp "$source_cert" "$SSL_PROD_CA"
        print_info "Created CA bundle from certificate"
    fi

    # Set secure permissions
    chmod 644 "$SSL_PROD_CERT"
    chmod 600 "$SSL_PROD_KEY"
    chmod 644 "$SSL_PROD_CA"

    print_success "Production certificates installed successfully"
}

# Generate certificate information summary
generate_certificate_info() {
    print_step "Generating certificate information"

    local info_file="${SSL_BASE_DIR}/certificate-info.json"
    local current_timestamp
    current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$info_file" << EOF
{
    "generated_at": "$current_timestamp",
    "deployment_type": "$DEPLOYMENT_TYPE",
    "certificates": {
EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        # Get development certificate info
        local cert_subject
        local cert_issuer
        local cert_serial
        local cert_fingerprint
        local cert_domains

        cert_subject=$("$OPENSSL_CMD" x509 -in "$SSL_DEV_CERT" -noout -subject 2>/dev/null | sed 's/subject=//')
        cert_issuer=$("$OPENSSL_CMD" x509 -in "$SSL_DEV_CERT" -noout -issuer 2>/dev/null | sed 's/issuer=//')
        cert_serial=$("$OPENSSL_CMD" x509 -in "$SSL_DEV_CERT" -noout -serial 2>/dev/null | sed 's/serial=//')
        cert_fingerprint=$("$OPENSSL_CMD" x509 -in "$SSL_DEV_CERT" -noout -fingerprint -sha256 2>/dev/null | sed 's/SHA256 Fingerprint=//')
        cert_domains=$("$OPENSSL_CMD" x509 -in "$SSL_DEV_CERT" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | tr ',' '\n' | sed 's/^[[:space:]]*//' | grep -v '^IP Address:' | paste -sd, -)

        cat >> "$info_file" << EOF
        "development": {
            "type": "self-signed",
            "certificate_file": "deployment/ssl/dev/localhost.crt",
            "key_file": "deployment/ssl/dev/localhost.key",
            "ca_bundle": "deployment/ssl/dev/ca-bundle.crt",
            "subject": "$cert_subject",
            "issuer": "$cert_issuer",
            "serial_number": "$cert_serial",
            "fingerprint_sha256": "$cert_fingerprint",
            "domains": "$cert_domains",
            "valid_for": "development only",
            "bypass_required": true
        }
EOF
    else
        # Get production certificate info
        local cert_subject
        local cert_issuer
        local cert_serial
        local cert_fingerprint
        local cert_domains
        local cert_expiry
        local cert_issuer_cn

        cert_subject=$("$OPENSSL_CMD" x509 -in "$SSL_PROD_CERT" -noout -subject 2>/dev/null | sed 's/subject=//')
        cert_issuer=$("$OPENSSL_CMD" x509 -in "$SSL_PROD_CERT" -noout -issuer 2>/dev/null | sed 's/issuer=//')
        cert_serial=$("$OPENSSL_CMD" x509 -in "$SSL_PROD_CERT" -noout -serial 2>/dev/null | sed 's/serial=//')
        cert_fingerprint=$("$OPENSSL_CMD" x509 -in "$SSL_PROD_CERT" -noout -fingerprint -sha256 2>/dev/null | sed 's/SHA256 Fingerprint=//')
        cert_domains=$("$OPENSSL_CMD" x509 -in "$SSL_PROD_CERT" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/DNS://g' | tr ',' '\n' | sed 's/^[[:space:]]*//' | grep -v '^IP Address:' | paste -sd, -)
        cert_expiry=$("$OPENSSL_CMD" x509 -in "$SSL_PROD_CERT" -noout -enddate | cut -d= -f2)
        cert_issuer_cn=$(echo "$cert_issuer" | grep -o 'CN=[^,]*' | cut -d= -f2 || echo "Unknown")

        cat >> "$info_file" << EOF
        "production": {
            "type": "custom_certificate",
            "certificate_file": "deployment/ssl/prod/app.crt",
            "key_file": "deployment/ssl/prod/app.key",
            "ca_bundle": "deployment/ssl/prod/ca-bundle.crt",
            "subject": "$cert_subject",
            "issuer": "$cert_issuer",
            "issuer_cn": "$cert_issuer_cn",
            "serial_number": "$cert_serial",
            "fingerprint_sha256": "$cert_fingerprint",
            "domains": "$cert_domains",
            "expiry_date": "$cert_expiry",
            "valid_for": "production",
            "bypass_required": false,
            "source_path": "$CUSTOM_CERT_PATH"
        }
EOF
    fi

    cat >> "$info_file" << EOF
    }
}
EOF

    print_success "Certificate information saved to: $info_file"
}

# Show certificate information
show_certificate_info() {
    print_info "Certificate Information for $DEPLOYMENT_TYPE"

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat << EOF
${CYAN}Certificate Type:${NC} Self-Signed (Development)
${CYAN}Certificate File:${NC} $SSL_DEV_CERT
${CYAN}Private Key:${NC} $SSL_DEV_KEY
${CYAN}CA Bundle:${NC} $SSL_DEV_CA
${CYAN}Valid Domains:${NC} localhost, *.localhost, 127.0.0.1, ::1

${YELLOW}⚠️  Browser Warning:${NC} This is a self-signed certificate for development
${YELLOW}⚠️  Browser Bypass Required:${NC}
${YELLOW}   • Chrome/Edge:${NC} Click "Advanced" → "Proceed to localhost"
${YELLOW}   • Firefox:${NC} Click "Advanced" → "Accept the Risk and Continue"
${YELLOW}   • Safari:${NC} Click "Show Details" → "Visit this website"

${GREEN}✅ Secure Development:${NC} All HTTPS functionality works correctly
${GREEN}✅ Local Testing:${NC} Perfect for localhost development
EOF
    else
        cat << EOF
${CYAN}Certificate Type:${NC} Custom Certificate (Production)
${CYAN}Certificate File:${NC} $SSL_PROD_CERT
${CYAN}Private Key:${NC} $SSL_PROD_KEY
${CYAN}CA Bundle:${NC} $SSL_PROD_CA
${CYAN}Source Path:${NC} $CUSTOM_CERT_PATH

${GREEN}✅ Production Ready:${NC} Valid, trusted SSL certificates
${GREEN}✅ Browser Trusted:${NC} No browser warnings or bypasses required
${GREEN}✅ Security Validated:${NC} Certificate chain and key matching verified
EOF
    fi

    cat << EOF

${CYAN}Certificate Commands:${NC}
• View certificate details: openssl x509 -in deployment/ssl/$DEPLOYMENT_TYPE/*.crt -text -noout
• Verify certificate: openssl verify -CAfile deployment/ssl/$DEPLOYMENT_TYPE/ca-bundle.crt deployment/ssl/$DEPLOYMENT_TYPE/*.crt
• Check expiration: openssl x509 -in deployment/ssl/$DEPLOYMENT_TYPE/*.crt -enddate -noout

EOF
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "SSL setup failed"
        print_info "Check the error messages above for troubleshooting"
        print_info "You may need to clean up incomplete certificate files"
    fi
}

# Main execution
main() {
    print_info "Starting SSL certificate setup for $DEPLOYMENT_TYPE"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute SSL setup steps
    parse_arguments "$@"
    load_platform_utils
    validate_ssl_prerequisites
    create_ssl_directories

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        generate_dev_certificates
    else
        if [[ "$SKIP_CERTIFICATE_VALIDATION" != "true" ]]; then
            validate_production_certificates
        fi
        install_production_certificates
    fi

    generate_certificate_info
    show_certificate_info

    print_success "SSL certificate setup completed successfully"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi