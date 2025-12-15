# Docker Setup and Deployment Guide

## Overview

The Medical Coverage System now has **improved and simplified Docker configuration** for easy deployment. This guide covers building, running, and troubleshooting the Docker containers.

---

## Quick Start (Recommended)

### Using Simplified Docker Compose

The easiest way to run the application:

```bash
# 1. Copy environment file
cp .env.example .env.docker

# 2. Edit .env.docker with your settings
nano .env.docker

# 3. Start all services
docker-compose -f docker-compose.simple.yml --env-file .env.docker up -d

# 4. Check logs
docker-compose -f docker-compose.simple.yml logs -f app

# 5. Access the application
open http://localhost:3001
```

---

## Docker Configuration Files

### 1. `Dockerfile` (Root) - **Recommended**

**Purpose**: Builds the complete Medical Coverage System (backend + frontend) in a single container.

**Features**:
- ✅ Multi-stage build for optimized image size
- ✅ Node.js 20 Alpine base
- ✅ Builds both client (Vite) and server (esbuild)
- ✅ Non-root user for security
- ✅ Health checks enabled
- ✅ Production-ready

**Build Command**:
```bash
docker build -t medical-coverage:latest .
```

**Run Command**:
```bash
docker run -d \
  --name medical-app \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@postgres:5432/medical_coverage" \
  -e REDIS_URL="redis://:password@redis:6379/0" \
  -e JWT_SECRET="your-jwt-secret-min-32-chars" \
  medical-coverage:latest
```

### 2. `docker-compose.simple.yml` - **Recommended for Development**

**Purpose**: Simple 3-service stack (Postgres + Redis + App)

**Services**:
- `postgres`: PostgreSQL 15 database
- `redis`: Redis 7 cache
- `app`: Medical Coverage System (backend + frontend)

**Usage**:
```bash
# Start all services
docker-compose -f docker-compose.simple.yml up -d

# Stop all services
docker-compose -f docker-compose.simple.yml down

# View logs
docker-compose -f docker-compose.simple.yml logs -f

# Rebuild after code changes
docker-compose -f docker-compose.simple.yml up -d --build
```

### 3. `docker-compose.yml` - **Advanced Multi-Service**

**Purpose**: Full production stack with separate frontend, backend, nginx, monitoring, backups.

**Services**:
- `postgres`: Database
- `redis`: Cache
- `backend`: API server
- `frontend`: React app
- `nginx`: Reverse proxy
- `finance`: Finance module (if exists)
- `health-monitor`: Monitoring service
- `db-backup`: Automated backups

**Usage**:
```bash
# Production deployment
docker-compose --profile production up -d

# Development with hot-reload
docker-compose --profile dev up -d

# With monitoring
docker-compose --profile monitoring up -d
```

---

## Environment Configuration

### Minimum Required Variables

Create `.env.docker` file:

```env
# Application
NODE_ENV=production
PORT=3001

# Database
POSTGRES_DB=medical_coverage
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_THIS_IN_PRODUCTION

# Redis
REDIS_PASSWORD=CHANGE_THIS_IN_PRODUCTION

# Security (MUST CHANGE IN PRODUCTION)
JWT_SECRET=change-this-jwt-secret-minimum-32-characters-long
JWT_REFRESH_SECRET=change-this-refresh-secret-minimum-32-characters
SESSION_SECRET=change-this-session-secret-for-production
ENCRYPTION_KEY=change-this-encryption-key-for-production

# Features
ENABLE_TOKEN_SYSTEM=true
ENABLE_SCHEMES_BENEFITS=true
```

### Full Configuration

See `.env.example` for all available environment variables including:
- Email (SMTP) configuration
- File upload settings
- Token system configuration
- Rate limiting
- Monitoring and logging
- Feature flags

---

## Building Docker Images

### Option 1: Root Dockerfile (Recommended)

Builds both frontend and backend together:

```bash
# Development build
docker build --target builder -t medical-coverage:dev .

# Production build
docker build --target runner -t medical-coverage:prod .

# Check image size
docker images | grep medical-coverage
```

### Option 2: Separate Server and Client

If you need separate containers:

```bash
# Build server
cd server
docker build -t medical-coverage-backend:latest .

# Build client
cd client
docker build -t medical-coverage-frontend:latest .
```

---

## Running Containers

### Standalone Application Container

```bash
docker run -d \
  --name medical-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v medical-uploads:/app/uploads \
  -v medical-logs:/app/logs \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/medical_coverage" \
  -e REDIS_URL="redis://:password@host.docker.internal:6379/0" \
  -e JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters" \
  -e JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-characters" \
  medical-coverage:prod
```

### With Docker Compose

```bash
# Start services in background
docker-compose -f docker-compose.simple.yml up -d

# Start with rebuild
docker-compose -f docker-compose.simple.yml up -d --build

# Scale services
docker-compose -f docker-compose.simple.yml up -d --scale app=3

# View logs
docker-compose -f docker-compose.simple.yml logs -f app

# Stop services
docker-compose -f docker-compose.simple.yml stop

# Remove containers
docker-compose -f docker-compose.simple.yml down

# Remove containers and volumes
docker-compose -f docker-compose.simple.yml down -v
```

---

## Accessing the Application

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| Application (Full-stack) | 3001 | http://localhost:3001 |
| Backend API | 3001 | http://localhost:3001/api |
| Frontend | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |

### Health Checks

```bash
# Application health
curl http://localhost:3001/api/health

# Database health
docker exec medical_postgres pg_isready -U postgres

# Redis health
docker exec medical_redis redis-cli ping
```

---

## Troubleshooting

### Issue 1: Container Fails to Start

**Symptoms**: Container exits immediately or shows errors

**Solutions**:

```bash
# Check logs
docker logs medical-app --tail 100

# Check with docker-compose
docker-compose -f docker-compose.simple.yml logs app

# Verify environment variables
docker exec medical-app env | grep -E "DATABASE_URL|JWT_SECRET"

# Check if ports are available
lsof -i :3001
netstat -tulpn | grep 3001
```

### Issue 2: Database Connection Errors

**Symptoms**: `ECONNREFUSED` or `database does not exist`

**Solutions**:

```bash
# Check if postgres is running
docker ps | grep postgres

# Check postgres logs
docker logs medical_postgres

# Verify database exists
docker exec medical_postgres psql -U postgres -l

# Create database if missing
docker exec medical_postgres psql -U postgres -c "CREATE DATABASE medical_coverage;"

# Test connection
docker exec medical-app pg_isready -h postgres -p 5432 -U postgres
```

### Issue 3: Permission Denied Errors

**Symptoms**: Cannot write to `/app/uploads` or `/app/logs`

**Solutions**:

```bash
# Check volume permissions
docker exec medical-app ls -la /app/

# Fix permissions (if running as root temporarily)
docker exec --user root medical-app chown -R nodejs:nodejs /app/uploads /app/logs

# Or recreate volumes
docker-compose -f docker-compose.simple.yml down -v
docker-compose -f docker-compose.simple.yml up -d
```

### Issue 4: Build Failures

**Symptoms**: Docker build fails during npm install or build step

**Solutions**:

```bash
# Clear Docker cache
docker builder prune -a

# Build with no cache
docker build --no-cache -t medical-coverage:latest .

# Check disk space
df -h
docker system df

# Clean up unused images
docker system prune -a

# Build with verbose output
docker build --progress=plain -t medical-coverage:latest . 2>&1 | tee build.log
```

### Issue 5: High Memory Usage

**Symptoms**: Container using too much memory or being killed

**Solutions**:

```bash
# Check resource usage
docker stats medical-app

# Limit memory
docker run -d --memory="2g" --memory-swap="2g" ...

# With docker-compose, add to service:
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 512M
```

### Issue 6: Frontend Not Loading

**Symptoms**: API works but UI shows 404 or blank page

**Solutions**:

```bash
# Verify client/dist was built
docker exec medical-app ls -la /app/client/dist

# Check if server is serving static files
docker exec medical-app cat /app/dist/index.js | grep "client/dist"

# Rebuild with fresh build
docker-compose -f docker-compose.simple.yml up -d --build --force-recreate app
```

---

## Database Migrations

### Running Migrations in Docker

```bash
# Using docker exec
docker exec medical-app npm run db:push

# Using docker-compose exec
docker-compose -f docker-compose.simple.yml exec app npm run db:push

# Manual migration with drizzle-kit
docker exec medical-app npx drizzle-kit push:pg
```

### Initial Database Setup

```bash
# Create database
docker exec medical_postgres psql -U postgres -c "CREATE DATABASE medical_coverage;"

# Run migrations
docker exec medical-app npm run db:push

# Seed data (if seed script exists)
docker exec medical-app npm run db:seed
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Change all default passwords in `.env.docker`
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (32+ chars)
- [ ] Generate strong `JWT_REFRESH_SECRET` (32+ chars)
- [ ] Generate strong `SESSION_SECRET` (32+ chars)
- [ ] Generate strong `ENCRYPTION_KEY` (32+ chars)
- [ ] Configure SMTP for email
- [ ] Set up SSL certificates (if using HTTPS)
- [ ] Configure CORS `ALLOWED_ORIGINS`
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Test health check endpoints

### Deployment

```bash
# 1. Build production image
docker build -t medical-coverage:1.0.0 .

# 2. Tag for registry (optional)
docker tag medical-coverage:1.0.0 your-registry.com/medical-coverage:1.0.0

# 3. Push to registry (optional)
docker push your-registry.com/medical-coverage:1.0.0

# 4. Deploy with docker-compose
docker-compose -f docker-compose.simple.yml --env-file .env.docker up -d

# 5. Verify services
docker-compose -f docker-compose.simple.yml ps
curl http://localhost:3001/api/health

# 6. Check logs
docker-compose -f docker-compose.simple.yml logs -f
```

### Post-Deployment

- [ ] Verify all services are healthy
- [ ] Test database connectivity
- [ ] Test Redis connectivity
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Monitor resource usage
- [ ] Set up log rotation
- [ ] Configure automated backups
- [ ] Set up monitoring alerts

---

## Maintenance Commands

### Logs

```bash
# View all logs
docker-compose -f docker-compose.simple.yml logs

# Follow logs
docker-compose -f docker-compose.simple.yml logs -f app

# Last 100 lines
docker-compose -f docker-compose.simple.yml logs --tail 100 app

# Logs for specific service
docker logs medical-app --tail 50 -f
```

### Updates and Rebuilds

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.simple.yml up -d --build

# Force recreate
docker-compose -f docker-compose.simple.yml up -d --force-recreate
```

### Backups

```bash
# Backup database
docker exec medical_postgres pg_dump -U postgres medical_coverage > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20231201.sql | docker exec -i medical_postgres psql -U postgres medical_coverage

# Backup volumes
docker run --rm -v medical-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz /data
```

### Cleanup

```bash
# Stop and remove containers
docker-compose -f docker-compose.simple.yml down

# Remove volumes too
docker-compose -f docker-compose.simple.yml down -v

# Clean up unused images
docker image prune -a

# Full system cleanup
docker system prune -a --volumes
```

---

## Performance Optimization

### Image Size Optimization

The current Dockerfile uses multi-stage builds to minimize image size:

- **Base image**: node:20-alpine (~170MB)
- **Final image**: ~500-700MB (with all dependencies)

### Build Cache

Speed up builds by leveraging Docker cache:

```bash
# Cache package installation
# (Already configured in Dockerfile)

# Use BuildKit for better caching
export DOCKER_BUILDKIT=1
docker build -t medical-coverage:latest .
```

### Resource Limits

Configure in `docker-compose.simple.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## Security Best Practices

### ✅ Implemented

- Non-root user in containers
- Multi-stage builds (no dev dependencies in production)
- Health checks enabled
- Read-only volumes where appropriate
- Network isolation
- Environment variable based secrets

### 🔒 Recommendations

1. **Use Docker Secrets** for sensitive data:
   ```bash
   echo "your-jwt-secret" | docker secret create jwt_secret -
   ```

2. **Scan images for vulnerabilities**:
   ```bash
   docker scan medical-coverage:latest
   ```

3. **Keep base images updated**:
   ```bash
   docker pull node:20-alpine
   docker build --pull -t medical-coverage:latest .
   ```

4. **Limit container capabilities**:
   ```yaml
   security_opt:
     - no-new-privileges:true
   cap_drop:
     - ALL
   cap_add:
     - NET_BIND_SERVICE
   ```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t medical-coverage:${{ github.sha }} .

      - name: Run tests
        run: docker run medical-coverage:${{ github.sha }} npm test

      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker tag medical-coverage:${{ github.sha }} your-registry/medical-coverage:latest
          docker push your-registry/medical-coverage:latest
```

---

## Support and Documentation

### Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

### Common Issues Repository

Check `ERROR_CHECK_SUMMARY.md` and `FILE_ORGANIZATION_SUMMARY.md` for known issues and fixes.

---

**Last Updated**: 2025-12-01
**Docker Version**: 20.10+
**Docker Compose Version**: 2.0+
**Application Version**: 3.0.0
