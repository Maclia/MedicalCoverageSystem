# Contributing & Operations Guide

**Status**: 🟢 Active Development  
**Last Updated**: April 2, 2026

## 📋 Table of Contents

1. [Contributing Guidelines](#contributing-guidelines)
2. [Code Standards](#code-standards)
3. [Testing Strategy](#testing-strategy)
4. [Maintenance & Operations](#maintenance--operations)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Troubleshooting](#troubleshooting)
7. [Release & Deployment](#release--deployment)
8. [Knowledge Base](#knowledge-base)

---

## Contributing Guidelines

### Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/MedicalCoverageSystem.git
   cd MedicalCoverageSystem
   ```

2. **Setup Development Environment**
   ```bash
   npm install
   cp .env.example .env
   ./orchestrate.sh dev start full
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Changes & Test**
   ```bash
   npm run test:all
   npm run type:check
   npm run lint
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: Your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Add detailed description
   - Reference related issues
   - Include test evidence
   - Add documentation updates

### Commit Convention

Follow Conventional Commits:

```
feat: Add new feature
fix: Fix a bug
docs: Documentation updates
refactor: Code refactoring (no behavior change)
test: Add/update tests
chore: Build, dependency, or build tool updates
style: Code style changes (formatting)
perf: Performance improvements
ci: CI/CD changes
```

### Code Organization

When adding features:

1. **Feature Branch**: `feature/feature-name`
2. **Bug Fix Branch**: `fix/bug-name`
3. **Documentation**: `docs/improvement-name`

### Pull Request Process

**Before Creating PR**:
- ✅ Tests pass: `npm run test:all`
- ✅ No linting errors: `npm run lint:fix`
- ✅ Types correct: `npm run type:check`
- ✅ Formatted properly: `npm run format`
- ✅ Related service built: `cd services/service-name && npm run build`

**PR Checklist**:
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking API changes
- [ ] Service boundaries maintained
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Database migration provided (if needed)
- [ ] Performance impact considered

**Review Requirements**:
- 1 approval required
- All CI checks must pass
- No conflicts with main branch

---

## Code Standards

### TypeScript Standards

**Type Safety**:
```typescript
// ✅ Good: Explicit types
function createUser(email: string, password: string): Promise<User> {
  // Implementation
}

// ❌ Bad: Implicit any
function createUser(email, password) {
  // Implementation
}
```

**No Type Assertions**:
```typescript
// ✅ Good: Type guard
if (isValidUser(data)) {
  process.user(data);
}

// ❌ Bad: Type assertion (assumes type)
process.user(data as User);
```

**Error Handling**:
```typescript
// ✅ Good: Proper error handling
try {
  const user = await userService.create(data);
  return { success: true, data: user };
} catch (error) {
  logger.error('User creation failed', error);
  return { success: false, error: 'Creation failed' };
}

// ❌ Bad: Ignoring errors
const user = await userService.create(data);
return { success: true, data: user };
```

### File Structure

Keep modules organized:

```
services/core-service/src/modules/users/
├── config/
│   └── module.config.ts
├── services/
│   └── UserService.ts         # Business logic
├── routes/
│   └── user.routes.ts         # Express routes
├── handlers/
│   └── user.handler.ts        # Request handlers
├── validators/
│   └── user.validator.ts      # Input validation (Zod)
├── types/
│   └── user.types.ts          # TypeScript interfaces
└── index.ts                   # Module export
```

### Naming Conventions

```typescript
// Services: PascalCase + Service suffix
class UserService { }
class InvoiceService { }

// Functions: camelCase
function createUser() { }
function getInvoiceTotal() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_TIMEOUT = 30000;

// Interfaces/Types: PascalCase
interface User { }
type ErrorResponse = { };

// Classes: PascalCase
class User { }
class InvoiceProcessor { }

// Variables: camelCase
let currentUser: User;
const userEmail: string = '';
```

### Documentation

**Code Comments**:
```typescript
// ✅ Good: Explain why, not what
// Retry failed payment requests with exponential backoff
// to handle temporary gateway failures
async function retryPayment() { }

// ❌ Bad: Obvious comments
// Increment counter
count++;
```

**JSDoc for Public APIs**:
```typescript
/**
 * Creates a new user in the system
 * 
 * @param email - User email address
 * @param password - User password (will be hashed)
 * @returns Created user object with ID
 * @throws ValidationError if email is invalid
 * @throws DuplicateError if email already exists
 */
export async function createUser(
  email: string,
  password: string
): Promise<User> {
  // Implementation
}
```

---

## Testing Strategy

### Test Pyramid

```
         /\
        /  \  E2E Tests
       /────\
      /      \
     /────────\  Integration Tests
    /          \
   /────────────\  Unit Tests
  /              \
 /════════════════\
```

### Running Tests

```bash
# All tests
npm run test:all

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Single service
cd services/core-service && npm test
```

### Writing Tests

**Unit Test Example**:
```typescript
describe('UserService', () => {
  let userService: UserService;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    userService = new UserService(mockDatabase);
  });

  describe('createUser', () => {
    it('should create user with valid email', async () => {
      const result = await userService.create({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error for duplicate email', async () => {
      mockDatabase.users.push({ email: 'test@example.com' });

      await expect(
        userService.create({
          email: 'test@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(DuplicateError);
    });
  });
});
```

**Integration Test Example**:
```typescript
describe('User API Integration', () => {
  let app: Express.Application;
  let db: Database;

  beforeAll(async () => {
    app = createApp();
    db = await DatabaseFactory.create('test');
    await db.migrate();
  });

  describe('POST /api/core/users', () => {
    it('should create user via API', async () => {
      const response = await request(app)
        .post('/api/core/users')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
    });
  });

  afterAll(async () => {
    await db.teardown();
  });
});
```

### Coverage Requirements

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all critical paths
- **E2E Tests**: Cover user workflows
- **Target**: 75%+ overall coverage

---

## Maintenance & Operations

### Regular Maintenance Tasks

**Daily**:
- Monitor service health endpoints
- Check error logs for anomalies
- Verify backup completion

**Weekly**:
- Review slow query logs
- Check database disk space
- Validate backup integrity

**Monthly**:
- Database maintenance (VACUUM, ANALYZE)
- Dependency updates (npm audit)
- Security review
- Performance analysis

### Database Maintenance

```bash
# Connect to database
docker-compose exec postgres psql -U postgres

# Analyze and vacuum
VACUUM ANALYZE medical_coverage_core;

# Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Backup Strategy

```bash
# Full database backup
docker-compose exec postgres pg_dump -U postgres \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup all databases
docker-compose exec postgres pg_dumpall -U postgres \
  > full_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_20260402.sql

# Upload to remote storage
aws s3 cp backup_20260402.sql.gz s3://backups/medical-coverage/
```

### Restore from Backup

```bash
# Restore specific database
docker-compose exec -T postgres psql -U postgres medical_coverage_core \
  < backup_20260402.sql

# Restore with progress
docker-compose exec -T postgres \
  psql -U postgres -f /dev/stdin < backup_20260402.sql
```

### Database Migrations

```bash
# Deploy all schemas
npm run db:push:all

# Deploy service-specific schema
npm run db:push:core
npm run db:push:insurance

# Open database studio
npm run db:studio
```

---

## Monitoring & Alerts

### Health Monitoring

```bash
# Check all services
curl -s http://localhost:3001/health | jq

# Expected response
{
  "status": "healthy",
  "services": {
    "core-service": "healthy",
    "api-gateway": "healthy",
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Log Monitoring

```bash
# Real-time logs
docker-compose logs -f

# Specific service
docker-compose logs -f core-service

# Since specific time
docker-compose logs --since 10m api-gateway

# Filter by level
docker-compose logs api-gateway | grep -E "ERROR|WARN"
```

### Performance Monitoring

```bash
# Container resource usage
docker stats

# Service metrics
docker-compose ps

# Database connections
docker-compose exec postgres psql -U postgres -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Redis memory
docker-compose exec redis redis-cli INFO memory
```

### Alerting Setup

Configure alerts for:
- Service unavailability (health check failed)
- High error rate (>5% of requests)
- Database disk space (>80% full)
- Connection pool exhaustion
- Slow response times (>1s)
- Authentication failures

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Common causes:
# 1. Port already in use
netstat -ano | findstr :3001

# 2. Environment variables missing
docker-compose config | grep DATABASE_URL

# 3. Database not ready
docker-compose logs postgres

# 4. Dependency not started
docker-compose ps  # Check all services
```

### Database Connection Issues

```bash
# Test database connection
docker-compose exec core-service npm run test:db

# Check database exists
docker-compose exec postgres psql -U postgres -l

# Check connection from service
docker-compose exec core-service \
  node -e "require('pg').connect('postgresql://...')"

# Reset database
docker-compose down -v
docker-compose up -d
```

### Out of Memory

```bash
# Check resource limits
docker stats

# Increase memory
# In docker-compose.yml:
services:
  core-service:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### High CPU Usage

```bash
# Identify hot services
docker stats --no-stream

# Check for infinite loops
docker-compose logs service-name | grep -E "ERROR|exception"

# Review recent changes
git log --oneline -10

# Performance profile
docker-compose exec service-name npm run profile
```

### Stuck Processes

```bash
# List processes
docker-compose ps

# Kill service
docker-compose restart service-name

# Force kill
docker kill medical_core_service

# Complete restart
docker-compose down
docker-compose up -d
```

---

## Release & Deployment

### Version Numbering

Follow Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Process

1. **Create Release Branch**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update Version**
   ```bash
   npm version minor --workspaces
   git add package.json package-lock.json
   ```

3. **Update Changelog**
   ```
   ## [1.2.0] - 2026-04-02
   
   ### Added
   - New feature description
   
   ### Fixed
   - Bug fix description
   ```

4. **Tag Release**
   ```bash
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin release/v1.2.0 --tags
   ```

5. **Merge to Main**
   ```bash
   git checkout main
   git merge release/v1.2.0
   git push origin main
   ```

6. **Deploy to Production**
   ```bash
   # Automatically deployed via CI/CD
   # Or manual:
   ./orchestrate.sh prod start
   ```

### Rollback Procedure

```bash
# If deployment fails, rollback to previous version
git checkout v1.1.0
docker-compose down
docker-compose up -d --build

# Verify health
curl http://localhost:3001/health

# If still broken, investigate logs
docker-compose logs -f api-gateway
```

---

## Knowledge Base

### Known Issues

**Issue**: Memory leak in API Gateway
- **Status**: Investigating
- **Workaround**: Restart service weekly
- **Fix**: Expected in v1.2.1

**Issue**: Slow payment processing at end of month
- **Status**: Root cause: Database maintenance window
- **Solution**: Configured maintenance for off-peak hours

**Issue**: Redis connection timeout on load spike
- **Status**: Increasing connection pool size
- **Fix**: Deploy when completed

### FAQ

**Q: How do I contribute?**
A: Follow the [Contributing Guidelines](#contributing-guidelines) above.

**Q: How do I report a bug?**
A: Create an issue with:
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information

**Q: How do I request a feature?**
A: Create a discussion with your use case and desired behavior.

**Q: How do I scale a specific service?**
A: 
```bash
docker-compose up -d --scale core-service=3
```

**Q: How do I update a service in production?**
A:
```bash
docker build -t core-service services/core-service
docker tag core-service myregistry/core-service:v1.2.0
docker push myregistry/core-service:v1.2.0
# Update deployment
```

### Resources

- **Documentation**: See other .md files in root
- **API Reference**: [API_REFERENCE.md](API_REFERENCE.md)
- **Architecture**: [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)
- **Deployment**: [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md)
- **Development**: [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)

### Getting Help

1. **Check documentation** - Most answers are in the .md files
2. **Search issues** - Someone may have had the same problem
3. **Ask in discussions** - For general questions
4. **Report bug** - If you found a new issue

---

**Last Updated**: April 2, 2026
**Maintained By**: Development Team
**Next Review**: May 2, 2026
