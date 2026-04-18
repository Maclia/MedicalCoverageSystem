#!/bin/bash

# Backup script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"
BACKUP_DIR=${BACKUP_DIR:-./backups}
DATE=$(date +%Y%m%d_%H%M%S)

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_metric() {
    echo -e "${BLUE}[METRIC]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Some backup features may be limited."
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install curl first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed. JSON output may be limited."
fi

# Create backup directory if it doesn't exist
print_status "Creating backup directory..."
mkdir -p $BACKUP_DIR

# Backup configuration files
print_status "Backing up configuration files..."
BACKUP_FILE="$BACKUP_DIR/config_backup_$DATE.tar.gz"
tar -czf $BACKUP_FILE \
  .env.example \
  package.json \
  tsconfig.json \
  Dockerfile \
  .github/workflows/ci.yml \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_status "✅ Configuration files backed up successfully"
else
    print_error "❌ Failed to backup configuration files"
fi

# Backup source code
print_status "Backing up source code..."
SOURCE_BACKUP="$BACKUP_DIR/source_backup_$DATE.tar.gz"
tar -czf $SOURCE_BACKUP \
  src/ \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_status "✅ Source code backed up successfully"
else
    print_error "❌ Failed to backup source code"
fi

# Backup database
print_status "Backing up database..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q postgres; then
        DB_BACKUP="$BACKUP_DIR/db_backup_$DATE.sql"
        docker exec $(docker ps -q --filter ancestor=postgres) pg_dump -U postgres medical_coverage > $DB_BACKUP 2>/dev/null
        if [ $? -eq 0 ]; then
            print_status "✅ Database backed up successfully"
        else
            print_warning "⚠️  Database backup failed. Ensure PostgreSQL container is running."
        fi
    else
        print_warning "⚠️  PostgreSQL container not found. Skipping database backup."
    fi
else
    print_warning "⚠️  Docker not installed. Skipping database backup."
fi

# Backup logs
print_status "Backing up logs..."
LOG_BACKUP="$BACKUP_DIR/logs_backup_$DATE.tar.gz"
if [ -d "logs" ]; then
    tar -czf $LOG_BACKUP logs/ > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status "✅ Logs backed up successfully"
    else
        print_warning "⚠️  Failed to backup logs"
    fi
else
    print_warning "⚠️  No logs directory found"
fi

# Backup tests
print_status "Backing up tests..."
TEST_BACKUP="$BACKUP_DIR/tests_backup_$DATE.tar.gz"
tar -czf $TEST_BACKUP \
  tests/ \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_status "✅ Tests backed up successfully"
else
    print_warning "⚠️  Failed to backup tests"
fi

# Backup documentation
print_status "Backing up documentation..."
DOC_BACKUP="$BACKUP_DIR/docs_backup_$DATE.tar.gz"
tar -czf $DOC_BACKUP \
  docs/ \
  README.md \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_status "✅ Documentation backed up successfully"
else
    print_warning "⚠️  Failed to backup documentation"
fi

# Summary
print_status "Backup completed successfully!"
print_metric "Backup directory: $BACKUP_DIR"
print_metric "Backup date: $DATE"
print_metric "Total backup files created: $(ls -1 $BACKUP_DIR | wc -l)"