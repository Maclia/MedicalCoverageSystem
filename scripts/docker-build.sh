#!/bin/bash

# MedicalCoverageSystem Docker Build Optimization Script
# Optimized for BuildKit caching, multi-stage builds, and development workflows

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="medical-coverage-system"
REGISTRY="${REGISTRY:-}"
CACHE_DIR="${DOCKER_BUILD_CACHE_DIR:-/tmp/.buildx-cache}"
PLATFORM="${PLATFORM:-linux/amd64,linux/arm64}"
PUSH="${PUSH:-false}"
WSL_ENABLED="${WSL_ENABLED:-false}"

# Dockerfile options
DOCKERFILE="${DOCKERFILE:-Dockerfile}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"
TARGET="${TARGET:-runner}"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi

    # Check if BuildKit is available
    if ! docker buildx version &> /dev/null; then
        error "Docker BuildKit is not available. Please install Docker Buildx."
    fi

    # Check if project structure exists
    if [ ! -f "$BUILD_CONTEXT/package.json" ]; then
        error "package.json not found in build context: $BUILD_CONTEXT"
    fi

    if [ ! -f "$BUILD_CONTEXT/$DOCKERFILE" ]; then
        error "Dockerfile not found: $BUILD_CONTEXT/$DOCKERFILE"
    fi

    success "Prerequisites check passed"
}

# Setup BuildKit builder
setup_builder() {
    log "Setting up BuildKit builder..."

    # Create builder if it doesn't exist
    if ! docker buildx inspect "$PROJECT_NAME-builder" &> /dev/null; then
        docker buildx create --name "$PROJECT_NAME-builder" --driver docker-container --bootstrap
        success "Created BuildKit builder: $PROJECT_NAME-builder"
    else
        success "BuildKit builder already exists: $PROJECT_NAME-builder"
    fi

    # Use the builder
    docker buildx use "$PROJECT_NAME-builder"
    success "Using BuildKit builder: $PROJECT_NAME-builder"
}

# Build Docker image
build_image() {
    local image_name="$PROJECT_NAME"
    local image_tag="${IMAGE_TAG:-latest}"
    local full_image_name="${REGISTRY}${image_name}:${image_tag}"

    log "Building Docker image: $full_image_name"
    log "Dockerfile: $DOCKERFILE"
    log "Target stage: $TARGET"
    log "Platform: $PLATFORM"

    # Prepare build arguments
    local build_args=(
        "--build-arg" "BUILDKIT_INLINE_CACHE=1"
        "--cache-from" "type=local,src=$CACHE_DIR"
        "--cache-to" "type=local,dest=$CACHE_DIR,mode=max"
        "--target" "$TARGET"
        "--platform" "$PLATFORM"
        "--file" "$BUILD_CONTEXT/$DOCKERFILE"
        "--progress" "plain"
    )

    # Add push or load option
    if [ "$PUSH" = "true" ] && [ -n "$REGISTRY" ]; then
        build_args+=("--push")
    else
        build_args+=("--load")
    fi

    # Set environment variables
    export BUILDKIT_PROGRESS=plain

    # Execute build
    log "Starting build process..."
    if docker buildx build "${build_args[@]}" --tag "$full_image_name" "$BUILD_CONTEXT"; then
        success "Build completed successfully"
    else
        error "Build failed"
    fi

    # Show image information
    if [ "$PUSH" != "true" ]; then
        log "Image information:"
        docker images | grep "$image_name" | head -5
    fi
}

# Build for development
build_dev() {
    log "Building for development environment..."

    local dev_image="${PROJECT_NAME}:dev"

    docker buildx build \
        --file "$BUILD_CONTEXT/Dockerfile.dev" \
        --target "development" \
        --tag "$dev_image" \
        --cache-from "type=local,src=${CACHE_DIR}-dev" \
        --cache-to "type=local,dest=${CACHE_DIR}-dev,mode=max" \
        --load \
        "$BUILD_CONTEXT"

    success "Development build completed: $dev_image"
}

# Build with PNPM
build_pnpm() {
    log "Building with PNPM optimization..."

    local pnpm_image="${PROJECT_NAME}:pnpm"

    docker buildx build \
        --file "$BUILD_CONTEXT/Dockerfile.pnpm" \
        --target "runner" \
        --tag "$pnpm_image" \
        --cache-from "type=local,src=${CACHE_DIR}-pnpm" \
        --cache-to "type=local,dest=${CACHE_DIR}-pnpm,mode=max" \
        --load \
        "$BUILD_CONTEXT"

    success "PNPM build completed: $pnpm_image"
}

# Build with Turbo
build_turbo() {
    log "Building with Turbo optimization..."

    local turbo_image="${PROJECT_NAME}:turbo"

    docker buildx build \
        --file "$BUILD_CONTEXT/Dockerfile.turbo" \
        --target "runner" \
        --tag "$turbo_image" \
        --cache-from "type=local,src=${CACHE_DIR}-turbo" \
        --cache-to "type=local,dest=${CACHE_DIR}-turbo,mode=max" \
        --load \
        "$BUILD_CONTEXT"

    success "Turbo build completed: $turbo_image"
}

# Clean cache
clean_cache() {
    log "Cleaning BuildKit cache..."

    if [ -d "$CACHE_DIR" ]; then
        rm -rf "$CACHE_DIR"
        success "Cleaned local cache: $CACHE_DIR"
    fi

    docker buildx prune -f
    success "Cleaned BuildKit cache"
}

# Build for WSL environment
build_wsl() {
    log "Building for WSL environment..."

    local wsl_image="${PROJECT_NAME}:wsl"

    # WSL-specific build context
    local wsl_context="${BUILD_CONTEXT}"
    if [ "$WSL_ENABLED" = "true" ] && [ -d "/mnt/c" ]; then
        log "WSL detected - optimizing for Windows paths"
        wsl_context="/mnt/c$(echo "$BUILD_CONTEXT" | sed 's/^[A-Za-z]:/\//')"
    fi

    docker buildx build \
        --file "$wsl_context/Dockerfile" \
        --target "runner" \
        --tag "$wsl_image" \
        --cache-from "type=local,src=${CACHE_DIR}-wsl" \
        --cache-to "type=local,dest=${CACHE_DIR}-wsl,mode=max" \
        --load \
        "$wsl_context"

    success "WSL build completed: $wsl_image"
}

# Show usage
usage() {
    cat << EOF
MedicalCoverageSystem Docker Build Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build           Build main Docker image (default)
    dev             Build development image
    pnpm            Build with PNPM optimization
    turbo           Build with Turborepo optimization
    wsl             Build optimized for WSL environment
    clean           Clean BuildKit cache
    help            Show this help message

Environment Variables:
    REGISTRY        Docker registry prefix (e.g., "myregistry.com/")
    IMAGE_TAG       Image tag (default: "latest")
    PLATFORM        Target platforms (default: "linux/amd64,linux/arm64")
    PUSH            Push to registry (true/false, default: "false")
    DOCKERFILE      Dockerfile to use (default: "Dockerfile")
    TARGET          Build target stage (default: "runner")
    BUILD_CONTEXT   Build context directory (default: ".")
    WSL_ENABLED      Enable WSL optimizations (true/false, default: "false")

Examples:
    # Basic build
    $0 build

    # Build with custom tag
    IMAGE_TAG=v1.0.0 $0 build

    # Build and push to registry
    REGISTRY=myregistry.com/ PUSH=true $0 build

    # Development build with hot reload
    $0 dev

    # PNPM optimized build
    $0 pnpm

    # WSL optimized build
    WSL_ENABLED=true $0 wsl

    # Multi-platform build
    PLATFORM=linux/amd64,linux/arm64 $0 build

    # Clean all cache
    $0 clean

EOF
}

# Main execution
main() {
    local command="${1:-build}"

    case "$command" in
        "build")
            check_prerequisites
            setup_builder
            build_image
            ;;
        "dev")
            check_prerequisites
            setup_builder
            build_dev
            ;;
        "pnpm")
            check_prerequisites
            setup_builder
            build_pnpm
            ;;
        "turbo")
            check_prerequisites
            setup_builder
            build_turbo
            ;;
        "wsl")
            check_prerequisites
            setup_builder
            build_wsl
            ;;
        "clean")
            clean_cache
            ;;
        "help"|"-h"|"--help")
            usage
            ;;
        *)
            error "Unknown command: $command. Use 'help' for usage information."
            ;;
    esac

    success "Script completed successfully"
}

# Trap cleanup
trap 'error "Script interrupted"' INT TERM

# Run main function with all arguments
main "$@"