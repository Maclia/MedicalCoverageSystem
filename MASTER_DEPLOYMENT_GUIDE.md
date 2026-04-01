# MASTER DEPLOYMENT GUIDE - Single Source of Truth

**Status**: 🟢 Production Ready  
**Version**: 1.0  
**Last Updated**: April 2, 2026  
**Maintainer**: DevOps Team

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Setup Instructions](#setup-instructions)
4. [Deployment Commands](#deployment-commands)
5. [Environments](#environments)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance & Operations](#maintenance--operations)

---

## 🚀 Quick Start

### 5-Minute Setup

```bash
# 1. Clone and enter directory
git clone <repo-url>
cd MedicalCoverageSystem

# 2. Install dependencies
npm install

# 3. Choose your deployment method and environment:

# === DEVELOPMENT ===
# Start with Docker containers (recommended)
./orchestrate.sh dev start full

# Check status
./orchestrate.sh dev status

# View frontend: http://localhost:3000
# View API: http://localhost:3001/health

# === PRODUCTION ===
# Create production config
cp .env.example .env.production
# Edit .env.production with production secrets

# Deploy
./orchestrate.sh prod start

# Verify
./orchestrate.sh prod status
```

---

## 🏗️ Architecture Overview

### Deployment Structure

```
Medical Coverage System
├── Frontend (React + Vite)
│   └── Port 3000 (dev) / Via Nginx (prod)
├── API Gateway
│   └── Port 3001 (all environments)
└── 9 Microservices (3002-3009)
    ├── Billing Service (3002)
    ├── Core Service (3003)
    ├── Finance Service (3004)
    ├── CRM Service (3005)
    ├── Membership Service (3006)
    ├── Hospital Service (3007)
    ├── Insurance Service (3008)
    └── Wellness Service (3009)

Infrastructure
├── PostgreSQL (Port 5432)
│   ├── 9 separate databases (one per service)
│   └── Shared database for common data
├── Redis (Port 6379)
│   └── Caching and session management
└── Nginx (Reverse Proxy)
    ├── Port 80 (HTTP)
    └── Port 443 (HTTPS/SSL)
```

### Service Configuration (Single Source of Truth)

**Location**: `deployment/scripts/services-config.sh`

```bash
# Service port mapping
SERVICE_PORTS=(
    [api-gateway]=3001
    [billing-service]=3002
    [core-service]=3003
    [finance-service]=3004
    [crm-service]=3005
    [membership-service]=3006
    [hospital-service]=3007
    [insurance-service]=3008
    [wellness-service]=3009
)

# Service database mapping
SERVICE_DATABASES=(
    [api-gateway]="api_gateway"
    [billing-service]="medical_coverage_billing"
    [core-service]="medical_coverage_core"
    # ... etc
)
```

---

## 📦 Setup Instructions

### Prerequisites

**All Environments**:
- Docker 20.10+ & Docker Compose 2.0+
- Node.js 18+
- Git
- 4GB+ RAM, 20GB+ disk space

**Production Only**:
- Neon PostgreSQL account (8 databases)
- SSL certificates for HTTPS
- Load balancer (optional, recommended)
- 8GB+ RAM, 100GB+ SSD

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd MedicalCoverageSystem
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root + services)
npm install

# This installs dependencies for:
# - Root project
# - Client (React app)
# - Server packages
# - All 9 microservices
```

### Step 3: Configure Environment

#### Development (Local Docker)

```bash
# Create development environment file (optional, uses defaults)
cat > .env.development << 'EOF'
ENVIRONMENT=development
NODE_ENV=development

# Database
DB_USER=postgres
DB_PASSWORD=postgres_password_2024
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Logging
LOG_LEVEL=info
EOF
```

#### Staging

```bash
# Create staging environment file
cat > .env.staging << 'EOF'
ENVIRONMENT=staging
NODE_ENV=staging

# Database (use Neon or managed PostgreSQL)
DB_USER=staging_user
DB_PASSWORD=$(openssl rand -base64 32)
DB_HOST=staging-db.neon.tech
DB_PORT=5432

# Redis
REDIS_HOST=staging-redis.example.com
REDIS_PORT=6379

# Frontend
VITE_API_URL=https://staging-api.example.com
VITE_WS_URL=wss://staging-api.example.com

# Security
JWT_SECRET=$(openssl rand -base64 32)

# Logging
LOG_LEVEL=info
EOF
```

#### Production

```bash
# Create production environment file (SECURE - add to .gitignore)
cat > .env.production << 'EOF'
ENVIRONMENT=production
NODE_ENV=production

# Database (Neon Serverless)
DB_USER=production_user
DB_PASSWORD=<SECURE_PASSWORD_FROM_VAULT>
DB_HOST=production-db.neon.tech
DB_PORT=5432

# Redis (Managed service)
REDIS_HOST=production-redis.example.com
REDIS_PORT=6379

# Frontend
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# Security (from secure vault)
JWT_SECRET=<SECURE_JWT_SECRET>
JWT_REFRESH_SECRET=<SECURE_REFRESH_SECRET>

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Performance
SERVICE_TIMEOUT=30000
MAX_CONNECTIONS=100
EOF

# IMPORTANT: Add to .gitignore
echo ".env.production" >> .gitignore
```

### Step 4: Make Scripts Executable

```bash
chmod +x deployment/scripts/orchestrate.sh
chmod +x deployment/scripts/services-config.sh
chmod +x deployment/scripts/orchestrate.bat   # Windows
```

---

## 🎮 Deployment Commands

### Main Orchestrator Command

All deployments use the unified orchestrator:

```bash
./orchestrate.sh [ENVIRONMENT] [COMMAND] [OPTIONS]

# Environments: dev, staging, prod
# Commands: start, stop, restart, status, logs, clean, help
```

### Start Services

```bash
# Development - with database initialization
./orchestrate.sh dev start full

# Development - services only (assumes DB exists)
./orchestrate.sh dev start

# Staging
./orchestrate.sh staging start

# Production
./orchestrate.sh prod start
```

### Monitor Services

```bash
# Check all services health
./orchestrate.sh dev status

# View all logs (real-time)
./orchestrate.sh dev logs

# View specific service logs
./orchestrate.sh dev logs core-service
./orchestrate.sh dev logs api-gateway
./orchestrate.sh dev logs finance-service

# Follow logs (tail)
./orchestrate.sh dev logs -f
```

### Restart Services

```bash
# Restart single service (without stopping others)
./orchestrate.sh dev restart core-service

# Restart all services
./orchestrate.sh dev stop
./orchestrate.sh dev start
```

### Stop Services

```bash
# Graceful shutdown
./orchestrate.sh dev stop

# Cleanup containers (preserve data)
./orchestrate.sh dev clean containers

# Cleanup and remove images
./orchestrate.sh dev clean images

# Full cleanup (includes volumes - DESTRUCTIVE)
./orchestrate.sh dev clean all
```

### Help & Documentation

```bash
# Show all available commands
./orchestrate.sh help

# Show service configuration
./deployment/scripts/services-config.sh

# Show environment configuration
./deployment/scripts/services-config.sh show-config
```

---

## 🌍 Environments

### Development

**Use Case**: Local development, testing features

**Features**:
- ✓ Docker containers (local PostgreSQL & Redis)
- ✓ Hot-reload enabled
- ✓ Debug logging
- ✓ No SSL required
- ✓ Automatic database initialization

**Commands**:
```bash
./orchestrate.sh dev start full        # Full initialization
./orchestrate.sh dev start             # Services only
./orchestrate.sh dev status            # Health check
./orchestrate.sh dev logs              # View logs
./orchestrate.sh dev clean all         # Reset everything
```

**Access Points**:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3001
- Swagger Docs: http://localhost:3001/api/docs
- Individual Services: http://localhost:3002-3009

---

### Staging

**Use Case**: Pre-production testing, QA, integration testing

**Features**:
- ✓ Cloud databases (Neon PostgreSQL)
- ✓ Production-like configuration
- ✓ SSL enabled (or self-signed)
- ✓ Standard logging
- ✓ Health monitoring enabled

**Setup**:
```bash
# Create Neon databases
# 1. Go to https://neon.tech
# 2. Create 9 databases (staging environment)
# 3. Copy connection strings to .env.staging

# Edit environment file
nano .env.staging

# Deploy
./orchestrate.sh staging start
./orchestrate.sh staging status
```

**Access Points**:
- Frontend: https://staging.yourdomain.com
- API Gateway: https://staging-api.yourdomain.com
- Swagger Docs: https://staging-api.yourdomain.com/api/docs

---

### Production

**Use Case**: Live user-facing environment

**Requirements**:
- ✓ Cloud databases (Neon PostgreSQL)
- ✓ Cloud cache (Redis managed service)
- ✓ SSL certificates (from CA)
- ✓ Load balancer with auto-scaling
- ✓ Monitoring & alerting
- ✓ Backup & recovery plan

**Deployment Process**:

```bash
# 1. Prepare environment (ONCE)
cp .env.example .env.production
# Edit with production secrets from secure vault

# 2. Create production databases in Neon
# 3. Test in staging first

# 4. Deploy to production
./orchestrate.sh prod start

# 5. Verify deployment
./orchestrate.sh prod status

# 6. Run smoke tests
npm run test:smoke

# 7. Monitor
./orchestrate.sh prod logs api-gateway
```

**Access Points**:
- Frontend: https://yourdomain.com
- API Gateway: https://api.yourdomain.com
- Swagger Docs: https://api.yourdomain.com/api/docs

---

## 🏥 Health Checks & Monitoring

### Automated Health Checks

The orchestrator runs health checks automatically:

```bash
./orchestrate.sh dev status

# Output shows:
# [✓] postgres is ready
# [✓] redis is ready
# [✓] api-gateway is running (3001)
# [✓] billing-service is running (3002)
# ... all 9 services
# [INFO] Health Status: 11/11 components healthy
```

### Manual Health Verification

```bash
# PostgreSQL
docker exec medical-postgres pg_isready -U postgres

# Redis
docker exec medical-redis redis-cli ping

# API Gateway
curl http://localhost:3001/health

# Individual Services
curl http://localhost:3002/health  # Billing
curl http://localhost:3003/health  # Core
curl http://localhost:3004/health  # Finance
# ... etc

# Full System
curl http://localhost:3001/api/system/health
```

### Real-time Monitoring

```bash
# Watch service status (updates every 10 seconds)
watch -n 10 './orchestrate.sh dev status'

# Monitor resource usage
docker stats

# View container logs with filtering
docker-compose logs -f --tail=100 core-service

# Check service communication
docker exec medical-api-gateway curl http://core-service:3003/health
```

### Logs Locations

```
Development (Docker):
- Docker daemon logs: docker logs [container-name]
- Service logs: ./orchestrate.sh dev logs [service]

Production (Kubernetes/Cloud):
- CloudWatch Logs (AWS)
- Stackdriver Logging (GCP)
- Monitor service dashboard
```

---

## 🔧 Troubleshooting

### Service Won't Start

**Symptom**: Service fails on startup, status shows unhealthy

**Steps**:
```bash
# 1. Check logs
./orchestrate.sh dev logs problem-service

# 2. Verify dependencies
./orchestrate.sh dev status
# Check if PostgreSQL and Redis are running

# 3. Check port availability
lsof -i :3001
lsof -i :3002
# If port in use, kill process or use different port

# 4. Restart service
./orchestrate.sh dev restart core-service

# 5. Full reset if needed
./orchestrate.sh dev clean all
./orchestrate.sh dev start full
```

---

### Database Connection Failed

**Symptom**: "Failed to connect to database", error in logs

**Steps**:
```bash
# 1. Verify PostgreSQL running
docker ps | grep postgres

# 2. Check database exists
docker exec medical-postgres psql -U postgres -l

# 3. Check connection string
cat .env.development  # Verify DB_HOST, DB_PORT, etc.

# 4. Test connection directly
docker exec medical-postgres psql -U postgres -d medical_coverage_core -c "SELECT 1;"

# 5. Recreate databases if needed
./orchestrate.sh dev clean containers
./orchestrate.sh dev start full
```

---

### Port Already in Use

**Symptom**: "Port 3001 already allocated", "bind: address already in use"

**Steps**:
```bash
# 1. Find what's using the port
lsof -i :3001      # macOS/Linux
netstat -ano | findstr :3001  # Windows

# 2. Option A: Kill the process
kill -9 <PID>      # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 3. Option B: Use different port
# Edit .env and change PORT or use override
FRONTEND_PORT=3001 ./orchestrate.sh dev start

# 4. Verify
./orchestrate.sh dev status
```

---

### Cross-Service Communication Failed

**Symptom**: Service can't reach another service, "ECONNREFUSED"

**Steps**:
```bash
# 1. Check Docker network
docker network ls
docker network inspect medical-services-network

# 2. Verify service is running
./orchestrate.sh dev logs api-gateway

# 3. Test connectivity from API Gateway
docker exec medical-api_gateway curl http://core-service:3003/health

# 4. Check service URLs in environment
grep SERVICE_URL .env.development

# 5. Verify service names match Docker container names
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

### Out of Resources

**Symptom**: Services crash, "OutOfMemory", system very slow

**Steps**:
```bash
# 1. Check resource usage
docker stats

# 2. Stop unnecessary services
./orchestrate.sh dev stop

# 3. Clean unused resources
docker system prune -a

# 4. Increase Docker resources
# Edit Docker Desktop settings: Preferences → Resources
# Increase CPU cores and memory

# 5. Restart
./orchestrate.sh dev start full
```

---

## 🛠️ Maintenance & Operations

### Regular Maintenance

#### Daily
- Monitor system health: `./orchestrate.sh prod status`
- Check logs for errors: `./orchestrate.sh prod logs | grep ERROR`
- Verify backup completion

#### Weekly
- Database integrity check
- Review performance metrics
- Update dependencies: `npm update`
- Test disaster recovery procedures

#### Monthly
- Security patches: `npm audit fix`
- Database optimization
- Certificate renewal checks (SSL)
- Capacity planning review

### Database Operations

```bash
# Backup database
docker exec medical-postgres pg_dump -U postgres medical_coverage_core > backup.sql

# Restore database
docker exec -i medical-postgres psql -U postgres medical_coverage_core < backup.sql

# Run migrations
npm run db:push:core
npm run db:push:crm
# ... etc for all services

# Check database usage
docker exec medical-postgres psql -U postgres -c "SELECT schemaname, SUM(pg_total_relation_size(schemaname||'.'||tablename))/(1024*1024) as size_mb FROM pg_tables GROUP BY schemaname;"
```

### Service Scaling

```bash
# Horizontal scaling (add more instances)
docker-compose up -d --scale core-service=3

# View running instances
docker ps | grep core-service

# Load balance across instances
# Configure in API Gateway or use load balancer
```

### Update Services

```bash
# Update single service
docker-compose up -d --build core-service

# Update all services
./orchestrate.sh dev stop
docker-compose pull
./orchestrate.sh dev start

# Verify updates
./orchestrate.sh dev status
docker-compose images
```

### Rollback Deployment

```bash
# Quick rollback to previous version
docker-compose down -v

# Restore from backup
./scripts/restore-backup.sh previous-version

# Restart
./orchestrate.sh prod start

# Verify
./orchestrate.sh prod status
```

---

## 🔐 Security Best Practices

### Credentials Management

```bash
# ❌ INCORRECT - Never commit secrets
git add .env.production
git commit -m "Add production vars"

# ✅ CORRECT - Use secure vault
# Store secrets in:
# - AWS Secrets Manager
# - HashiCorp Vault
# - LastPass Vault
# - 1Password

# Load from vault at deployment time
export $(cat .env.production | xargs)
./orchestrate.sh prod start
```

### SSL/TLS

```bash
# Generate self-signed cert (development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Copy to deployment directory
cp cert.pem deployment/configs/ssl/
cp key.pem deployment/configs/ssl/

# Production: Use Let's Encrypt
certbot certonly --standalone -d yourdomain.com
```

### Network Security

```bash
# Only expose necessary ports
# Through Docker Compose:
# - 80 (HTTP)
# - 443 (HTTPS)
# - 5432 protected by VPC
# - 6379 protected by VPC

# Firewall rules (AWS Security Groups)
Inbound:
  - Port 80: 0.0.0.0/0 (HTTP)
  - Port 443: 0.0.0.0/0 (HTTPS)
  - Port 5432: VPC CIDR only
  - Port 6379: VPC CIDR only
  
Outbound:
  - All to 0.0.0.0/0
```

---

## 📊 Performance Optimization

### Database Optimization

```bash
# Enable query analysis
docker exec medical-postgres psql -U postgres -d medical_coverage_core -c "EXPLAIN ANALYZE SELECT * FROM users;"

# Create indexes for frequently queried columns
docker exec medical-postgres psql -U postgres -d medical_coverage_core -c "CREATE INDEX idx_users_email ON users(email);"

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM claims WHERE status = 'PENDING';
```

### Caching Strategy

```yaml
# In docker-compose.yml
redis:
  image: redis:7-alpine
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Load Balancing

```nginx
# nginx/conf.d/upstream.conf
upstream api_backend {
    server api-gateway:3001;
    server api-gateway-2:3001;  # Additional instance
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📞 Support & Resources

### Documentation Files

| File | Purpose |
|------|---------|
| [MASTER_DEPLOYMENT_GUIDE.md](./MASTER_DEPLOYMENT_GUIDE.md) | This file - Single source of truth |
| [services-config.sh](./deployment/scripts/services-config.sh) | Service definitions |
| [orchestrate.sh](./deployment/scripts/orchestrate.sh) | Main deployment orchestrator |
| [docker-compose.yml](./docker-compose.yml) | Container configuration |

### Getting Help

```bash
# Show available commands
./orchestrate.sh help

# Show service configuration
./deployment/scripts/services-config.sh

# View logs for debugging
./orchestrate.sh dev logs [service-name]

# Check system status
./orchestrate.sh dev status
```

### External Resources

- Docker: https://docs.docker.com
- PostgreSQL: https://www.postgresql.org/docs
- Redis: https://redis.io/docs
- API Documentation: See `/docs` folder in repository

---

## 📋 Deployment Checklist

### Pre-Deployment ✓

- [ ] Read this guide completely
- [ ] All prerequisites installed
- [ ] Code committed to git
- [ ] Environment files created
- [ ] Secrets stored securely (not in code)
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`

### Deployment ✓

- [ ] Start services: `./orchestrate.sh [env] start full`
- [ ] Wait for health checks to pass
- [ ] Verify frontend loads
- [ ] Test API endpoints
- [ ] Check logs for errors
- [ ] Run smoke tests
- [ ] Verify database operations
- [ ] Test user authentication

### Post-Deployment ✓

- [ ] Monitor system for 30 minutes
- [ ] Check error logs
- [ ] Verify all services running
- [ ] Test backups working
- [ ] Document any issues
- [ ] Update team on status
- [ ] Schedule follow-up review

---

## 🎓 Learning Path

**Day 1: Setup**
1. Read this MASTER_DEPLOYMENT_GUIDE.md
2. Follow "Quick Start" section
3. Test `./orchestrate.sh dev start full`

**Day 2: Operations**
1. Practice health checks
2. Review logs
3. Test service restart
4. Explore API endpoints

**Day 3: Advanced**
1. Study docker-compose.yml
2. Review services-config.sh
3. Practice troubleshooting
4. Run system tests

**Day 4: Production**
1. Review production requirements
2. Create production environment
3. Test in staging
4. Plan production deployment

---

## 🚀 Next Steps

1. ✅ **Immediate**: Run `./orchestrate.sh dev start full`
2. ✅ **Today**: Test all deployment commands
3. ✅ **This Week**: Familiarize with monitoring and logs
4. ✅ **Next Week**: Deploy to staging
5. ✅ **Before Production**: Complete full checklist

---

**Questions?** Check troubleshooting section or review detailed docs in `/docs` folder.

**Feedback?** Update this guide with lessons learned.

---

**Version History**:
- v1.0 (April 2, 2026): Initial master deployment guide
- Based on refactored deployment architecture
- Source of truth for all deployment operations

