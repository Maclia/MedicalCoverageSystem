#!/bin/bash

# Medical Coverage System File Structure Cleanup Script
# This script organizes and cleans up the project file structure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logger functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display help
show_help() {
    cat << EOF
Medical Coverage System File Structure Cleanup Script

Usage: $0 [OPTIONS]

Options:
    --docs              Reorganize documentation files
    --logs              Clean and organize log files
    --temp              Remove temporary files and directories
    --duplicates        Find and remove duplicate files
    --unused            Find and remove unused files
    --structure         Fix directory structure issues
    --dry-run           Show what would be cleaned without actually cleaning
    --force             Skip confirmation prompts
    -h, --help          Show this help message

Examples:
    $0 --all                    # Clean and organize everything
    $0 --docs --logs            # Clean docs and logs only
    $0 --dry-run --all          # Show what would be cleaned
EOF
}

# Function to create backup before cleanup
create_backup() {
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would create backup before cleanup"
        return 0
    fi

    local backup_dir="../backups/file-cleanup-$(date +%Y%m%d_%H%M%S)"
    log_info "Creating backup in $backup_dir"

    mkdir -p "$backup_dir"

    # Backup important files
    cp -r ../server "$backup_dir/" 2>/dev/null || true
    cp -r ../client "$backup_dir/" 2>/dev/null || true
    cp -r ../shared "$backup_dir/" 2>/dev/null || true
    cp -r ../config "$backup_dir/" 2>/dev/null || true
    cp package.json "$backup_dir/" 2>/dev/null || true

    log_success "Backup created: $backup_dir"
}

# Function to organize documentation files
organize_docs() {
    log_info "Organizing documentation files..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would organize documentation files"
        return 0
    fi

    # Create organized documentation structure
    mkdir -p ../docs/{api,user-guides,deployment,development,integration,reports}

    # Move files to appropriate directories
    local files_moved=0

    # Integration reports
    find .. -maxdepth 1 -name "*integration*.md" -type f | while read file; do
        if [ -f "$file" ]; then
            mv "$file" ../docs/integration/
            ((files_moved++))
            log_info "Moved $(basename "$file") to docs/integration/"
        fi
    done

    # Implementation reports
    find .. -maxdepth 1 -name "*implementation*.md" -type f | while read file; do
        if [ -f "$file" ]; then
            mv "$file" ../docs/development/
            ((files_moved++))
            log_info "Moved $(basename "$file") to docs/development/"
        fi
    done

    # System analysis reports
    find .. -maxdepth 1 -name "*SYSTEM*.md" -type f | while read file; do
        if [ -f "$file" ]; then
            mv "$file" ../docs/reports/
            ((files_moved++))
            log_info "Moved $(basename "$file") to docs/reports/"
        fi
    done

    # User guides (already in correct location, just confirm)
    if [ -d "../docs/user-guides" ]; then
        log_info "User guides found in docs/user-guides/"
    fi

    log_success "Documentation organization completed"
}

# Function to clean and organize log files
clean_logs() {
    log_info "Cleaning and organizing log files..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would clean log files"
        return 0
    fi

    # Create log directory structure
    mkdir -p ../logs/{application,nginx,system,database}

    # Find and organize log files
    find .. -name "*.log" -type f | while read log_file; do
        if [[ "$log_file" == *"nginx"* ]]; then
            mv "$log_file" ../logs/nginx/ 2>/dev/null || true
        elif [[ "$log_file" == *"database"* || "$log_file" == *"postgres"* ]]; then
            mv "$log_file" ../logs/database/ 2>/dev/null || true
        elif [[ "$log_file" == *"system"* ]]; then
            mv "$log_file" ../logs/system/ 2>/dev/null || true
        else
            mv "$log_file" ../logs/application/ 2>/dev/null || true
        fi
    done

    # Compress old logs
    find ../logs -name "*.log" -type f -mtime +7 -exec gzip {} \;

    # Remove very old logs (older than 30 days)
    find ../logs -name "*.log.gz" -type f -mtime +30 -delete

    log_success "Log cleanup completed"
}

# Function to remove temporary files
remove_temp_files() {
    log_info "Removing temporary files..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would remove temporary files"
        return 0
    fi

    # Define temporary patterns
    local temp_patterns=(
        "*.tmp"
        "*.temp"
        "*.log.*"
        "*.swp"
        "*.swo"
        ".DS_Store"
        "Thumbs.db"
        "node_modules/.cache"
        ".pytest_cache"
        ".coverage"
        "*.pyc"
        "__pycache__"
        "*.pid"
        "*.seed"
        "*.pid.lock"
    )

    local total_removed=0

    for pattern in "${temp_patterns[@]}"; do
        local found_files=$(find .. -name "$pattern" -type f 2>/dev/null || true)
        if [ ! -z "$found_files" ]; then
            echo "$found_files" | while read file; do
                if [ -f "$file" ]; then
                    rm -f "$file"
                    ((total_removed++))
                    log_info "Removed $(basename "$file")"
                fi
            done
        fi
    done

    # Remove temporary directories
    local temp_dirs=(
        "tmp"
        "temp"
        ".tmp"
        ".temp"
        "dist"
        "build"
        ".next"
        ".nuxt"
        ".cache"
    )

    for dir in "${temp_dirs[@]}"; do
        find .. -name "$dir" -type d | while read temp_dir; do
            if [ -d "$temp_dir" ] && [[ ! "$temp_dir" == *"/node_modules/"* ]]; then
                rm -rf "$temp_dir"
                log_info "Removed directory: $(basename "$temp_dir")"
            fi
        done
    done

    log_success "Temporary files cleanup completed"
}

# Function to find duplicate files
find_duplicates() {
    log_info "Finding duplicate files..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would find and report duplicate files"
        return 0
    fi

    # Create duplicates report
    local duplicates_report="../logs/duplicates_report_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "Duplicate Files Report - $(date)"
        echo "=================================="
        echo

        # Find duplicate files by content
        find .. -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/logs/*" | \
        xargs md5sum 2>/dev/null | \
        sort | \
        uniq -d -w32 | \
        while read md5hash filename; do
            echo "Duplicate hash: $md5hash"
            find .. -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/logs/*" -exec md5sum {} \; | \
            grep "^$md5hash" | \
            sed 's/^/  /'
            echo
        done
    } > "$duplicates_report"

    local duplicate_count=$(grep -c "Duplicate hash:" "$duplicates_report" 2>/dev/null || echo "0")

    if [ "$duplicate_count" -gt 0 ]; then
        log_warning "Found $duplicate_count duplicate file groups. See report: $duplicates_report"
    else
        log_success "No duplicate files found"
        rm -f "$duplicates_report"
    fi
}

# Function to find unused files
find_unused_files() {
    log_info "Finding potentially unused files..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would find potentially unused files"
        return 0
    fi

    local unused_report="../logs/unused_files_report_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "Potentially Unused Files Report - $(date)"
        echo "========================================="
        echo

        # Find large unused files
        echo "Large files (>10MB):"
        find .. -type f -size +10M -not -path "*/node_modules/*" -not -path "*/.git/*" -exec ls -lh {} \; | \
        awk '{print $5, $9}' | sort -hr | head -20
        echo

        # Find empty files
        echo "Empty files:"
        find .. -type f -empty -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/logs/*"
        echo

        # Find old test files
        echo "Old test files:"
        find .. -name "*test*" -type f -mtime +30 -not -path "*/node_modules/*" | head -20
        echo

        # Find orphaned TypeScript files
        echo "Orphaned TypeScript files:"
        find .. -name "*.ts" -type f -not -path "*/node_modules/*" | while read ts_file; do
            local basename=$(basename "$ts_file" .ts)
            if [ ! -f "$(dirname "$ts_file")/$basename.js" ] && [ ! -f "$(dirname "$ts_file")/$basename.d.ts" ]; then
                echo "$ts_file"
            fi
        done
    } > "$unused_report"

    log_success "Unused files analysis completed. See report: $unused_report"
}

# Function to fix directory structure issues
fix_structure() {
    log_info "Fixing directory structure issues..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would fix directory structure issues"
        return 0
    fi

    # Ensure essential directories exist
    local essential_dirs=(
        "../server/api"
        "../server/services"
        "../server/middleware"
        "../server/routes"
        "../client/src"
        "../client/public"
        "../shared/types"
        "../shared/schema"
        "../config"
        "../deployment"
        "../docs"
        "../tests"
        "../scripts"
    )

    for dir in "${essential_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done

    # Move misplaced files
    # Check for TypeScript files in wrong locations
    find .. -maxdepth 1 -name "*.ts" -type f | while read ts_file; do
        if [ -f "$ts_file" ]; then
            local basename=$(basename "$ts_file")
            # Move to server directory if it looks like server code
            if [[ "$basename" == *"server"* ]] || [[ "$basename" == *"api"* ]] || [[ "$basename" == *"service"* ]]; then
                mv "$ts_file" "../server/"
                log_info "Moved $basename to server directory"
            fi
        fi
    done

    # Fix file permissions
    find .. -name "*.sh" -type f -not -path "*/node_modules/*" -exec chmod +x {} \;
    find .. -name "*.js" -type f -not -path "*/node_modules/*" -exec chmod 644 {} \;
    find .. -name "*.ts" -type f -not -path "*/node_modules/*" -exec chmod 644 {} \;
    find .. -name "*.json" -type f -not -path "*/node_modules/*" -exec chmod 644 {} \;

    log_success "Directory structure fixed"
}

# Function to generate cleanup report
generate_report() {
    log_info "Generating cleanup report..."

    local report_file="../logs/cleanup_report_$(date +%Y%m%d_%H%M%S).md"

    cat > "$report_file" << EOF
# File Structure Cleanup Report

**Date:** $(date)
**Script:** file-cleanup.sh
**Mode:** $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "EXECUTED")

## Cleanup Actions Performed

### Documentation Organization
- Reorganized documentation files into structured directories
- Moved integration reports to \`docs/integration/\`
- Moved implementation docs to \`docs/development/\`
- Moved system reports to \`docs/reports/\`

### Log File Management
- Organized logs by type (application, nginx, system, database)
- Compressed logs older than 7 days
- Removed logs older than 30 days

### Temporary File Cleanup
- Removed temporary files (*.tmp, *.temp, *.swp, etc.)
- Cleaned temporary directories (tmp, temp, dist, build, etc.)
- Removed cache directories

### Duplicate File Analysis
- Generated duplicate files report
- Identified potential space savings

### Structure Optimization
- Created missing essential directories
- Moved misplaced files to correct locations
- Fixed file permissions for scripts and configuration files

## Directory Structure After Cleanup

\`\`\`
MedicalCoverageSystem/
├── server/                 # Backend application
├── client/                 # Frontend application
├── shared/                 # Shared types and schemas
├── config/                 # Configuration files
├── deployment/             # Deployment configurations
├── docs/                   # Documentation
│   ├── api/               # API documentation
│   ├── user-guides/       # User guides
│   ├── deployment/        # Deployment docs
│   ├── development/       # Development docs
│   ├── integration/       # Integration reports
│   └── reports/           # System reports
├── logs/                   # Organized log files
│   ├── application/       # Application logs
│   ├── nginx/            # Nginx logs
│   ├── system/           # System logs
│   └── database/         # Database logs
├── tests/                 # Test files
├── scripts/               # Utility scripts
└── backups/              # Backup files
\`\`\`

## Recommendations

1. **Regular Cleanup**: Run this cleanup script weekly
2. **Monitor Duplicates**: Review duplicate files report and remove unnecessary copies
3. **Log Rotation**: Implement automated log rotation
4. **Documentation**: Keep documentation updated and in proper directories
5. **Backup Strategy**: Regular backups of important files

## Next Steps

1. Review the generated reports in the logs directory
2. Manually review any duplicate files before removal
3. Update any build scripts that might reference old file locations
4. Commit the cleaned structure to version control

---

**Generated by:** Medical Coverage System File Cleanup Script
EOF

    log_success "Cleanup report generated: $report_file"
}

# Parse command line arguments
CLEAN_ALL=false
CLEAN_DOCS=false
CLEAN_LOGS=false
CLEAN_TEMP=false
FIND_DUPLICATES=false
FIND_UNUSED=false
FIX_STRUCTURE=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            CLEAN_ALL=true
            shift
            ;;
        --docs)
            CLEAN_DOCS=true
            shift
            ;;
        --logs)
            CLEAN_LOGS=true
            shift
            ;;
        --temp)
            CLEAN_TEMP=true
            shift
            ;;
        --duplicates)
            FIND_DUPLICATES=true
            shift
            ;;
        --unused)
            FIND_UNUSED=true
            shift
            ;;
        --structure)
            FIX_STRUCTURE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
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

# Function to confirm action
confirm_action() {
    if [ "$FORCE" = true ]; then
        return 0
    fi

    read -p "This will clean and reorganize files. Are you sure? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Main execution
main() {
    log_info "Medical Coverage System File Structure Cleanup"
    echo "==============================================="
    log_info "Dry Run: $DRY_RUN"
    echo

    # If no specific option given, default to all
    if [ "$CLEAN_ALL" = false ] && [ "$CLEAN_DOCS" = false ] && [ "$CLEAN_LOGS" = false ] && \
       [ "$CLEAN_TEMP" = false ] && [ "$FIND_DUPLICATES" = false ] && [ "$FIND_UNUSED" = false ] && \
       [ "$FIX_STRUCTURE" = false ]; then
        CLEAN_ALL=true
    fi

    if [ "$DRY_RUN" = false ] && [ "$CLEAN_ALL" = true ]; then
        if ! confirm_action "proceed with file cleanup"; then
            log_info "Cleanup cancelled"
            exit 0
        fi
    fi

    # Create backup before cleanup
    if [ "$DRY_RUN" = false ] && [ "$CLEAN_ALL" = true ]; then
        create_backup
    fi

    # Execute cleanup based on options
    [ "$CLEAN_ALL" = true ] || [ "$CLEAN_DOCS" = true ] && organize_docs
    [ "$CLEAN_ALL" = true ] || [ "$CLEAN_LOGS" = true ] && clean_logs
    [ "$CLEAN_ALL" = true ] || [ "$CLEAN_TEMP" = true ] && remove_temp_files
    [ "$CLEAN_ALL" = true ] || [ "$FIND_DUPLICATES" = true ] && find_duplicates
    [ "$CLEAN_ALL" = true ] || [ "$FIND_UNUSED" = true ] && find_unused_files
    [ "$CLEAN_ALL" = true ] || [ "$FIX_STRUCTURE" = true ] && fix_structure

    # Generate final report
    generate_report

    echo
    log_success "🧹 File structure cleanup completed!"

    if [ "$DRY_RUN" = false ]; then
        log_info "Check the logs directory for detailed reports"
    fi
}

# Change to project root directory
cd "$(dirname "$0")/../.."

# Run main function
main "$@"