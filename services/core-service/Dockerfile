# ================================================
# ✅ STANDARD DOCKERFILE - ALL SERVICES MUST USE THIS
# ================================================
# Multi-stage optimized production build
# 
# ALL SERVICES FOLLOW THIS EXACT SAME DOCKERFILE
# No customizations allowed - this ensures 100% consistency
# Ports, commands and environment are handled at runtime

FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files first (for proper Docker layer caching)
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps && npm cache clean --force

# ================================================
# BUILD STAGE
# ================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Copy from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ================================================
# PRODUCTION STAGE
# ================================================
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Create non-root user (security best practice)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application and node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY package*.json ./

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