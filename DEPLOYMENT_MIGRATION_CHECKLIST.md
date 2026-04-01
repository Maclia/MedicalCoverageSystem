# Deployment Refactoring - Quick Start Guide

## 🚀 5-Minute Quick Start

### Step 1: Backup Current Configuration (2 min)
```bash
# Backup original files
cp docker-compose.yml docker-compose.yml.backup
cp run-all-services.sh run-all-services.sh.backup
cp run-all-services.bat run-all-services.bat.backup

# Keep backups in archive
mkdir -p .backup-archive
cp docker-compose.yml.backup .backup-archive/$(date +%Y%m%d-%H%M%S)-docker-compose.yml
```

### Step 2: Deploy New Files (1 min)
```bash
# Copy refactored docker-compose.yml
cp docker-compose.yml.refactored docker-compose.yml

# Make scripts executable (Linux/Mac)
chmod +x deployment/scripts/orchestrate.sh
chmod +x deployment/scripts/services-config.sh

# Done! Files are ready
```

### Step 3: Test Configuration (2 min)
```bash
# Show service configuration
./deployment/scripts/services-config.sh

# Start development environment
./orchestrate.sh dev start full

# Check health
./orchestrate.sh dev status

# Stop services
./orchestrate.sh dev stop
```

---

## 📋 Complete Migration Checklist

### Pre-Migration (Day 1)

- [ ] Read DEPLOYMENT_REFACTORING_SUMMARY.md
- [ ] Read DEPLOYMENT_REFACTORING_GUIDE.md  
- [ ] Created backups of docker-compose.yml
- [ ] Created backups of run-all-services.sh
- [ ] Created backups of run-all-services.bat
- [ ] Discussed changes with team
- [ ] Got approval to proceed

### Migration Day

- [ ] Deploy docker-compose.yml.refactored
- [ ] Copy orchestrate.sh to deployment/scripts/
- [ ] Copy orchestrate.bat to deployment/scripts/
- [ ] Copy services-config.sh to deployment/scripts/
- [ ] Copy services-config.bat to deployment/scripts/
- [ ] Make scripts executable: `chmod +x deployment/scripts/*.sh`
- [ ] Verify file permissions

### Initial Testing (Development)

- [ ] Test: `./orchestrate.sh dev start full`
- [ ] Wait for all services to start
- [ ] Test: `./orchestrate.sh dev status`
- [ ] Verify all 9 services + 2 infrastructure containers = 11 running
- [ ] Test: `./orchestrate.sh dev logs core-service` (should show logs)
- [ ] Test: `./orchestrate.sh dev stop` (clean shutdown)
- [ ] Test: `./orchestrate.sh dev start` (no DB setup, faster)

### Integration Testing

- [ ] Frontend loads: http://localhost:3000
- [ ] API Gateway responds: http://localhost:3001/health
- [ ] Can create/read data through frontend
- [ ] Database queries work
- [ ] Service-to-service communication works
- [ ] Error handling works (stop a service, observe graceful handling)

### Configuration Setup (Optional)

If using environment-specific configs:

- [ ] Create `.env.development` (optional, defaults work)
- [ ] Create `.env.staging` (if staging environment)
- [ ] Create `.env.production` (before production deployment)
- [ ] Verify environment loading: `cat .env.production`
- [ ] Test: `./orchestrate.sh staging start`

### Documentation Updates

- [ ] Update README.md with new commands
- [ ] Update DEPLOYMENT.md with new procedures
- [ ] Create DEPLOYMENT_COMMANDS_REFERENCE.md for team
- [ ] Update CI/CD pipeline if applicable
- [ ] Update team wiki/Confluence
- [ ] Create training materials

### Production Readiness

- [ ] Test full deployment in production environment
- [ ] Verify health checks work
- [ ] Verify logging shows correct environment
- [ ] Verify service discovery works (if used)
- [ ] Test rollback procedure (restore .backup)
- [ ] Document any custom configuration
- [ ] Get production sign-off

### Post-Migration (Day 7)

- [ ] Collect team feedback
- [ ] Document any issues encountered
- [ ] Update procedures based on learnings
- [ ] Plan deprecation of old scripts (30-day notice)
- [ ] Remove old scripts (day 31, if no issues)
- [ ] Archive backups to cold storage

---

## 🎯 Command Reference

### Quick Commands for Daily Use

```bash
# Start everything
./orchestrate.sh dev start full

# Check status
./orchestrate.sh dev status

# View specific service logs
./orchestrate.sh dev logs core-service
./orchestrate.sh dev logs api-gateway
./orchestrate.sh dev logs finance-service

# Restart a service (without stopping others)
./orchestrate.sh dev restart core-service

# Stop all services
./orchestrate.sh dev stop

# Full cleanup (after testing)
./orchestrate.sh dev clean all
./orchestrate.sh dev start full  # Fresh start

# View service configuration
./deployment/scripts/services-config.sh
```

### Environment-Specific Workflows

```bash
# Development (with database initialization)
./orchestrate.sh dev start full
./orchestrate.sh dev status
./orchestrate.sh dev logs
./orchestrate.sh dev clean containers

# Staging (restore from backup)
./orchestrate.sh staging start
./orchestrate.sh staging status
./orchestrate.sh staging restore-db staging-backup.sql

# Production (safe operations)
./orchestrate.sh prod start
./orchestrate.sh prod status
./orchestrate.sh prod logs api-gateway
./orchestrate.sh prod clean containers  # Preserve volumes!
```

---

## 🐛 Troubleshooting

### Problem: Service won't start

**Symptom**: `./orchestrate.sh dev start` shows failed services

**Solution**:
```bash
# 1. Check service logs
./orchestrate.sh dev logs problem-service

# 2. Check PostgreSQL
docker exec medical-postgres pg_isready -U postgres

# 3. Check Redis
docker exec medical-redis redis-cli ping

# 4. Clean and retry
./orchestrate.sh dev stop
./orchestrate.sh dev clean all
./orchestrate.sh dev start full
```

### Problem: Port already in use

**Symptom**: "Port 3001 already allocated"

**Solution**:
```bash
# Option 1: Stop conflicting container
docker stop $(docker ps -q --filter "ancestor=nginx:alpine")

# Option 2: Use different port (edit .env.development)
DB_PORT=5433
FRONTEND_PORT=3001
REDIS_PORT=6380

# Option 3: Find and kill process
lsof -i :3001
kill -9 <PID>
```

### Problem: Database won't initialize

**Symptom**: "medical_coverage_core" database doesn't exist

**Solution**:
```bash
# Run database setup explicitly
./orchestrate.sh dev start full

# Verify databases created
docker exec medical-postgres psql -U postgres -l | grep medical

# Check init scripts
ls -la database/init/
```

### Problem: Health checks failing

**Symptom**: Services starting but health checks return "unhealthy"

**Solution**:
```bash
# Check compose status
docker-compose ps

# Check specific service health
docker inspect medical_core_service --format='{{json .State.Health}}' | jq

# View service logs
./orchestrate.sh dev logs core-service

# Restart if needed
./orchestrate.sh dev restart core-service
```

### Problem: Windows batch script won't run

**Symptom**: "orchestrate.bat cannot be found" or permission error

**Solution**:
```powershell
# Run from PowerShell as Admin
cd deployment/scripts
.\orchestrate.bat dev start full

# Or use bash (if WSL installed)
wsl ./orchestrate.sh dev start full

# Or use Git Bash
bash ./orchestrate.sh dev start full
```

---

## 📊 Monitoring & Health

### Service Health Dashboard
```bash
# Every 10 seconds
watch -n 10 './orchestrate.sh dev status'

# Show detailed container info
docker-compose ps

# Show resource usage
docker stats

# Show detailed service logs
docker-compose logs -f --tail=50
```

### Performance Checks
```bash
# Database connection speed
docker exec medical-postgres psql -U postgres -c "SELECT version();"

# Redis connection speed
docker exec medical-redis redis-cli INFO stats

# Network connectivity
docker network inspect medical-services-network
```

---

## 🔒 Security Considerations

### Development Environment
```bash
# .env.development (safe for development)
DB_PASSWORD=postgres_password_2024
JWT_SECRET=change_me_in_development
```

### Production Environment
```bash
# .env.production (SECURE)
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
# Never commit .env.production to git!
```

**In .gitignore**:
```
.env.production
.env.staging
docker-compose.override.yml
```

---

## 📈 Scaling Up

### Adding a New Microservice

**Step 1**: Update services-config.sh
```bash
declare -gA SERVICE_PORTS=(
    # ... existing services ...
    [reports-service]=3010  # Add this line
)

declare -gA SERVICE_DATABASES=(
    # ... existing services ...
    [reports-service]="medical_coverage_reports"  # Add this line
)
```

**Step 2**: Update docker-compose.yml
```yaml
reports-service:
  <<: *service-defaults
  build:
    context: ./services/reports-service
    dockerfile: Dockerfile
  container_name: medical_reports_service
  environment:
    <<: [*service-defaults.environment]
    PORT: 3010
    DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/medical_coverage_reports
  ports:
    - "3010:3010"
```

**Step 3**: Start the service
```bash
./orchestrate.sh dev start full  # Creates database and starts all services
```

**That's it!** The new service is automatically:
- ✓ Created with database
- ✓ Added to health checks
- ✓ Added to logging
- ✓ Added to orchestration

---

## 📞 Getting Help

### Documentation Files
1. **DEPLOYMENT_REFACTORING_SUMMARY.md** - Executive overview
2. **DEPLOYMENT_REFACTORING_GUIDE.md** - Detailed guide
3. **DEPLOYMENT_COMMANDS_REFERENCE.md** - Command syntax
4. **orchestrate.sh --help** - Built-in help

### Common Questions

**Q: Can I run just one service?**
```bash
docker-compose up -d core-service  # Starts dependencies automatically
```

**Q: How do I backup the database?**
```bash
docker exec medical-postgres pg_dump -U postgres medical_coverage_core > backup.sql
```

**Q: How do I restore from backup?**
```bash
docker exec -i medical-postgres psql -U postgres medical_coverage_core < backup.sql
```

**Q: How do I update a service?**
```bash
# Rebuild and restart a service
docker-compose up -d --build core-service
```

**Q: Can I disable a service temporarily?**
```bash
docker-compose stop core-service
docker-compose start core-service
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All 11 containers running (9 services + postgres + redis)
- [ ] Frontend loads at http://localhost:3000
- [ ] API Gateway responds to health check
- [ ] Logs show no errors in first 60 seconds
- [ ] Services can communicate with each other
- [ ] Database operations work (create/read/update/delete)
- [ ] Authentication/authorization works
- [ ] Error handling works (intentionally break something)
- [ ] Admin dashboard accessible
- [ ] Health checks show "healthy" status

---

## 🎓 Best Practices

1. **Always make backups first**
   ```bash
   cp docker-compose.yml docker-compose.yml.backup
   ```

2. **Use environment files for sensitive data**
   ```bash
   # .env.production in .gitignore
   # Standard .env.development committed to git
   ```

3. **Test changes in development first**
   ```bash
   ./orchestrate.sh dev start full
   # ... test everything ...
   ./orchestrate.sh dev stop
   ```

4. **Review logs before restarting**
   ```bash
   ./orchestrate.sh dev logs problem-service
   ```

5. **Use clean shutdown**
   ```bash
   ./orchestrate.sh prod stop  # vs. docker kill
   ```

---

## 📅 Timeline

| Phase | Time | Activities |
|-------|------|-----------|
| Preparation | 24h | Read docs, plan, backup |
| Migration | 2h | Deploy files, test |
| Validation | 4h | Run through all tests |
| Documentation | 2h | Update team resources |
| Training | 1h | Team walkthrough |
| Monitoring | 24h | Watch for issues |
| Deprecation | 30d | Sunset old scripts |

---

**Version**: 1.0
**Last Updated**: December 2025
**Status**: Ready to Deploy
