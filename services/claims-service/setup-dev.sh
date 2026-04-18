#!/bin/bash

# Development environment setup script for Claims Service

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="claims-service"

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
    print_warning "Docker is not installed. Some features may be limited."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose is not installed. Some features may be limited."
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from .env.example..."
    cp .env.example .env
    print_warning "Please update .env file with your configuration"
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    print_status "Initializing git repository..."
    git init > /dev/null 2>&1
    git add . > /dev/null 2>&1
    git commit -m "Initial commit" > /dev/null 2>&1
fi

# Install development dependencies
print_status "Installing development dependencies..."
npm install --save-dev @types/node @types/express @types/jest @types/supertest ts-jest jest supertest

if [ $? -ne 0 ]; then
    print_error "Failed to install development dependencies"
    exit 1
fi

# Create VS Code settings if they don't exist
if [ ! -d ".vscode" ]; then
    print_status "Creating VS Code settings..."
    mkdir -p .vscode
    cat > .vscode/settings.json << EOF
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact"
    ],
    "typescript.tsdk": "node_modules/typescript/lib"
}
EOF
fi

# Create VS Code tasks if they don't exist
if [ ! -f ".vscode/tasks.json" ]; then
    print_status "Creating VS Code tasks..."
    cat > .vscode/tasks.json << EOF
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "npm",
            "script": "dev",
            "problemMatcher": ["$eslint-stylish"],
            "group": "build",
            "label": "npm: dev"
        },
        {
            "type": "npm",
            "script": "test",
            "problemMatcher": ["$eslint-stylish"],
            "group": "test",
            "label": "npm: test"
        },
        {
            "type": "npm",
            "script": "lint",
            "problemMatcher": ["$eslint-stylish"],
            "group": "build",
            "label": "npm: lint"
        },
        {
            "type": "npm",
            "script": "build",
            "problemMatcher": ["$eslint-stylish"],
            "group": "build",
            "label": "npm: build"
        }
    ]
}
EOF
fi

# Create VS Code launch configuration if it doesn't exist
if [ ! -f ".vscode/launch.json" ]; then
    print_status "Creating VS Code launch configuration..."
    cat > .vscode/launch.json << EOF
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Claims Service",
            "type": "node",
            "request": "launch",
            "program": "\${workspaceFolder}/dist/index.js",
            "preLaunchTask": "npm: build",
            "outFiles": [
                "\${workspaceFolder}/dist/**/*.js"
            ],
            "internalConsoleOptions": "openOnSessionStart"
        },
        {
            "name": "Debug Claims Service (TS)",
            "type": "node",
            "request": "launch",
            "program": "\${workspaceFolder}/src/start.ts",
            "runtimeArgs": [
                "--nolazy",
                "-r",
                "ts-node/register"
            ],
            "args": [],
            "cwd": "\${workspaceFolder}",
            "protocol": "inspector",
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
EOF
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    print_status "Creating .gitignore..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Production
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
jspm_packages/

# TypeScript v1 declaration files
typings/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache
.cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/
public

# Storybook build outputs
.out/
.storybook-out/

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage

# Grunt intermediate storage
.grunt

# Bower dependency directory
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons
build/Release

# Dependency directories
node_modules
jspm_packages

# TypeScript v1 declaration files
typings

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache
.cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/
public

# Storybook build outputs
.out/
.storybook-out/

# Temporary folders
tmp/
temp/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
EOF
fi

# Create development documentation
print_status "Creating development documentation..."
cat > DEVELOPMENT.md << EOF
# Development Guide

## Prerequisites

- Node.js 18+
- npm
- Docker (optional)

## Getting Started

1. Clone the repository
2. Run \`./setup-dev.sh\` to set up the development environment
3. Update the .env file with your configuration
4. Run \`npm run dev\` to start the development server

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
- \`npm run lint\` - Run linting
- \`npm run lint:fix\` - Fix linting issues

## VS Code Integration

The project includes VS Code settings for:
- Auto-format on save
- ESLint integration
- Debug configurations
- Task runners

## Testing

Run \`npm test\` to execute all tests. Use \`npm run test:watch\` for watch mode.

## Linting

Run \`npm run lint\` to check code style. Use \`npm run lint:fix\` to automatically fix issues.

## Docker

Build and run with Docker:
\`\`\`
docker build -t claims-service .
docker run -p 3005:3005 claims-service
\`\`\`
EOF

print_status "Development environment setup completed successfully!"
print_status "Run 'npm run dev' to start the development server"