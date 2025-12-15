# WSL Docker Setup for MedicalCoverageSystem

## Prerequisites for WSL Users

### 1. Docker Desktop Installation
- Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- Enable WSL 2 integration in Docker Desktop settings
- Restart Docker Desktop after enabling WSL integration

### 2. WSL 2 Configuration
```bash
# Update WSL to version 2 (if not already)
wsl --update
wsl --set-default-version 2

# Restart WSL
wsl --shutdown
```

### 3. Docker Daemon Setup
After Docker Desktop installation with WSL integration:

```bash
# Test Docker availability
docker --version
docker-compose --version

# Should output something like:
# Docker version 24.0.7, build afdd53b
# Docker Compose version v2.21.0
```

## WSL-Specific Optimizations

### Path Handling
The build scripts are WSL-compatible and handle:
- Windows paths automatically via WSL translation
- Docker Desktop WSL integration
- Cross-platform file permissions

### Performance Optimizations
```bash
# Add to ~/.bashrc or ~/.zshrc for better WSL performance
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

# Source the file
source ~/.bashrc
```

## Usage in WSL Environment

### Basic Build Commands
```bash
# Navigate to project directory
cd /mnt/c/path/to/your/MedicalCoverageSystem

# Make build script executable
chmod +x scripts/docker-build.sh

# Production build
./scripts/docker-build.sh build

# Development environment
docker-compose -f docker-compose.dev.yml up
```

### WSL-Specific Commands
```bash
# Build with WSL-optimized settings
WSL_ENABLED=1 ./scripts/docker-build.sh build

# Development with Windows volume mounting
docker-compose -f docker-compose.dev.yml -f docker-compose.wsl.yml up
```

## WSL Docker Compose Configuration

Create `docker-compose.wsl.yml` for WSL-specific settings:

```yaml
version: "3.9"

services:
  app:
    volumes:
      # Use Windows paths for better IDE integration
      - /mnt/c/path/to/MedicalCoverageSystem/server:/app/server
      - /mnt/c/path/to/MedicalCoverageSystem/client:/app/client
      - /mnt/c/path/to/MedicalCoverageSystem/shared:/app/shared

    # WSL-specific environment
    environment:
      - WSL_ENABLED=1
      - DOCKER_HOST=unix:///var/run/docker.sock

  postgres:
    volumes:
      - postgres_wsl_data:/var/lib/postgresql/data

  redis:
    volumes:
      - redis_wsl_data:/data

volumes:
  postgres_wsl_data:
    driver: local
  redis_wsl_data:
    driver: local
```

## Troubleshooting WSL Docker Issues

### Issue: "docker command not found"
```bash
# Install Docker Desktop and enable WSL integration
# Or add Docker to PATH manually
echo 'export PATH="/mnt/c/Program Files/Docker/Docker/resources/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Issue: "Permission denied" on Docker socket
```bash
# Add user to docker group (requires restart)
sudo usermod -aG docker $USER

# Or use sudo for each command
sudo docker version
```

### Issue: Slow file operations
```bash
# Move node_modules to WSL filesystem for better performance
# Add to .gitignore
echo "node_modules/" >> .gitignore

# Build with volume caching
./scripts/docker-build.sh build
```

### Issue: Windows path translation
```bash
# Convert Windows path to WSL path
wslpath -u "C:\\Users\\YourUser\\Projects\\MedicalCoverageSystem"
# Output: /mnt/c/Users/YourUser/Projects/MedicalCoverageSystem

# Convert WSL path to Windows path
wslpath -w "/mnt/c/Users/YourUser/Projects/MedicalCoverageSystem"
# Output: C:\\Users\\YourUser\\Projects\\MedicalCoverageSystem
```

## WSL Development Workflow

### 1. Initial Setup
```bash
# Clone repository to Windows (not WSL filesystem)
git clone https://github.com/your-org/medical-coverage-system.git /mnt/c/Users/YourUser/Projects/MedicalCoverageSystem

# Navigate in WSL
cd /mnt/c/Users/YourUser/Projects/MedicalCoverageSystem
```

### 2. Development Mode
```bash
# Start development environment with WSL optimizations
docker-compose -f docker-compose.dev.yml -f docker-compose.wsl.yml up

# View logs
docker-compose logs -f app

# Stop development environment
docker-compose down
```

### 3. Production Build
```bash
# Build optimized production image
./scripts/docker-build.sh build

# Test production build
docker run -p 3001:3001 medical-coverage-system:latest

# Push to registry (if configured)
REGISTRY=your-registry.com/ PUSH=true ./scripts/docker-build.sh build
```

## Performance Tips for WSL

### 1. Use WSL Filesystem for Build Cache
```bash
# Set build cache to WSL filesystem
export DOCKER_BUILD_CACHE_DIR="/tmp/.buildx-cache"
./scripts/docker-build.sh build
```

### 2. Optimize Volume Mounts
```bash
# Use bind mounts for development (better performance than volumes)
docker-compose -f docker-compose.dev.yml up --build

# Or use named volumes for production
docker-compose -f docker-compose.simple.yml up
```

### 3. Enable WSL 2 Features
```bash
# Ensure WSL 2 is enabled
wsl --list --verbose

# Should show WSL 2 for your distribution
# NAME           STATE           VERSION
# Ubuntu-20.04    Running         2
```

## IDE Integration

### VS Code WSL Integration
1. Install [WSL extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl)
2. Open project in WSL: `code .`
3. Docker integration works seamlessly

### Windows Terminal
```json
// Add to Windows Terminal settings.json
{
    "profiles": {
        "defaults": {
            "commandline": "wsl.exe"
        }
    }
}
```

## Testing WSL Setup

Verify everything works with these commands:

```bash
# Test Docker connectivity
docker run hello-world

# Test Docker Compose
docker-compose --version

# Test build script
./scripts/docker-build.sh help

# Test development environment
docker-compose -f docker-compose.dev.yml config

# Test production build
./scripts/docker-build.sh build
```

All commands should execute successfully in your WSL environment.