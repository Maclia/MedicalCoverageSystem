# ================================================
# ✅ STANDARD DOCKERFILE - ALL SERVICES MUST USE THIS
# ================================================
# Multi-stage optimized production build
# 
# ALL SERVICES FOLLOW THIS EXACT SAME DOCKERFILE
# No customizations allowed - this ensures 100% consistency
# Ports, commands and environment are handled at runtime

FROM node:20-alpine AS dependencies

WORKDIR /app/services/core-service

# Copy package files first (for proper Docker layer caching)
COPY services/core-service/package*.json ./

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps && npm cache clean --force

# ================================================
# BUILD STAGE
# ================================================
FROM node:20-alpine AS builder

WORKDIR /app/services/core-service

# Install system dependencies
RUN apk add --no-cache dumb-init

# Copy from dependencies stage
COPY --from=dependencies /app/services/core-service/node_modules ./node_modules
COPY services/core-service/package*.json services/core-service/tsconfig.json ./

# Copy source code
COPY services/core-service/src ./src
# Copy all shared files required for build (including types, schemas, utilities)
# Path is relative to docker build context (project root)
RUN mkdir -p /app/services/shared
COPY services/shared /app/services/shared
# Copy root shared types directory (used for @shared/types imports)
RUN mkdir -p /app/shared
COPY shared /app/shared

# Build TypeScript with a bounded heap for Alpine-based containers
RUN node --max-old-space-size=2048 ./node_modules/typescript/bin/tsc --incremental false --skipLibCheck
# ================================================
# PRODUCTION STAGE
# ================================================
FROM node:20-alpine

WORKDIR /app/services/core-service

# Install system dependencies
RUN apk add --no-cache dumb-init

# Create non-root user (security best practice)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application and node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/services/core-service/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/core-service/node_modules ./node_modules
COPY services/core-service/package*.json ./

# Prune development dependencies (already installed, just remove dev ones)
RUN npm prune --omit=dev --legacy-peer-deps && npm cache clean --force

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Standard health check - works for ALL services
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Standard start command - ALL services use dist/server.js
CMD ["node", "dist/server.js"]
