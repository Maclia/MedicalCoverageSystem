# Medical Coverage System - Unified Deployment Guide

## Overview

This guide covers the unified deployment of the Medical Coverage System, which integrates both the main application and finance services into a single, cohesive deployment infrastructure.

## What's New

### Key Improvements
- **Unified Infrastructure**: Single PostgreSQL and Redis instances serve both main and finance services
- **Simplified File Structure**: Eliminated confusing multiple docker-compose files
- **Enhanced Monitoring**: Comprehensive health checks across all services
- **Improved Error Handling**: Better service recovery and rollback capabilities
- **Streamlined Deployment**: Single deployment process for all services

### Issues Resolved
- ❌ **Separate Deployments**: No more isolated finance deployment - ✅ **Integrated**
- ❌ **Resource Duplication**: Single database and Redis instead of duplicates - ✅ **Optimized**
- ❌ **Network Fragmentation**: Unified network for all services - ✅ **Connected**
- ❌ **Port Conflicts**: Proper port allocation and routing - ✅ **Resolved**
- ❌ **Complex Health Monitoring**: Single health check script for all services - ✅ **Simplified**

## File Structure

### New Unified Structure
```
MedicalCoverageSystem/
├── deployment/
│   ├── docker/
│   │   ├── docker-compose.unified.yml    # 🆕 Main unified deployment
│   │   ├── docker-compose.dev.yml         # Development environment
│   │   ├── docker-compose.staging.yml     # Staging environment
│   │   └── docker-compose.prod.yml       # Legacy (kept for reference)
│   ├── configs/
│   │   ├── nginx-unified.conf            # 🆕 Unified nginx configuration
│   │   ├── init-db-unified.sql          # 🆕 Unified database initialization
│   │   └── ssl/                         # SSL certificates
│   ├── scripts/
│   │   ├── health-check-unified.sh      # 🆕 Unified health monitoring
│   │   ├── deploy-unified.sh            # 🆕 Unified deployment script
│   │   └── backup-unified.sh            # 🆕 Unified backup script
│   └── logs/                             # Application logs
├── scripts/
│   └── deploy-unified.sh                # Symlink to deployment script
├── .env.unified                         # 🆕 Unified environment configuration
├── .env.example                         # Updated example file
└── DEPLOYMENT_UNIFIED_README.md         # 🆕 This guide
```

### Files to Remove (After Migration)
- `docker-compose.yml` (root level)
- `docker-compose.prod.yml` (root level)
- `docker-compose.finance.yml` (root level)

## Quick Start

### 1. Environment Setup
```bash
# Copy and configure environment
cp .env.example .env.unified

# Edit the configuration with your settings
nano .env.unified
```

### 2. Database Setup
```bash
# Create multiple databases initialization script
cat > scripts/create-multiple-databases.sh << 'EOF'
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE "$POSTGRES_MULTIPLE_DATABASES";
EOSQL
EOF

chmod +x scripts/create-multiple-databases.sh
```

### 3. Deploy the System
```bash
# Deploy all services
./scripts/deploy-unified.sh prod

# Or deploy specific service groups
./scripts/deploy-unified.sh prod --main              # Main application only
./scripts/deploy-unified.sh prod --finance           # Finance services only
./scripts/deploy-unified.sh prod --infrastructure    # Infrastructure only

# Deploy and start monitoring
./scripts/deploy-unified.sh prod --monitor
```

### 4. Health Monitoring
```bash
# Run one-time health check
./deployment/scripts/health-check-unified.sh --once --verbose

# Start continuous monitoring
./deployment/scripts/health-check-unified.sh --interval 60 --notify

# Show performance metrics
./deployment/scripts/health-check-unified.sh --metrics
```

## Service Architecture

### Unified Services
```
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (Port 80/443)                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│  │   Frontend  │   Backend   │   Finance   │    Admin    │   │
│  │   (3000)    │   (3001)    │   (5000)    │   (3001)    │   │
│  └─────────────┴─────────────┴─────────────┴─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Infrastructure Services                          │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│  │ PostgreSQL   │    Redis    │   Worker    │   Backup    │   │
│  │   (5432)    │   (6379)    │             │             │   │
│  └─────────────┴─────────────┴─────────────┴─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Database Structure
```
PostgreSQL Instance (Port 5432)
├── medical_coverage        # Main application database
│   ├── medical_app.users      # Shared users table
│   ├── medical_app.patients   # Patients and appointments
│   ├── medical_app.coverage   # Insurance and coverage plans
│   └── medical_app.audit_logs # Audit logging
│
└── medical_coverage_finance  # Finance service database
    ├── finance_app.billing_accounts    # Billing and accounts
    ├── finance_app.invoices           # Invoices and payments
    ├── finance_app.claims             # Insurance claims
    ├── finance_app.commissions        # Provider commissions
    └── finance_app.fee_schedules     # Service fee schedules
```

### Network Configuration
- **Unified Network**: `medcoverage_unified_network` (172.21.0.0/16)
- **Service Communication**: All services can communicate internally
- **External Access**: Properly routed through Nginx reverse proxy

## Deployment Options

### Environment Types
- **Development**: `./scripts/deploy-unified.sh dev`
- **Staging**: `./scripts/deploy-unified.sh staging`
- **Production**: `./scripts/deploy-unified.sh prod`

### Service Groups
- **All Services** (default): Main + Finance + Infrastructure
- **Main Only**: `--main` flag
- **Finance Only**: `--finance` flag
- **Infrastructure Only**: `--infrastructure` flag

### Advanced Options
```bash
# Skip build step (use existing images)
./scripts/deploy-unified.sh prod --skip-build

# Skip automated tests
./scripts/deploy-unified.sh prod --skip-tests

# Force rebuild all images
./scripts/deploy-unified.sh prod --force-rebuild

# Show deployment plan without executing
./scripts/deploy-unified.sh prod --dry-run

# Run database migrations only
./scripts/deploy-unified.sh --migrate

# Clean up old resources
./scripts/deploy-unified.sh --cleanup
```

## Health Monitoring

### Health Check Endpoints
- **Overall Health**: `http://localhost/health`
- **Backend API**: `http://localhost/health/backend`
- **Finance API**: `http://localhost/health/finance`
- **Frontend**: `http://localhost/health/frontend`

### Monitoring Commands
```bash
# Detailed health check with JSON output
./deployment/scripts/health-check-unified.sh --once --json --verbose

# Monitor specific service only
./deployment/scripts/health-check-unified.sh --once --service finance

# Continuous monitoring with alerts
./deployment/scripts/health-check-unified.sh --interval 300 --notify --email

# Show health history
./deployment/scripts/health-check-unified.sh --history

# Show performance metrics
./deployment/scripts/health-check-unified.sh --metrics
```

### Monitoring Metrics
The unified health monitoring provides:
- **Service Status**: Health of all containers and applications
- **System Metrics**: CPU, memory, and disk usage
- **Database Metrics**: Connection counts, database sizes
- **Performance Metrics**: Response times, request rates
- **Network Statistics**: Active connections and traffic patterns

## Migration Process

### Pre-Migration Checklist
- [ ] **Backup Current Data**: Export all databases and configurations
- [ ] **Document Current Setup**: Note custom configurations and changes
- [ ] **Test Staging Environment**: Verify unified deployment in staging
- [ ] **Prepare Rollback Plan**: Document rollback procedures

### Migration Steps
1. **Backup Phase**
   ```bash
   # Create comprehensive backup
   ./scripts/deploy-unified.sh prod --cleanup
   ./deployment/scripts/backup-unified.sh --all
   ```

2. **Environment Setup**
   ```bash
   # Set up unified environment
   cp .env.example .env.unified
   # Edit with production values
   ```

3. **Test Deployment**
   ```bash
   # Deploy to staging first
   ./scripts/deploy-unified.sh staging --dry-run
   ./scripts/deploy-unified.sh staging
   ```

4. **Production Deployment**
   ```bash
   # Deploy to production with monitoring
   ./scripts/deploy-unified.sh prod --monitor
   ```

5. **Verification**
   ```bash
   # Run comprehensive health checks
   ./deployment/scripts/health-check-unified.sh --once --verbose
   ```

6. **Cleanup**
   ```bash
   # Remove old deployment files
   ./scripts/deploy-unified.sh --cleanup
   ```

### Rollback Procedures
```bash
# Quick rollback to previous version
./scripts/deploy-unified.sh prod --rollback

# Full rollback to original configuration
./scripts/rollback-to-original.sh
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failures
```bash
# Check PostgreSQL container
docker ps | grep postgres
docker logs medcoverage_postgres_unified

# Test database connectivity
docker exec medcoverage_postgres_unified psql -U postgres -d medical_coverage -c "SELECT 1;"
```

#### 2. Service Communication Issues
```bash
# Check network connectivity
docker network ls | grep medcoverage
docker network inspect medcoverage_unified_network

# Test service communication
docker exec medcoverage_backend_unified curl -f http://finance-unified:5000/api/finance/health
```

#### 3. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep -E ":(80|443|3000|3001|5000|5432|6379)"

# Stop conflicting services
sudo systemctl stop nginx  # If system nginx is running
```

#### 4. Health Check Failures
```bash
# Run detailed health check
./deployment/scripts/health-check-unified.sh --once --verbose

# Check specific service
./deployment/scripts/health-check-unified.sh --once --service finance
```

### Log Locations
- **Application Logs**: `logs/` and `logs/finance/`
- **Nginx Logs**: `deployment/logs/nginx/`
- **Database Logs**: Docker container logs
- **Health Check Logs**: Health check script output

### Getting Help
1. **Check Health Status**: Run health check script first
2. **Review Logs**: Check relevant service logs
3. **Verify Configuration**: Ensure `.env.unified` is correct
4. **Test Connectivity**: Verify network and database connections
5. **Community Support**: Check GitHub issues and documentation

## Performance Optimization

### Resource Allocation
- **CPU**: Backend (0.5 cores), Finance (0.25 cores), Frontend (0.25 cores)
- **Memory**: Total 4GB+ recommended for production
- **Storage**: SSD recommended for database performance
- **Network**: Gigabit network for optimal performance

### Optimization Tips
1. **Database Optimization**
   - Use connection pooling
   - Optimize queries with proper indexing
   - Monitor slow queries

2. **Redis Optimization**
   - Configure appropriate memory limits
   - Use Redis clustering for large deployments
   - Monitor memory usage patterns

3. **Application Optimization**
   - Enable gzip compression
   - Use CDN for static assets
   - Implement caching strategies

### Scaling Considerations
- **Horizontal Scaling**: Use Docker Swarm or Kubernetes
- **Database Scaling**: Consider read replicas for high load
- **Load Balancing**: Multiple frontend/backend instances
- **Caching**: Multi-level caching (Redis, CDN, Application)

## Security Considerations

### Network Security
- **Internal Communication**: Services communicate over internal Docker network
- **External Access**: Only Nginx exposed to external traffic
- **Firewall Rules**: Proper port filtering and access control
- **SSL/TLS**: Enable HTTPS for production deployments

### Application Security
- **Authentication**: Strong JWT secrets and proper session management
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Audit Logging**: Comprehensive audit trail for compliance

### HIPAA Compliance
- **Data Protection**: Patient data properly protected and encrypted
- **Access Controls**: Strict access controls and authentication
- **Audit Trails**: Complete audit logs for all data access
- **Business Continuity**: Regular backups and disaster recovery planning

## Maintenance

### Regular Tasks
- **Backups**: Automated daily backups with retention policies
- **Updates**: Regular security updates and patch management
- **Monitoring**: Continuous health monitoring and alerting
- **Performance**: Regular performance optimization and tuning

### Maintenance Commands
```bash
# Update deployment
./scripts/deploy-unified.sh prod --skip-backup

# Clean up resources
./scripts/deploy-unified.sh --cleanup

# Rotate logs
./deployment/scripts/rotate-logs.sh

# Update SSL certificates
./deployment/scripts/update-ssl.sh
```

## Support and Documentation

- **Documentation**: Check inline comments and configuration files
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our community discussions
- **Support**: Contact support team for enterprise assistance

---

**Version**: 3.0.0
**Last Updated**: 2024
**Compatible With**: Docker 20.10+, Docker Compose 2.0+