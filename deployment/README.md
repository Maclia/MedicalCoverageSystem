# Medical Coverage System Deployment Guide

This guide covers the complete deployment process for the Medical Coverage System across development, staging, and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Directory Structure](#directory-structure)
- [Deployment Scripts](#deployment-scripts)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Health Monitoring](#health-monitoring)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### System Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for local development)
- **PostgreSQL**: 15+ (if running outside Docker)
- **Redis**: 7+ (if running outside Docker)
- **Nginx**: 1.20+ (if running outside Docker)

### Hardware Requirements

#### Development Environment
- **CPU**: 2 cores
- **Memory**: 4GB RAM
- **Storage**: 20GB available space

#### Production Environment
- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps connection

### Network Requirements
- **Port 80**: HTTP traffic
- **Port 443**: HTTPS traffic
- **Port 3000**: Frontend application (dev only)
- **Port 3001**: Backend API
- **Port 5432**: PostgreSQL
- **Port 6379**: Redis

## Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MedicalCoverageSystem
```

### 2. Environment Files
Create environment files for each environment:

```bash
# Development
cp .env.example .env.dev

# Staging
cp .env.example .env.staging

# Production
cp .env.example .env.production
```

### 3. SSL Certificates (Production)
Place SSL certificates in the appropriate directory:
```bash
mkdir -p deployment/configs/ssl
cp your-cert.pem deployment/configs/ssl/cert.pem
cp your-key.pem deployment/configs/ssl/key.pem
```

## Directory Structure

```
deployment/
├── docker/
│   ├── docker-compose.prod.yml    # Production Docker Compose
│   └── docker-compose.dev.yml     # Development Docker Compose
├── configs/
│   ├── nginx.conf                 # Nginx configuration
│   ├── init-db.sql               # Database initialization
│   └── ssl/                      # SSL certificates
├── scripts/
│   ├── deploy.sh                 # Deployment script
│   ├── cleanup.sh                # Cleanup script
│   └── health-check.sh           # Health monitoring
├── logs/                         # Application logs
└── uploads/                      # File uploads
```

## Deployment Scripts

### Deploy Script (`deployment/scripts/deploy.sh`)

Handles deployment across all environments with rollback capabilities.

```bash
# Deploy to development
./deployment/scripts/deploy.sh dev

# Deploy to production with tests
./deployment/scripts/deploy.sh prod

# Deploy without tests (production only)
./deployment/scripts/deploy.sh prod --skip-tests

# Dry run to see deployment plan
./deployment/scripts/deploy.sh staging --dry-run

# Rollback to previous version
./deployment/scripts/deploy.sh prod --rollback
```

### Cleanup Script (`deployment/scripts/cleanup.sh`)

Manages Docker resources and temporary files.

```bash
# Clean all Docker resources
./deployment/scripts/cleanup.sh --all

# Clean logs and temporary files
./deployment/scripts/cleanup.sh --logs --tmp

# Dry run to see what would be cleaned
./deployment/scripts/cleanup.sh --dry-run --all
```

### Health Check Script (`deployment/scripts/health-check.sh`)

Monitors service health and sends alerts.

```bash
# Run health check once
./deployment/scripts/health-check.sh --once

# Continuous monitoring with notifications
./deployment/scripts/deploy.sh health-check.sh --interval 60 --notify

# JSON output for integration
./deployment/scripts/health-check.sh --json --verbose
```

## Environment Configuration

### Development Environment (`.env.dev`)
```bash
# Database
POSTGRES_DB=medical_coverage_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=devpassword
POSTGRES_PORT=5432

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# Security
JWT_SECRET=dev-secret-key-change-in-production

# Email (optional for development)
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=
EMAIL_PASS=

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Production Environment (`.env.production`)
```bash
# Database
POSTGRES_DB=medical_coverage
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_PORT=5432

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com

# Security
JWT_SECRET=your-very-secure-jwt-secret

# Email
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@your-domain.com
EMAIL_PASS=your-email-password

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# SSL
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EMAIL_ALERTS=true
```

## Deployment Process

### Development Deployment

1. **Initial Setup**
```bash
# Start development environment
./deployment/scripts/deploy.sh dev
```

2. **Development Workflow**
```bash
# Make changes to code
# Rebuild and redeploy
./deployment/scripts/deploy.sh dev --skip-tests --force-rebuild

# View logs
docker-compose -f deployment/docker/docker-compose.dev.yml logs -f
```

### Production Deployment

1. **Pre-deployment Checklist**
   - [ ] All tests passing
   - [ ] Environment configured
   - [ ] SSL certificates in place
   - [ ] Database backup strategy ready
   - [ ] Monitoring configured

2. **Deploy to Production**
```bash
# Full production deployment
./deployment/scripts/deploy.sh prod

# Production deployment without tests (emergency)
./deployment/scripts/deploy.sh prod --skip-tests

# Deploy specific version
TAG=v1.2.3 ./deployment/scripts/deploy.sh prod
```

3. **Post-deployment Verification**
```bash
# Check health status
./deployment/scripts/health-check.sh --once --verbose

# Monitor logs
./deployment/scripts/deploy.sh prod --logs
```

### Blue-Green Deployment Strategy

For zero-downtime deployments:

1. **Deploy to Green Environment**
```bash
# Deploy new version to green environment
DEPLOYMENT_ENV=green ./deployment/scripts/deploy.sh prod
```

2. **Verify Green Environment**
```bash
# Health check green environment
GREEN_URL=https://green.your-domain.com ./deployment/scripts/health-check.sh --once
```

3. **Switch Traffic**
```bash
# Update Nginx to point to green environment
# Update DNS if needed
```

4. **Cleanup Blue Environment**
```bash
# Remove old blue environment
DEPLOYMENT_ENV=blue ./deployment/scripts/cleanup.sh --containers --images
```

## Health Monitoring

### Monitoring Setup

1. **Continuous Health Monitoring**
```bash
# Start health monitoring
./deployment/scripts/health-check.sh --interval 60 --notify --email
```

2. **Service Status Dashboard**
The system provides health information at:
- Backend API: `http://localhost:3001/api/health`
- Frontend Health: `http://localhost:3000/health`
- Overall Status: `http://localhost:8080/health`

### Alert Configuration

Configure alerts in your environment file:

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email alerts
EMAIL_ALERTS=true
ALERT_EMAIL=admin@your-domain.com

# Health check settings
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10
```

### Monitoring Metrics

The system monitors:

- **Service Availability**: HTTP status checks
- **Database Health**: PostgreSQL connection and query performance
- **Cache Health**: Redis connectivity and performance
- **Container Health**: Docker container status
- **System Resources**: CPU, memory, disk usage
- **Application Metrics**: Response times, error rates

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check container logs
docker-compose logs <service-name>

# Check container status
docker ps -a

# Restart specific service
docker-compose restart <service-name>
```

#### 2. Database Connection Issues
```bash
# Check database container
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres

# Manual database connection
docker-compose exec postgres psql -U postgres -d medical_coverage
```

#### 3. High Memory Usage
```bash
# Check resource usage
docker stats

# Clean up unused resources
./deployment/scripts/cleanup.sh --all

# Restart services
docker-compose restart
```

#### 4. SSL Certificate Issues
```bash
# Verify certificate files
ls -la deployment/configs/ssl/
openssl x509 -in deployment/configs/ssl/cert.pem -text -noout

# Check Nginx configuration
docker-compose exec nginx nginx -t
```

### Emergency Procedures

#### 1. Rollback Deployment
```bash
# Quick rollback to previous version
./deployment/scripts/deploy.sh prod --rollback

# Manual rollback to specific tag
TAG=previous-version ./deployment/scripts/deploy.sh prod
```

#### 2. Database Recovery
```bash
# List available backups
ls -la ../backups/

# Restore database backup
docker-compose exec postgres psql -U postgres -d medical_coverage < backup_file.sql

# Or use pg_restore for compressed backups
gunzip -c backup_file.sql.gz | docker-compose exec -T postgres psql -U postgres -d medical_coverage
```

#### 3. Service Recovery
```bash
# Stop all services
docker-compose down

# Clean up
./deployment/scripts/cleanup.sh --containers

# Redeploy
./deployment/scripts/deploy.sh prod --skip-backup
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Monitor health checks
- Review application logs
- Check system resources

#### Weekly
- Clean up Docker resources: `./deployment/scripts/cleanup.sh --all`
- Review security updates
- Check SSL certificate expiry

#### Monthly
- Database maintenance and optimization
- Update Docker images and dependencies
- Review and rotate secrets
- Performance tuning

### Backup Strategy

#### Database Backups
```bash
# Manual backup
./deployment/scripts/deploy.sh prod --backup-only

# Automated daily backups (add to crontab)
0 2 * * * /path/to/deployment/scripts/deploy.sh prod --backup-only
```

#### Configuration Backups
```bash
# Backup configuration files
tar -czf deployment-backup-$(date +%Y%m%d).tar.gz deployment/
```

### Security Updates

#### 1. Update Dependencies
```bash
# Update Node.js dependencies
npm update
npm audit fix

# Update Docker base images
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull nginx:alpine
```

#### 2. Security Scanning
```bash
# Scan Docker images for vulnerabilities
docker scan medcoverage-backend:latest
docker scan medcoverage-frontend:latest
```

#### 3. SSL Certificate Renewal
```bash
# Check certificate expiry
openssl x509 -in deployment/configs/ssl/cert.pem -noout -dates

# Renew certificates (Let's Encrypt example)
certbot renew --nginx
```

## Performance Optimization

### Database Optimization
```sql
-- Analyze query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Update table statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE medical_coverage;
```

### Application Optimization
```bash
# Monitor resource usage
docker stats --no-stream

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/health

# Profile Node.js application
node --inspect dist/server.js
```

### Nginx Optimization
The Nginx configuration includes:
- Gzip compression
- Connection keepalive
- Rate limiting
- SSL optimization
- Static file caching

## Support

For deployment issues:

1. Check this documentation first
2. Review application logs: `docker-compose logs`
3. Run health check: `./deployment/scripts/health-check.sh --verbose`
4. Contact support with relevant logs and configuration

---

**Note**: Always test deployments in a staging environment before deploying to production.