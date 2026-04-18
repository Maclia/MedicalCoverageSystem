# Docker Troubleshooting Guide for Medical Coverage System

## 1. Check Docker Status
```powershell
# Verify Docker is running
docker --version
docker ps
docker info
```

## 2. Clean Docker Environment
```powershell
# Stop all containers
docker-compose down -v
docker stop $(docker ps -aq) 2>$null

# Remove dangling images
docker image prune -f

# Remove dangling volumes
docker volume prune -f

# Full cleanup (WARNING: removes ALL unused Docker resources)
docker system prune -af --volumes
```

## 3. Restart Docker Daemon
```powershell
# Restart Docker service
Restart-Service Docker

# Wait for Docker to restart
Start-Sleep -Seconds 10

# Verify status
docker ps
```

## 4. Check Disk Space
```powershell
# Get Docker disk usage
docker system df

# Check Windows disk space
Get-Volume | Where-Object {$_.DriveLetter -eq 'C'} | Select-Object DriveLetter, Size, SizeRemaining
```

## 5. Test Docker Build Capability
```powershell
# Try building a simple test image
docker build -t test-image - <<EOF
FROM alpine:latest
RUN echo "Hello from Docker"
EOF

# If successful, remove it
docker rmi test-image
```

## 6. Build Services One at a Time
```powershell
# Try building API Gateway first
cd services/api-gateway
docker build -t medical-api-gateway .
cd ../..

# If successful, try frontend
cd client
docker build -t medical-frontend .
cd ..

# Try core service
cd services/core-service
docker build -t medical-core-service .
cd ../..
```

## 7. Check Docker Daemon Logs (Windows)
```powershell
# If using Docker Desktop, logs are in:
$logPath = "$env:APPDATA\Docker\log.txt"
if (Test-Path $logPath) {
    Get-Content $logPath -Tail 50
}

# Or check Event Viewer
Get-EventLog -LogName Application -Source Docker -Newest 10 | Format-List
```

## 8. Simplified Docker Compose (Infrastructure Only)
```powershell
# If full compose fails, try just infrastructure
docker-compose up -d postgres redis

# Wait for them to be healthy
Start-Sleep -Seconds 15
docker-compose ps

# Check postgres is working
docker exec medical_postgres psql -U postgres -c "SELECT 1"
```

## 9. If All Else Fails: Reinstall Docker
```powershell
# Uninstall Docker Desktop from Control Panel
# Then reinstall from https://www.docker.com/products/docker-desktop/

# Or use a lightweight alternative like Podman:
choco install podman -y
```

## 10. Run Locally Without Docker (Fastest Option)
```powershell
# Terminal 1: API Gateway
cd services/api-gateway
npm run dev

# Terminal 2: Frontend  
npm run dev:client

# Services will use localhost:3001 for API
```
