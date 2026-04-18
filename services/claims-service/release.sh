#!/bin/bash

# Release script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"
VERSION=${VERSION:-1.0.0}

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
    print_warning "Docker is not installed. Some release features may be limited."
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "git is not installed. Please install git first."
    exit 1
fi

# Check if service is ready for release
print_status "Checking if service is ready for release..."
if [ ! -f package.json ]; then
    print_error "❌ package.json not found. Cannot determine version."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
print_status "Current version: $CURRENT_VERSION"

# Ask for new version
read -p "Enter new version (current: $CURRENT_VERSION): " NEW_VERSION
if [ -z "$NEW_VERSION" ]; then
    NEW_VERSION=$CURRENT_VERSION
fi

# Update version
print_status "Updating version to $NEW_VERSION..."
npm version $NEW_VERSION --no-git-tag-version

if [ $? -ne 0 ]; then
    print_error "❌ Failed to update version"
    exit 1
fi

# Run tests
print_status "Running tests..."
npm test

if [ $? -ne 0 ]; then
    print_error "❌ Tests failed. Cannot release."
    exit 1
fi

# Run linting
print_status "Running linting..."
npm run lint

if [ $? -ne 0 ]; then
    print_warning "⚠️  Linting issues found. Run 'npm run lint:fix' to fix them."
    exit 1
fi

# Build project
print_status "Building project..."
npm run build

if [ $? -ne 0 ]; then
    print_error "❌ Build failed. Cannot release."
    exit 1
fi

# Create release notes
print_status "Creating release notes..."
RELEASE_NOTES="RELEASE_NOTES.md"
cat > $RELEASE_NOTES << EOF
# Release Notes - Version $NEW_VERSION

## Features
- Initial release of Claims Service

## Improvements
- Added comprehensive test suite
- Implemented Docker support
- Added monitoring and logging
- Created development scripts

## Bug Fixes
- Fixed TypeScript errors
- Improved error handling
- Enhanced security measures

## Dependencies
- Updated dependencies to latest versions
- Added security audit tools

## Documentation
- Added API documentation
- Created development guides
- Updated README

## Testing
- Added unit tests
- Added integration tests
- Added performance tests

## Deployment
- Added CI/CD pipeline
- Created Docker deployment scripts
- Added backup and monitoring scripts

## Security
- Added security audit script
- Implemented input validation
- Added rate limiting
- Enhanced error handling

## Performance
- Added performance testing
- Optimized database queries
- Implemented caching strategies

## Infrastructure
- Added monitoring scripts
- Created backup procedures
- Implemented logging
- Added health checks

## Development
- Created development environment setup
- Added VS Code integration
- Implemented code quality tools
- Added development scripts

## Next Steps
- Implement fraud detection integration
- Add payment processing
- Create dispute management system
- Implement reconciliation functionality
EOF

print_status "✅ Release notes created: $RELEASE_NOTES"

# Commit changes
print_status "Committing changes..."
git add package.json
git commit -m "Release version $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"

if [ $? -ne 0 ]; then
    print_error "❌ Failed to commit changes"
    exit 1
fi

# Build Docker image
if command -v docker &> /dev/null; then
    print_status "Building Docker image..."
    docker build -t claims-service:$NEW_VERSION .
    if [ $? -eq 0 ]; then
        print_status "✅ Docker image built successfully"
    else
        print_warning "⚠️  Docker build failed. Continuing without Docker image."
    fi
fi

# Push to git
print_status "Pushing to git repository..."
git push origin main
git push origin "v$NEW_VERSION"

if [ $? -ne 0 ]; then
    print_error "❌ Failed to push to git repository"
    exit 1
fi

# Summary
print_status "Release completed successfully!"
print_metric "Version: $NEW_VERSION"
print_metric "Release notes: $RELEASE_NOTES"
print_metric "Git tag: v$NEW_VERSION"
print_metric "Docker image: claims-service:$NEW_VERSION"