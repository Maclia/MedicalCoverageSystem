#!/bin/bash

# Medical Coverage System Docker Cleanup Script
# This script cleans up Docker resources, logs, and temporary files

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
Medical Coverage System Docker Cleanup Script

Usage: $0 [OPTIONS]

Options:
    --all           Clean all Docker resources (containers, images, volumes, networks)
    --containers    Stop and remove all containers
    --images        Remove unused Docker images
    --volumes       Remove unused volumes
    --networks      Remove unused networks
    --logs          Clean application logs
    --tmp           Clean temporary files
    --dry-run       Show what would be cleaned without actually cleaning
    --force         Skip confirmation prompts
    -h, --help      Show this help message

Examples:
    $0 --all              # Clean everything
    $0 --logs --tmp       # Clean logs and temp files only
    $0 --dry-run --all    # Show what would be cleaned
EOF
}

# Function to confirm action
confirm_action() {
    if [ "$FORCE" = true ]; then
        return 0
    fi

    read -p "Are you sure you want to $1? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to clean containers
clean_containers() {
    log_info "Cleaning Docker containers..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would stop and remove all containers"
        return 0
    fi

    # Stop all running containers related to the project
    if docker ps -q --filter "name=medcoverage" | grep -q .; then
        log_info "Stopping running containers..."
        docker stop $(docker ps -q --filter "name=medcoverage") || true
        log_success "Stopped running containers"
    fi

    # Remove all containers related to the project
    if docker ps -aq --filter "name=medcoverage" | grep -q .; then
        log_info "Removing containers..."
        docker rm $(docker ps -aq --filter "name=medcoverage") || true
        log_success "Removed containers"
    else
        log_info "No containers to remove"
    fi
}

# Function to clean images
clean_images() {
    log_info "Cleaning Docker images..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would remove unused Docker images"
        return 0
    fi

    # Remove dangling images
    if docker images -f "dangling=true" -q | grep -q .; then
        log_info "Removing dangling images..."
        docker rmi $(docker images -f "dangling=true" -q) || true
        log_success "Removed dangling images"
    fi

    # Remove project-specific images
    PROJECT_IMAGES=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "medcoverage" || true)
    if [ ! -z "$PROJECT_IMAGES" ]; then
        log_info "Removing project-specific images..."
        docker rmi $(docker images --format "{{.Repository}}:{{.Tag}}" | grep "medcoverage") || true
        log_success "Removed project-specific images"
    fi
}

# Function to clean volumes
clean_volumes() {
    log_info "Cleaning Docker volumes..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would remove unused volumes (EXCLUDING database volumes)"
        return 0
    fi

    # Remove unused volumes (but preserve postgres and redis data)
    log_info "Removing unused volumes (preserving database volumes)..."
    docker volume prune -f || true

    # Remove only non-critical volumes
    CRITICAL_VOLUMES="postgres_data postgres_dev_data redis_data redis_dev_data"
    for volume in $CRITICAL_VOLUMES; do
        if docker volume ls -q | grep -q "$volume"; then
            log_info "Preserving critical volume: $volume"
        fi
    done

    log_success "Cleaned unused volumes"
}

# Function to clean networks
clean_networks() {
    log_info "Cleaning Docker networks..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would remove unused networks"
        return 0
    fi

    # Remove unused networks
    docker network prune -f || true

    log_success "Cleaned unused networks"
}

# Function to clean logs
clean_logs() {
    log_info "Cleaning application logs..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would clean log files"
        return 0
    fi

    # Clean deployment logs
    LOG_DIR="$(dirname "$0")/../logs"
    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -type f -name "*.log" -exec truncate -s 0 {} \;
        find "$LOG_DIR" -type f -name "*.log.*" -delete
        log_success "Cleaned deployment logs"
    fi

    # Clean server logs
    SERVER_LOG_DIR="../../server/logs"
    if [ -d "$SERVER_LOG_DIR" ]; then
        find "$SERVER_LOG_DIR" -type f -name "*.log" -exec truncate -s 0 {} \;
        find "$SERVER_LOG_DIR" -type f -name "*.log.*" -delete
        log_success "Cleaned server logs"
    fi

    # Clean Docker container logs
    if docker ps -a --filter "name=medcoverage" --format "table {{.Names}}" | grep -q "medcoverage"; then
        docker ps -a --filter "name=medcoverage" -q | xargs -r docker sh -c 'for container; do docker logs --tail 0 $container 2>/dev/null || true; done'
        log_success "Cleaned Docker container logs"
    fi
}

# Function to clean temporary files
clean_tmp() {
    log_info "Cleaning temporary files..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would clean temporary files"
        return 0
    fi

    # Clean temporary directories
    TEMP_DIRS="../tmp ../temp ./.tmp ./.temp"
    for dir in $TEMP_DIRS; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"/*
            log_success "Cleaned $dir"
        fi
    done

    # Clean upload directories (preserve structure)
    UPLOAD_DIR="../../uploads"
    if [ -d "$UPLOAD_DIR" ]; then
        find "$UPLOAD_DIR" -type f -name "*.tmp" -delete
        find "$UPLOAD_DIR" -type f -mtime +7 -delete  # Delete files older than 7 days
        log_success "Cleaned upload directory"
    fi

    # Clean node_modules in dist directories
    find .. -name "dist" -type d -exec find {} -name "node_modules" -type d \; | while read dir; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            log_success "Removed node_modules in $dir"
        fi
    done
}

# Function to show system usage
show_usage() {
    log_info "System Resource Usage:"

    # Docker usage
    echo -e "${BLUE}Docker:${NC}"
    docker system df 2>/dev/null || echo "Docker not running or no data available"

    # Disk usage
    echo -e "\n${BLUE}Disk Usage:${NC}"
    du -sh ../ 2>/dev/null || echo "Cannot determine disk usage"

    # Container status
    echo -e "\n${BLUE}Container Status:${NC}"
    docker ps -a --filter "name=medcoverage" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found"
}

# Parse command line arguments
CLEAN_ALL=false
CLEAN_CONTAINERS=false
CLEAN_IMAGES=false
CLEAN_VOLUMES=false
CLEAN_NETWORKS=false
CLEAN_LOGS=false
CLEAN_TMP=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            CLEAN_ALL=true
            shift
            ;;
        --containers)
            CLEAN_CONTAINERS=true
            shift
            ;;
        --images)
            CLEAN_IMAGES=true
            shift
            ;;
        --volumes)
            CLEAN_VOLUMES=true
            shift
            ;;
        --networks)
            CLEAN_NETWORKS=true
            shift
            ;;
        --logs)
            CLEAN_LOGS=true
            shift
            ;;
        --tmp)
            CLEAN_TMP=true
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

# Main execution
main() {
    log_info "Medical Coverage System Docker Cleanup"
    echo "=========================================="

    # Show current usage
    show_usage
    echo

    # If no specific option given, show help
    if [ "$CLEAN_ALL" = false ] && [ "$CLEAN_CONTAINERS" = false ] && [ "$CLEAN_IMAGES" = false ] && \
       [ "$CLEAN_VOLUMES" = false ] && [ "$CLEAN_NETWORKS" = false ] && [ "$CLEAN_LOGS" = false ] && \
       [ "$CLEAN_TMP" = false ]; then
        log_warning "No cleanup options specified. Use --help to see available options."
        exit 0
    fi

    # Execute cleanup based on options
    if [ "$CLEAN_ALL" = true ]; then
        if confirm_action "clean all Docker resources and temporary files"; then
            clean_containers
            clean_images
            clean_volumes
            clean_networks
            clean_logs
            clean_tmp
        fi
    else
        # Execute individual cleanup options
        [ "$CLEAN_CONTAINERS" = true ] && clean_containers
        [ "$CLEAN_IMAGES" = true ] && clean_images
        [ "$CLEAN_VOLUMES" = true ] && clean_volumes
        [ "$CLEAN_NETWORKS" = true ] && clean_networks
        [ "$CLEAN_LOGS" = true ] && clean_logs
        [ "$CLEAN_TMP" = true ] && clean_tmp
    fi

    echo
    log_success "Cleanup completed!"

    # Show final usage
    echo
    show_usage
}

# Run main function
main "$@"