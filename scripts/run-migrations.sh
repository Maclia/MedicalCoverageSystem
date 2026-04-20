#!/bin/bash

# Database Migration Script for Medical Coverage System
# Safely applies pending database migrations with validation and rollback capability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${PROJECT_ROOT}/.backups/migrations"
LOG_FILE="${PROJECT_ROOT}/migration_${TIMESTAMP}.log"
MIGRATION_LOCK_FILE="/tmp/medical_coverage_migration.lock"
MIGRATION_TIMEOUT=300  # 5 minutes timeout

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Initialize log file
mkdir -p "$(dirname "$LOG_FILE")"
echo "Migration started at $(date)" > "$LOG_FILE"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm found: $(npm --version)"
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_warn "PostgreSQL client (psql) not found - skipping direct DB validation"
    else
        log_success "PostgreSQL client found"
    fi
    
    # Check drizzle-kit
    if ! npx drizzle-kit --version &> /dev/null; then
        log_error "drizzle-kit is not installed. Please run: npm install"
        exit 1
    fi
    log_success "drizzle-kit is installed"
}

# Check for concurrent migrations
prevent_concurrent_migrations() {
    log_info "Checking for concurrent migrations..."
    
    if [ -f "$MIGRATION_LOCK_FILE" ]; then
        LOCK_PID=$(cat "$MIGRATION_LOCK_FILE")
        if ps -p "$LOCK_PID" > /dev/null 2>&1; then
            log_error "Another migration is already running (PID: $LOCK_PID)"
            exit 1
        else
            log_warn "Stale lock file found, removing it"
            rm -f "$MIGRATION_LOCK_FILE"
        fi
    fi
    
    echo $$ > "$MIGRATION_LOCK_FILE"
    trap "rm -f '$MIGRATION_LOCK_FILE'" EXIT
    log_success "Lock acquired"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."
    
    # Check if .env file exists
    if [ ! -f "${PROJECT_ROOT}/services/finance-service/.env" ]; then
        log_error "Finance service .env file not found"
        exit 1
    fi
    log_success "Finance service .env found"
    
    # Check if drizzle.config.ts exists
    if [ ! -f "${PROJECT_ROOT}/drizzle.config.ts" ]; then
        log_error "drizzle.config.ts not found in project root"
        exit 1
    fi
    log_success "drizzle.config.ts found"
    
    # Check if schema exists
    if [ ! -f "${PROJECT_ROOT}/services/finance-service/src/models/schema.ts" ]; then
        log_error "Finance service schema not found"
        exit 1
    fi
    log_success "Finance service schema found"
    
    # Load environment variables
    set -a
    source "${PROJECT_ROOT}/services/finance-service/.env"
    set +a
    
    # Validate DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL is not set in .env file"
        exit 1
    fi
    log_success "DATABASE_URL is configured"
}

# Create backup before migration
create_backup() {
    log_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
    
    if command -v pg_dump &> /dev/null; then
        # Extract connection details from DATABASE_URL
        DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/postgresql:\/\/[^:]+:[^@]+@([^:]+).*/\1/')
        DB_NAME=$(echo "$DATABASE_URL" | sed -E 's/.*\/([^?]+).*/\1/')
        
        if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ]; then
            pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || {
                log_warn "Could not create backup (pg_dump may need authentication)"
            }
        fi
        
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            log_success "Database backup created: $BACKUP_FILE"
        else
            log_warn "Backup file empty or not created, continuing without backup"
        fi
    else
        log_warn "pg_dump not found, skipping backup"
    fi
}

# Run migrations
run_migrations() {
    log_info "Running Drizzle migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Run drizzle-kit push with timeout
    timeout $MIGRATION_TIMEOUT npx drizzle-kit push --config drizzle.config.ts 2>&1 | tee -a "$LOG_FILE"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Migrations completed successfully"
        return 0
    elif [ $exit_code -eq 124 ]; then
        log_error "Migration timed out after ${MIGRATION_TIMEOUT}s"
        return 1
    else
        log_error "Migration failed with exit code $exit_code"
        return 1
    fi
}

# Verify migrations
verify_migrations() {
    log_info "Verifying migrations..."
    
    if command -v psql &> /dev/null; then
        # Check if payment_recovery table exists
        TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_name = 'payment_recovery'
        " 2>/dev/null || echo "0")
        
        if [ "$TABLE_EXISTS" -eq 1 ]; then
            log_success "payment_recovery table exists"
            
            # Show table structure
            log_info "Table structure:"
            psql "$DATABASE_URL" -c "\d payment_recovery" | tee -a "$LOG_FILE"
            
            return 0
        else
            log_error "payment_recovery table not found"
            return 1
        fi
    else
        log_warn "psql not available, skipping table verification"
        return 0
    fi
}

# Rollback on failure
rollback_migration() {
    log_warn "Attempting to rollback migration..."
    
    BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
    
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        log_info "Restoring database from backup..."
        psql "$DATABASE_URL" < "$BACKUP_FILE" 2>/dev/null && {
            log_success "Database restored from backup"
            return 0
        }
    fi
    
    log_error "Could not rollback - backup not available"
    return 1
}

# Print summary
print_summary() {
    log_info "======== Migration Summary ========"
    log_info "Timestamp: $(date)"
    log_info "Log file: $LOG_FILE"
    if [ -d "$BACKUP_DIR" ]; then
        log_info "Backup directory: $BACKUP_DIR"
    fi
    log_info "=================================="
}

# Main execution
main() {
    log_info "Starting Medical Coverage System database migration..."
    
    check_prerequisites
    prevent_concurrent_migrations
    validate_environment
    create_backup
    
    if ! run_migrations; then
        log_error "Migration failed!"
        rollback_migration || true
        print_summary
        exit 1
    fi
    
    if ! verify_migrations; then
        log_warn "Migration completed but verification failed"
        print_summary
        exit 1
    fi
    
    log_success "======== MIGRATION COMPLETED SUCCESSFULLY ========"
    print_summary
    exit 0
}

# Run main function
main "$@"
