# Docker Optimization Checklist

Use this checklist when creating new services or updating existing Dockerfiles.

## Pre-Build Checklist

- [ ] **package.json reviewed**: All dependencies are necessary for production
- [ ] **devDependencies identified**: Jest, ESLint, TypeScript, ts-jest, @types/* are dev-only
- [ ] **package-lock.json exists**: For reproducibility across environments
- [ ] **Build script verified**: `npm run build` produces `dist/` directory
- [ ] **Health check endpoint defined**: Service responds to `GET /health` with 200
- [ ] **Port number confirmed**: Matches docker-compose.yml and EXPOSE directive

## Dockerfile Structure Checklist

### Stage 1: Dependencies
```dockerfile
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files FIRST (must be before source code for layer caching)
COPY package*.json ./

# Install for building (not production)
RUN npm ci --legacy-peer-deps && npm cache clean --force
```
- [ ] Named stage: `dependencies`
- [ ] Copies ONLY package files (not source)
- [ ] Uses `npm ci` (not `npm install`)
- [ ] Includes `npm cache clean --force`
- [ ] Uses `--legacy-peer-deps` if service requires it

### Stage 2: Builder
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache dumb-init

# Copy from previous stage (layer cache optimization)
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./

# Copy source code
COPY src ./src

# Build application
RUN npm run build
```
- [ ] Named stage: `builder`
- [ ] Installs `dumb-init` with `apk add --no-cache`
- [ ] Copies `node_modules` FROM dependencies stage
- [ ] Copies `package*.json` and `tsconfig.json` (if needed)
- [ ] Copies `src/` directory
- [ ] Runs `npm run build` or equivalent

### Stage 3: Production
```dockerfile
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user BEFORE copying files
RUN addgroup -g 1001 -S nodejs && \
    adduser -S [service-name] -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies ONLY
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built application FROM builder stage
COPY --from=builder --chown=[service-name]:nodejs /app/dist ./dist

# Create logs directory with permissions
RUN mkdir -p /app/logs && chown -R [service-name]:nodejs /app

# Switch to non-root user (must be AFTER setting permissions)
USER [service-name]

# Expose service port
EXPOSE [PORT]

# Environment variables
ENV NODE_ENV=production

# Health check (must match actual health check endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:[PORT]/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init as entrypoint (MUST be before CMD)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

- [ ] Named stage: `production`
- [ ] Installs `dumb-init` in production stage
- [ ] Creates non-root user with GID 1001, UID 1001
- [ ] Sets `--chown=[user]:[group]` when COPYing from builder
- [ ] Copies package.json (not package-lock.json to prod)
- [ ] Uses `npm ci --omit=dev` flag
- [ ] Includes `npm cache clean --force`
- [ ] Creates logs directory with chown
- [ ] Sets `ENV NODE_ENV=production`
- [ ] Includes HEALTHCHECK command
- [ ] Uses ENTRYPOINT with dumb-init
- [ ] CMD uses `["node", "dist/index.js"]` format (not npm start)
- [ ] USER directive is AFTER all permission setup

## Port & Service Configuration

| Service | Port | User | Status |
|---------|------|------|--------|
| api-gateway | 3001 | nodejs | ✅ |
| core-service | 3002 | nodejs | ✅ |
| hospital-service | 3003 | nodejs | ✅ |
| billing-service | 3004 | nodejs | ✅ |
| membership-service | 3005 | nodejs | ✅ |
| crm-service | 3006 | nodejs | ✅ |
| finance-service | 3007 | nodejs | ✅ |
| wellness-service | 3008 | nodejs | ✅ |
| fraud-detection-service | 3009 | nodejs | ✅ |
| client | 80 | nginx | ✅ |

## Build & Test Checklist

### Build Command
```bash
docker build -t medical-[service-name] ./services/[service-name]
```
- [ ] Build succeeds without errors
- [ ] Build completes in <2 minutes (indicates caching working)
- [ ] Final image size is 200-350 MB (typical for Node service)

### Run & Test
```bash
docker run -p [PORT]:[PORT] medical-[service-name]
```
- [ ] Container starts without errors
- [ ] Port is accessible: `curl http://localhost:[PORT]/health`
- [ ] Returns HTTP 200 with JSON response
- [ ] Logs are readable: `docker logs [container-id]`

### Signal Handling Test
```bash
docker stop [container-id]
```
- [ ] Container stops within 3 seconds
- [ ] No timeout forced by Docker (would indicate signal not handled)
- [ ] Logs show graceful shutdown message (if implemented)

### Security Scanning
```bash
docker inspect medical-[service-name] | grep '"User"'
```
- [ ] User is NOT "root"
- [ ] User is "nodejs" or service-specific user
- [ ] UID is 1001 (non-privileged)

## Common Issues & Fixes

### ❌ "npm not found" in production stage
**Fix**: Ensure `npm ci` runs in production stage before setting USER
```dockerfile
RUN npm ci --omit=dev ...  # Must be before USER
USER nodejs
```

### ❌ Health check always fails
**Fix**: Verify health endpoint exists and correct port is used
```bash
# Test locally first
npm run dev  # or appropriate start command
curl http://localhost:3001/health  # Correct port
```

### ❌ Takes 30+ seconds to start
**Fix**: Increase `startPeriod` in HEALTHCHECK
```dockerfile
HEALTHCHECK --start-period=30s  # Give more time to startup
```

### ❌ Container uses full 1GB+ storage
**Fix**: Missing `--omit=dev` in production stage
```dockerfile
RUN npm ci --omit=dev --legacy-peer-deps  # Must include --omit=dev
```

### ❌ Signal not handled, 10s timeout on stop
**Fix**: Ensure `dumb-init` is installed and used correctly
```dockerfile
RUN apk add --no-cache dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]  # Must be exact path
```

### ❌ `npm ERR! peer dep missing`
**Fix**: Use `--legacy-peer-deps` flag
```dockerfile
RUN npm ci --omit=dev --legacy-peer-deps
```

## Layer Caching Optimization

### Before (❌ Bad - rebuilds on source change)
```dockerfile
COPY . .
RUN npm install
```

### After (✅ Good - reuses cached layers)
```dockerfile
# Stage 1: Get dependencies
FROM base AS dependencies
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
RUN npm run build

# Stage 3: Production
FROM base AS production
COPY --from=builder /app/dist ./dist
```

**Result**: 70%+ faster rebuilds when only source code changes

## Docker Compose Integration

Ensure docker-compose.yml includes:
```yaml
services:
  [service-name]:
    build:
      context: ./services/[service-name]
      dockerfile: Dockerfile
    ports:
      - "[PORT]:[PORT]"
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:[PORT]/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

- [ ] Service name is lowercase with hyphens
- [ ] Port mapping is correct
- [ ] NODE_ENV is set to "production"
- [ ] Healthcheck matches Dockerfile HEALTHCHECK
- [ ] depends_on includes databases (if needed)

## Review Checklist (Final)

- [ ] Dockerfile passes `docker lint` or similar tool
- [ ] Image builds in <2 min (layer caching working)
- [ ] Image size is 200-350 MB (not 500+ MB)
- [ ] Health check passes: `curl http://localhost:[PORT]/health`
- [ ] Container is non-root: `docker inspect | grep User`
- [ ] Graceful shutdown works: `docker stop` completes in <3s
- [ ] Logs are accessible: `docker logs [container-id]`
- [ ] docker-compose.yml references service correctly
- [ ] Documentation updated with correct port number
- [ ] Team is notified of new service deployment

## Quick Reference Commands

```bash
# Build individual service
docker build -t medical-core ./services/core-service

# Build all services
docker-compose build

# Check image size
docker images | grep medical

# View build layers
docker history medical-core-service

# Inspect user/permissions
docker inspect medical-core-service | grep -A5 -B5 "User"

# Test health check
docker run -d -p 3002:3002 medical-core-service
curl http://localhost:3002/health

# Check logs
docker logs [container-id]

# Test graceful shutdown (should complete in <3s)
docker stop [container-id]

# Cleanup
docker system prune -a  # Remove unused images/containers
```

---

**Last Updated**: December 21, 2025  
**Version**: 2.0  
**Status**: Active & Maintained
