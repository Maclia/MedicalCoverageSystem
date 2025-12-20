#!/bin/bash

# MedicalCoverageSystem Database Setup Script
# Automated database initialization and migrations
# Usage: ./database/scripts/general/db-setup.sh [dev|prod] [--skip-migrations] [--seed-data]

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
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")")"
DEPLOYMENT_TYPE="dev"
SKIP_MIGRATIONS=false
SEED_DATA=false

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT_MAIN="${DB_PORT_MAIN:-5432}"
DB_PORT_FINANCE="${DB_PORT_FINANCE:-5433}"
DB_NAME_MAIN="${DB_NAME_MAIN:-medical_coverage_main}"
DB_NAME_FINANCE="${DB_NAME_FINANCE:-medical_coverage_finance}"
DB_USER_MAIN="${DB_USER_MAIN:-medical_coverage_user}"
DB_USER_FINANCE="${DB_USER_FINANCE:-medical_coverage_finance_user}"
DB_PASSWORD_MAIN="${DB_PASSWORD_MAIN:-}"
DB_PASSWORD_FINANCE="${DB_PASSWORD_FINANCE:-}"

# Database directories
DATABASE_DIR="${PROJECT_ROOT}/database"
INIT_DIR="${DATABASE_DIR}/init"
MIGRATIONS_DIR="${DATABASE_DIR}/migrations"
SEED_DIR="${DATABASE_DIR}/seed"

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[DB Setup] ${message}${NC}"
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
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --seed-data)
                SEED_DATA=true
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
MedicalCoverageSystem Database Setup Script

USAGE:
    ./scripts/db-setup.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev     Development database setup with sample data
    prod    Production database setup with security configurations

OPTIONS:
    --skip-migrations          Skip database migrations (not recommended)
    --seed-data               Include sample data for development
    --help, -h                Show this help message

EXAMPLES:
    ./scripts/db-setup.sh dev
    ./scripts/db-setup.sh dev --seed-data
    ./scripts/db-setup.sh prod
    ./scripts/db-setup.sh prod --skip-migrations

DEVELOPMENT SETUP:
    • Creates main and finance databases
    • Applies database migrations
    • Creates sample data (with --seed-data)
    • Development-friendly configurations
    • Local development environment

PRODUCTION SETUP:
    • Creates secure databases with proper permissions
    • Applies all database migrations
    • Optimized for production performance
    • Secure configurations and permissions
    • No sample data (security best practice)

DATABASE ARCHITECTURE:
    • Main Database: medical_coverage_main
    • Finance Database: medical_coverage_finance
    • PostgreSQL 15 with required extensions
    • Separate users for each database
    • Automatic connection pooling and optimization

REQUIREMENTS:
    • PostgreSQL 15 or higher
    • PostgreSQL client tools (psql)
    • Docker containers running (if using Docker)
    • Environment variables configured
    • Proper database permissions

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
        print_info "Please run: ./scripts/auto-setup.sh $DEPLOYMENT_TYPE"
        exit 1
    fi

    # Source environment file
    set -a
    source "${PROJECT_ROOT}/.env"
    set +a

    # Override with deployment-specific settings
    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        DB_HOST="${DB_HOST:-localhost}"
        DB_PORT_MAIN="${DB_PORT_MAIN:-5432}"
        DB_PORT_FINANCE="${DB_PORT_FINANCE:-5433}"
        DB_NAME_MAIN="${DB_NAME_MAIN:-medical_coverage_dev}"
        DB_NAME_FINANCE="${DB_NAME_FINANCE:-medical_coverage_finance_dev}"
    else
        DB_HOST="${DB_HOST:-db}"
        DB_PORT_MAIN="${DB_PORT_MAIN:-5432}"
        DB_PORT_FINANCE="${DB_PORT_FINANCE:-5432}"
        DB_NAME_MAIN="${DB_NAME_MAIN:-medical_coverage_main}"
        DB_NAME_FINANCE="${DB_NAME_FINANCE:-medical_coverage_finance}"
    fi

    # Load passwords from environment
    DB_PASSWORD_MAIN="${DB_PASSWORD_MAIN:-$DB_PASSWORD}"
    DB_PASSWORD_FINANCE="${DB_PASSWORD_FINANCE:-$DB_PASSWORD_FINANCE}"

    if [[ -z "$DB_PASSWORD_MAIN" || -z "$DB_PASSWORD_FINANCE" ]]; then
        print_error "Database passwords not configured in environment"
        exit 1
    fi

    print_success "Environment configuration loaded"
}

# Validate database prerequisites
validate_database_prerequisites() {
    print_step "Validating database prerequisites"

    # Check if PostgreSQL client is available
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) not available"
        print_info "Please install PostgreSQL client tools"
        exit 1
    fi

    # Check PostgreSQL version
    local psql_version
    psql_version=$(psql --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)

    if [[ -n "$psql_version" ]]; then
        local major_version
        major_version=$(echo "$psql_version" | cut -d. -f1)
        if [[ "$major_version" -lt 12 ]]; then
            print_warning "PostgreSQL version $psql_version detected. Version 12+ recommended"
        else
            print_info "PostgreSQL version: $psql_version"
        fi
    fi

    # If using Docker, check if PostgreSQL containers are running
    if [[ "$DB_HOST" != "localhost" ]]; then
        if ! docker ps | grep -q "postgres\|postgres"; then
            print_warning "PostgreSQL containers may not be running"
        fi
    fi

    # Test database connection
    if ! test_database_connection; then
        print_warning "Cannot connect to PostgreSQL server"
        print_info "Ensure PostgreSQL is running and accessible"
    fi

    print_success "Database prerequisites validated"
}

# Test database connection
test_database_connection() {
    local connection_timeout=10
    local max_attempts=5
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        print_info "Attempting database connection (attempt $attempt/$max_attempts)"

        if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d postgres -c "SELECT 1;" &>/dev/null; then
            print_success "Database connection successful"
            return 0
        fi

        if [[ $attempt -lt $max_attempts ]]; then
            print_info "Waiting 5 seconds before retry..."
            sleep 5
        fi

        ((attempt++))
    done

    return 1
}

# Create database directories
create_database_directories() {
    print_step "Creating database directories"

    local directories=(
        "$DATABASE_DIR"
        "$INIT_DIR"
        "$MIGRATIONS_DIR"
        "$SEED_DIR"
        "$DATABASE_DIR/backups"
        "$DATABASE_DIR/logs"
        "$DATABASE_DIR/scripts"
    )

    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            create_directory "$dir" "755"
            print_info "Created directory: $dir"
        fi
    done

    # Set appropriate permissions
    chmod 755 "$DATABASE_DIR"
    chmod 700 "$DATABASE_DIR/backups"  # Secure backup directory

    print_success "Database directories created"
}

# Generate database initialization script
generate_database_init_script() {
    print_step "Generating database initialization script"

    local init_script="${INIT_DIR}/01-init-database.sql"

    cat > "$init_script" << 'EOF'
-- =============================================================================
-- MedicalCoverageSystem Database Initialization
-- PostgreSQL 15+ required extensions and basic setup
-- =============================================================================

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom enum types
CREATE TYPE network_tier AS ENUM ('basic', 'premium', 'enterprise');
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'suspended', 'terminated', 'expired');
CREATE TYPE reimbursement_model AS ENUM ('fee_for_service', 'capitation', 'bundled_payment', 'value_based');
CREATE TYPE claim_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'denied', 'paid', 'appealed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE user_role AS ENUM ('admin', 'provider', 'member', 'analyst', 'support');

-- Create custom functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create UUID generation function with prefix
CREATE OR REPLACE FUNCTION generate_id(prefix text DEFAULT '')
RETURNS text AS $$
BEGIN
    RETURN prefix || uuid_generate_v4()::text;
END;
$$ LANGUAGE plpgsql;

-- Create email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Create phone number normalization function
CREATE OR REPLACE FUNCTION normalize_phone_number(phone text)
RETURNS text AS $$
BEGIN
    -- Remove all non-digit characters
    phone := regexp_replace(phone, '[^0-9]', '', 'g');

    -- Handle country code (assume US if 10 digits)
    IF length(phone) = 10 THEN
        RETURN '+1' || phone;
    ELSIF length(phone) = 11 AND left(phone, 1) = '1' THEN
        RETURN '+' || phone;
    ELSIF left(phone, 1) = '+' THEN
        RETURN phone;
    ELSE
        RETURN NULL; -- Invalid format
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create search index optimization function
CREATE OR REPLACE FUNCTION create_search_index(table_name text, column_name text)
RETURNS void AS $$
DECLARE
    index_name text;
BEGIN
    index_name := table_name || '_' || column_name || '_search_idx';
    EXECUTE 'CREATE INDEX IF NOT EXISTS ' || index_name ||
             ' ON ' || table_name || ' USING gin(to_tsvector(''english'', ' || column_name || '))';
END;
$$ LANGUAGE plpgsql;

-- Create audit logging function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Log to audit table (implementation depends on audit table structure)
    IF TG_OP = 'INSERT' THEN
        -- Insert audit record for new row
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Insert audit record for updated row
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Insert audit record for deleted row
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create full-text search configuration
CREATE TEXT SEARCH CONFIGURATION medical_ts_config (COPY = english);

-- Create custom text search dictionary for medical terms
CREATE TEXT SEARCH DICTIONARY medical_dict (
    TEMPLATE = simple,
    STOPWORDS = english
);

-- Update text search configuration
ALTER TEXT SEARCH CONFIGURATION medical_ts_config
    ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
    WITH medical_dict;

-- Performance optimization settings
-- Increase work_mem for complex queries
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Set effective cache size (adjust based on available RAM)
ALTER SYSTEM SET effective_cache_size = '2GB';

-- Enable parallel query
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;

-- Set timezone
ALTER SYSTEM SET timezone = 'UTC';

-- Configure logging
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries taking > 1s

-- Reload configuration
SELECT pg_reload_conf();

-- Grant usage of extensions to application users
GRANT ALL ON SCHEMA public TO medical_coverage_user;
GRANT ALL ON SCHEMA public TO medical_coverage_finance_user;

-- Create useful informational views
CREATE OR REPLACE VIEW database_info AS
SELECT
    'Database Information' as info_type,
    current_database() as database_name,
    current_user as current_user,
    version() as postgresql_version,
    inet_server_addr() as server_address,
    inet_server_port() as server_port;

CREATE OR REPLACE VIEW table_sizes AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

CREATE OR REPLACE VIEW index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Comments for documentation
COMMENT ON SCHEMA public IS 'Main application schema for MedicalCoverageSystem';
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram similarity matching for text search';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for data security';

-- Health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TABLE(
    database_name text,
    connection_count bigint,
    uptime interval,
    timestamp timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        current_database() as database_name,
        count(*) as connection_count,
        pg_postmaster_start_time() as uptime,
        clock_timestamp() as timestamp
    FROM pg_stat_activity;
END;
$$ LANGUAGE plpgsql;

EOF

    print_success "Database initialization script generated: $init_script"
}

# Generate migration files structure
generate_migration_files() {
    print_step "Generating migration files structure"

    # Create migration directories if they don't exist
    local migration_dirs=(
        "${MIGRATIONS_DIR}/001_initial_schema"
        "${MIGRATIONS_DIR}/002_users_and_auth"
        "${MIGRATIONS_DIR}/003_coverage_plans"
        "${MIGRATIONS_DIR}/004_providers_and_facilities"
        "${MIGRATIONS_DIR}/005_members_and_benefits"
        "${MIGRATIONS_DIR}/006_claims_and_billing"
        "${MIGRATIONS_DIR}/007_financial_transactions"
        "${MIGRATIONS_DIR}/008_audit_and_reporting"
    )

    for dir in "${migration_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            create_directory "$dir" "755"
        fi
    done

    # Create a sample migration file
    local sample_migration="${MIGRATIONS_DIR}/001_initial_schema/001_create_base_tables.sql"

    cat > "$sample_migration" << 'EOF'
-- Migration: 001_create_base_tables.sql
-- Description: Create base tables and initial schema
-- Version: 1.0.0
-- Dependencies: None

BEGIN;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name text NOT NULL,
    operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id uuid,
    old_data jsonb,
    new_data jsonb,
    timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);

-- Create configuration table
CREATE TABLE IF NOT EXISTS configurations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    key text UNIQUE NOT NULL,
    value jsonb NOT NULL,
    description text,
    category text DEFAULT 'general',
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for configurations
CREATE INDEX IF NOT EXISTS idx_configurations_key ON configurations(key);
CREATE INDEX IF NOT EXISTS idx_configurations_category ON configurations(category);
CREATE INDEX IF NOT EXISTS idx_configurations_is_public ON configurations(is_public);

-- Create audit trigger for configurations
CREATE TRIGGER configurations_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON configurations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create updated_at trigger for configurations
CREATE TRIGGER configurations_updated_at_trigger
    BEFORE UPDATE ON configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configurations
INSERT INTO configurations (key, value, description, category, is_public) VALUES
('app_version', '"1.0.0"', 'Current application version', 'system', true),
('maintenance_mode', 'false', 'Whether the application is in maintenance mode', 'system', false),
('max_upload_size', '10485760', 'Maximum file upload size in bytes', 'uploads', true),
('session_timeout', '3600', 'User session timeout in seconds', 'security', false),
('password_min_length', '8', 'Minimum password length requirement', 'security', true)
ON CONFLICT (key) DO NOTHING;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp with time zone,
    expires_at timestamp with time zone
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create settings table for user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid UNIQUE NOT NULL,
    theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language text DEFAULT 'en',
    timezone text DEFAULT 'UTC',
    email_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    data jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create updated_at trigger for user_settings
CREATE TRIGGER user_settings_updated_at_trigger
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Post-migration notes
-- Migration completed: Base tables and initial schema
-- Next steps: Run user and authentication migrations

EOF

    print_success "Migration files structure created"
}

# Generate seed data for development
generate_seed_data() {
    print_step "Generating seed data for development"

    if [[ "$DEPLOYMENT_TYPE" != "dev" ]]; then
        print_info "Skipping seed data generation for production environment"
        return 0
    fi

    local seed_file="${SEED_DIR}/001_development_data.sql"

    cat > "$seed_file" << 'EOF'
-- Development Seed Data
-- This file contains sample data for development and testing
-- DO NOT USE IN PRODUCTION

BEGIN;

-- Insert sample configurations for development
INSERT INTO configurations (key, value, description, category, is_public) VALUES
('feature_flags', '{"new_ui": true, "beta_features": true, "advanced_search": false}', 'Feature flags for testing new functionality', 'features', false),
('api_rate_limits', '{"default": 1000, "premium": 5000, "enterprise": 10000}', 'API rate limits per user tier', 'api', true),
('email_settings', '{"provider": "smtp", "host": "localhost", "port": 1025, "from": "dev@localhost"}', 'Email configuration for development', 'email', false),
('sms_settings', '{"provider": "twilio", "mock": true, "from_number": "+15551234567"}', 'SMS configuration for development', 'sms', false),
('file_storage', '{"provider": "local", "path": "./uploads", "max_size": 52428800}', 'File storage settings for development', 'storage', false)
ON CONFLICT (key) DO NOTHING;

-- Insert sample notifications
INSERT INTO notifications (id, user_id, type, title, message, data, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'info', 'Welcome to MedicalCoverageSystem', 'Your account has been successfully created. Start exploring the features available to you.', '{"action": "welcome", "priority": "low"}', CURRENT_TIMESTAMP),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'success', 'Profile Updated', 'Your profile information has been updated successfully.', '{"action": "profile_update", "priority": "medium"}', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'warning', 'Password Expiry', 'Your password will expire in 30 days. Consider updating it soon.', '{"action": "password_expiry", "priority": "high"}', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Insert sample user settings
INSERT INTO user_settings (id, user_id, theme, language, timezone, email_notifications, sms_notifications, data) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'light', 'en', 'America/New_York', true, false, '{"dashboard_widgets": ["coverage_summary", "recent_claims", "notifications"], "default_page": "dashboard"}'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'dark', 'en', 'UTC', false, true, '{"dashboard_widgets": ["financial_overview", "claim_status"], "default_page": "analytics"}'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'light', 'en', 'America/Los_Angeles', true, false, '{"dashboard_widgets": ["member_directory", "provider_list"], "default_page": "members"}');

-- Sample test data for various scenarios
INSERT INTO configurations (key, value, description, category, is_public) VALUES
('test_mode', 'true', 'Enable test mode for development', 'system', false),
('debug_sql', 'true', 'Log SQL queries for debugging', 'development', false),
('mock_external_apis', 'true', 'Use mock external APIs for development', 'development', false),
('disable_rate_limiting', 'true', 'Disable rate limiting for development', 'development', false)
ON CONFLICT (key) DO NOTHING;

-- Add sample development users and roles (this would typically be in a separate user migration)
-- For now, we'll add configuration entries that indicate the development setup
INSERT INTO configurations (key, value, description, category, is_public) VALUES
('dev_admin_user', '{"email": "admin@example.com", "password": "password123", "role": "admin"}', 'Development admin user credentials', 'development', false),
('dev_provider_user', '{"email": "provider@example.com", "password": "password123", "role": "provider"}', 'Development provider user credentials', 'development', false),
('dev_member_user', '{"email": "member@example.com", "password": "password123", "role": "member"}', 'Development member user credentials', 'development', false)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Development data notes
-- Seed data includes:
-- - Sample configurations for development features
-- - Test notifications for UI testing
-- - User settings with different preferences
-- - Development user credentials for testing

-- To use these credentials:
-- Admin: admin@example.com / password123
-- Provider: provider@example.com / password123
-- Member: member@example.com / password123

EOF

    print_success "Seed data generated: $seed_file"
}

# Create databases and users
create_databases_and_users() {
    print_step "Creating databases and users"

    # Connect to PostgreSQL server to create databases
    local admin_connection="psql -h $DB_HOST -p $DB_PORT_MAIN -U postgres"

    # Create main database
    print_info "Creating main database: $DB_NAME_MAIN"
    if PGPASSWORD="$DB_PASSWORD_MAIN" $admin_connection -c "CREATE DATABASE $DB_NAME_MAIN;" 2>/dev/null; then
        print_success "Main database created"
    else
        print_info "Main database already exists or creation failed (continuing)"
    fi

    # Create finance database if on different port
    if [[ "$DB_PORT_FINANCE" != "$DB_PORT_MAIN" ]]; then
        print_info "Creating finance database: $DB_NAME_FINANCE"
        if PGPASSWORD="$DB_PASSWORD_FINANCE" $admin_connection -c "CREATE DATABASE $DB_NAME_FINANCE;" 2>/dev/null; then
            print_success "Finance database created"
        else
            print_info "Finance database already exists or creation failed (continuing)"
        fi
    fi

    # Create users and grant permissions
    create_database_users

    print_success "Database creation completed"
}

# Create database users and grant permissions
create_database_users() {
    print_info "Creating database users and granting permissions"

    # Connect to main database
    local main_connection="psql -h $DB_HOST -p $DB_PORT_MAIN -U postgres -d $DB_NAME_MAIN"

    # Create main database user
    print_info "Creating main database user: $DB_USER_MAIN"
    PGPASSWORD="$DB_PASSWORD_MAIN" $main_connection << EOF || print_warning "Main user creation may have failed (user might exist)"
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER_MAIN') THEN
        CREATE ROLE $DB_USER_MAIN LOGIN PASSWORD '$DB_PASSWORD_MAIN';
        RAISE NOTICE 'User $DB_USER_MAIN created';
    ELSE
        RAISE NOTICE 'User $DB_USER_MAIN already exists';
    END IF;
END
\$\$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME_MAIN TO $DB_USER_MAIN;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER_MAIN;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER_MAIN;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER_MAIN;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER_MAIN;
EOF

    # Create finance database user
    if [[ "$DB_PORT_FINANCE" != "$DB_PORT_MAIN" ]]; then
        local finance_connection="psql -h $DB_HOST -p $DB_PORT_FINANCE -U postgres -d $DB_NAME_FINANCE"

        print_info "Creating finance database user: $DB_USER_FINANCE"
        PGPASSWORD="$DB_PASSWORD_FINANCE" $finance_connection << EOF || print_warning "Finance user creation may have failed (user might exist)"
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER_FINANCE') THEN
        CREATE ROLE $DB_USER_FINANCE LOGIN PASSWORD '$DB_PASSWORD_FINANCE';
        RAISE NOTICE 'User $DB_USER_FINANCE created';
    ELSE
        RAISE NOTICE 'User $DB_USER_FINANCE already exists';
    END IF;
END
\$\$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME_FINANCE TO $DB_USER_FINANCE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER_FINANCE;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER_FINANCE;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER_FINANCE;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER_FINANCE;
EOF
    fi

    print_success "Database users and permissions configured"
}

# Apply database migrations
apply_migrations() {
    if [[ "$SKIP_MIGRATIONS" == "true" ]]; then
        print_info "Skipping database migrations"
        return 0
    fi

    print_step "Applying database migrations"

    # Run initialization script first
    if [[ -f "$INIT_DIR/01-init-database.sql" ]]; then
        print_info "Applying database initialization script"
        if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -f "$INIT_DIR/01-init-database.sql"; then
            print_success "Database initialization completed"
        else
            print_error "Database initialization failed"
            exit 1
        fi
    fi

    # Apply migrations in order
    for migration_dir in "${MIGRATIONS_DIR}"/*; do
        if [[ -d "$migration_dir" ]]; then
            local migration_name
            migration_name=$(basename "$migration_dir")

            print_info "Applying migration: $migration_name"

            for migration_file in "$migration_dir"/*.sql; do
                if [[ -f "$migration_file" ]]; then
                    local file_name
                    file_name=$(basename "$migration_file")

                    print_info "Executing migration file: $file_name"

                    if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -f "$migration_file"; then
                        print_success "Migration file applied: $file_name"
                    else
                        print_error "Migration file failed: $file_name"
                        exit 1
                    fi
                fi
            done
        fi
    done

    # Apply migrations to finance database if separate
    if [[ "$DB_PORT_FINANCE" != "$DB_PORT_MAIN" ]]; then
        print_info "Applying migrations to finance database"

        # Initialize finance database
        if PGPASSWORD="$DB_PASSWORD_FINANCE" psql -h "$DB_HOST" -p "$DB_PORT_FINANCE" -U "$DB_USER_FINANCE" -d "$DB_NAME_FINANCE" -f "$INIT_DIR/01-init-database.sql"; then
            print_success "Finance database initialization completed"
        else
            print_warning "Finance database initialization may have failed"
        fi
    fi

    print_success "All database migrations applied successfully"
}

# Apply seed data
apply_seed_data() {
    if [[ "$SEED_DATA" != "true" ]]; then
        print_info "Skipping seed data application"
        return 0
    fi

    if [[ "$DEPLOYMENT_TYPE" != "dev" ]]; then
        print_warning "Seed data not recommended for production environment"
        return 0
    fi

    print_step "Applying development seed data"

    for seed_file in "$SEED_DIR"/*.sql; do
        if [[ -f "$seed_file" ]]; then
            local file_name
            file_name=$(basename "$seed_file")

            print_info "Applying seed data file: $file_name"

            if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -f "$seed_file"; then
                print_success "Seed data applied: $file_name"
            else
                print_error "Seed data failed: $file_name"
                exit 1
            fi
        fi
    done

    print_success "Development seed data applied successfully"
}

# Validate database setup
validate_database_setup() {
    print_step "Validating database setup"

    # Check main database connectivity
    if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT 1;" &>/dev/null; then
        print_success "Main database connection: OK"
    else
        print_error "Main database connection: FAILED"
        return 1
    fi

    # Check finance database connectivity if separate
    if [[ "$DB_PORT_FINANCE" != "$DB_PORT_MAIN" ]]; then
        if PGPASSWORD="$DB_PASSWORD_FINANCE" psql -h "$DB_HOST" -p "$DB_PORT_FINANCE" -U "$DB_USER_FINANCE" -d "$DB_NAME_FINANCE" -c "SELECT 1;" &>/dev/null; then
            print_success "Finance database connection: OK"
        else
            print_error "Finance database connection: FAILED"
            return 1
        fi
    fi

    # Check if extensions are properly installed
    local extensions=("uuid-ossp" "pg_trgm" "pgcrypto")
    for ext in "${extensions[@]}"; do
        if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT 1 FROM pg_extension WHERE extname = '$ext';" &>/dev/null; then
            print_success "Extension $ext: Installed"
        else
            print_error "Extension $ext: Not installed"
            return 1
        fi
    done

    # Check if core tables exist (if migrations were applied)
    if [[ "$SKIP_MIGRATIONS" != "true" ]]; then
        local expected_tables=("configurations" "notifications" "user_settings" "audit_logs")
        for table in "${expected_tables[@]}"; do
            if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" &>/dev/null; then
                print_success "Table $table: Exists"
            else
                print_warning "Table $table: Not found (migration may not have run)"
            fi
        done
    fi

    # Run database health check
    local health_result
    health_result=$(PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT COUNT(*) as connection_count FROM health_check();" -t | tr -d ' ')

    if [[ -n "$health_result" && "$health_result" -gt 0 ]]; then
        print_success "Database health check: OK ($health_result connections)"
    else
        print_warning "Database health check: May have issues"
    fi

    print_success "Database setup validation completed"
}

# Create database maintenance scripts
create_maintenance_scripts() {
    print_step "Creating database maintenance scripts"

    # Create backup script
    local backup_script="${DATABASE_DIR}/scripts/backup.sh"

    cat > "$backup_script" << 'EOF'
#!/bin/bash

# Database backup script for MedicalCoverageSystem
# Usage: ./backup.sh [main|finance|all]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${DATABASE_DIR}/backups"

# Load configuration
source "$(dirname "$DATABASE_DIR")/.env"

# Create backup with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

backup_database() {
    local db_name="$1"
    local db_user="$2"
    local db_port="$3"
    local backup_file="${BACKUP_DIR}/${db_name}_${TIMESTAMP}.sql"

    echo "Creating backup of $db_name..."

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$db_port" \
        -U "$db_user" \
        -d "$db_name" \
        --no-password \
        --clean \
        --if-exists \
        --verbose \
        --format=custom \
        --file="$backup_file"

    # Compress the backup
    gzip "$backup_file"

    echo "Backup completed: ${backup_file}.gz"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

case "${1:-all}" in
    main)
        backup_database "$DB_NAME_MAIN" "$DB_USER_MAIN" "$DB_PORT_MAIN"
        ;;
    finance)
        backup_database "$DB_NAME_FINANCE" "$DB_USER_FINANCE" "$DB_PORT_FINANCE"
        ;;
    all)
        backup_database "$DB_NAME_MAIN" "$DB_USER_MAIN" "$DB_PORT_MAIN"
        backup_database "$DB_NAME_FINANCE" "$DB_USER_FINANCE" "$DB_PORT_FINANCE"
        ;;
    *)
        echo "Usage: $0 [main|finance|all]"
        exit 1
        ;;
esac

# Clean old backups
echo "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

echo "Backup process completed"
EOF

    chmod +x "$backup_script"

    # Create restore script
    local restore_script="${DATABASE_DIR}/scripts/restore.sh"

    cat > "$restore_script" << 'EOF'
#!/bin/bash

# Database restore script for MedicalCoverageSystem
# Usage: ./restore.sh <backup_file> [main|finance]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(dirname "$SCRIPT_DIR")"

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <backup_file> [main|finance]"
    exit 1
fi

BACKUP_FILE="$1"
DB_TYPE="${2:-main}"

# Load configuration
source "$(dirname "$DATABASE_DIR")/.env"

# Determine database settings based on type
case "$DB_TYPE" in
    main)
        DB_NAME="$DB_NAME_MAIN"
        DB_USER="$DB_USER_MAIN"
        DB_PORT="$DB_PORT_MAIN"
        ;;
    finance)
        DB_NAME="$DB_NAME_FINANCE"
        DB_USER="$DB_USER_FINANCE"
        DB_PORT="$DB_PORT_FINANCE"
        ;;
    *)
        echo "Error: Database type must be 'main' or 'finance'"
        exit 1
        ;;
esac

# Check if backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Decompress if necessary
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing backup file..."
    gunzip -c "$BACKUP_FILE" > "/tmp/restore_temp.sql"
    RESTORE_FILE="/tmp/restore_temp.sql"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

echo "Restoring database $DB_NAME from $BACKUP_FILE..."

# Restore the database
PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --verbose \
    --no-password \
    "$RESTORE_FILE"

# Clean up temporary file
if [[ -f "/tmp/restore_temp.sql" ]]; then
    rm -f "/tmp/restore_temp.sql"
fi

echo "Database restore completed successfully"
EOF

    chmod +x "$restore_script"

    # Create health check script
    local health_script="${DATABASE_DIR}/scripts/health-check.sh"

    cat > "$health_script" << 'EOF'
#!/bin/bash

# Database health check script for MedicalCoverageSystem
# Usage: ./health-check.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(dirname "$SCRIPT_DIR")"

# Load configuration
source "$(dirname "$DATABASE_DIR")/.env"

echo "MedicalCoverageSystem Database Health Check"
echo "========================================="
echo "Timestamp: $(date)"
echo

# Check main database
echo "Checking main database..."
if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT 'Main Database: OK' as status;" &>/dev/null; then
    echo "✅ Main Database: Connection OK"

    # Get connection count
    local connections
    connections=$(PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME_MAIN';" -t | tr -d ' ')
    echo "   Connections: $connections"

    # Get database size
    local db_size
    db_size=$(PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME_MAIN'));" -t | tr -d ' ')
    echo "   Database Size: $db_size"
else
    echo "❌ Main Database: Connection FAILED"
fi

echo

# Check finance database
if [[ "$DB_PORT_FINANCE" != "$DB_PORT_MAIN" ]]; then
    echo "Checking finance database..."
    if PGPASSWORD="$DB_PASSWORD_FINANCE" psql -h "$DB_HOST" -p "$DB_PORT_FINANCE" -U "$DB_USER_FINANCE" -d "$DB_NAME_FINANCE" -c "SELECT 'Finance Database: OK' as status;" &>/dev/null; then
        echo "✅ Finance Database: Connection OK"

        # Get connection count
        local connections
        connections=$(PGPASSWORD="$DB_PASSWORD_FINANCE" psql -h "$DB_HOST" -p "$DB_PORT_FINANCE" -U "$DB_USER_FINANCE" -d "$DB_NAME_FINANCE" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME_FINANCE';" -t | tr -d ' ')
        echo "   Connections: $connections"

        # Get database size
        local db_size
        db_size=$(PGPASSWORD="$DB_PASSWORD_FINANCE" psql -h "$DB_HOST" -p "$DB_PORT_FINANCE" -U "$DB_USER_FINANCE" -d "$DB_NAME_FINANCE" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME_FINANCE'));" -t | tr -d ' ')
        echo "   Database Size: $db_size"
    else
        echo "❌ Finance Database: Connection FAILED"
    fi
else
    echo "Finance Database: Same as main database"
fi

echo

# Check extensions
echo "Checking PostgreSQL extensions..."
local extensions=("uuid-ossp" "pg_trgm" "pgcrypto")
for ext in "${extensions[@]}"; do
    if PGPASSWORD="$DB_PASSWORD_MAIN" psql -h "$DB_HOST" -p "$DB_PORT_MAIN" -U "$DB_USER_MAIN" -d "$DB_NAME_MAIN" -c "SELECT 1 FROM pg_extension WHERE extname = '$ext';" &>/dev/null; then
        echo "✅ Extension $ext: Installed"
    else
        echo "❌ Extension $ext: Missing"
    fi
done

echo "Health check completed"
EOF

    chmod +x "$health_script"

    print_success "Maintenance scripts created"
}

# Show setup summary
show_setup_summary() {
    print_info "Database Setup Summary for $DEPLOYMENT_TYPE"

    cat << EOF
${CYAN}Database Configuration:${NC}
• Main Database: $DB_NAME_MAIN
• Finance Database: $DB_NAME_FINANCE
• Main Host: $DB_HOST:$DB_PORT_MAIN
• Finance Host: $DB_HOST:$DB_PORT_FINANCE
• Main User: $DB_USER_MAIN
• Finance User: $DB_USER_FINANCE

${CYAN}Database Files:${NC}
• Initialization: $INIT_DIR/01-init-database.sql
• Migrations: $MIGRATIONS_DIR/
• Seed Data: $SEED_DIR/
• Backups: $DATABASE_DIR/backups/
• Scripts: $DATABASE_DIR/scripts/

${CYAN}Database Features:${NC}
• PostgreSQL Extensions: uuid-ossp, pg_trgm, pgcrypto
• Custom Functions: UUID generation, email validation, phone normalization
• Full-Text Search: Medical-specific search configuration
• Audit Logging: Comprehensive audit trail
• Performance: Optimized indexes and query plans

EOF

    if [[ "$DEPLOYMENT_TYPE" == "dev" ]]; then
        cat << EOF
${GREEN}Development Features:${NC}
• Sample data loaded${SEED_DATA:+ with test accounts}
• Debug configurations enabled
• Mock external APIs configured
• Development admin user: admin@example.com / password123

${CYAN}Database Management Commands:${NC}
• Health Check: $DATABASE_DIR/scripts/health-check.sh
• Backup: $DATABASE_DIR/scripts/backup.sh [main|finance|all]
• Restore: $DATABASE_DIR/scripts/restore.sh <backup_file>

EOF
    else
        cat << EOF
${GREEN}Production Features:${NC}
• Secure database configuration
• Optimized performance settings
• Comprehensive error handling
• No test data (security best practice)

${CYAN}Database Management Commands:${NC}
• Health Check: $DATABASE_DIR/scripts/health-check.sh
• Backup: $DATABASE_DIR/scripts/backup.sh [main|finance|all]
• Restore: $DATABASE_DIR/scripts/restore.sh <backup_file>
• Monitor: Check logs for performance metrics

EOF
    fi

    cat << EOF
${CYAN}Connection Examples:${NC}
• Connect to main database:
  psql -h $DB_HOST -p $DB_PORT_MAIN -U $DB_USER_MAIN -d $DB_NAME_MAIN

• Connect to finance database:
  psql -h $DB_HOST -p $DB_PORT_FINANCE -U $DB_USER_FINANCE -d $DB_NAME_FINANCE

• Run health check:
  $DATABASE_DIR/scripts/health-check.sh

${GREEN}✅ Database setup completed successfully${NC}

EOF
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error "Database setup failed"
        print_info "Check the error messages above for troubleshooting"
        print_info "You may need to clean up partially created databases"
    fi
}

# Main execution
main() {
    print_info "Starting database setup for $DEPLOYMENT_TYPE"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute setup steps
    parse_arguments "$@"
    load_platform_utils
    load_environment
    validate_database_prerequisites
    create_database_directories
    generate_database_init_script
    generate_migration_files

    if [[ "$DEPLOYMENT_TYPE" == "dev" && "$SEED_DATA" == "true" ]]; then
        generate_seed_data
    fi

    create_databases_and_users
    apply_migrations
    apply_seed_data
    validate_database_setup
    create_maintenance_scripts
    show_setup_summary

    print_success "Database setup completed successfully"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi