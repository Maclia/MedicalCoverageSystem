# ================================================
# ✅ PREMIUM CALCULATION SERVICE DOCKERFILE - WITH SHARED DEPENDENCIES
# ================================================
# Multi-stage optimized production build

FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy root package files first
COPY package*.json ./

# Copy shared packages package files
COPY services/shared/business-rules/package*.json ./services/shared/business-rules/
COPY services/shared/message-queue/package*.json ./services/shared/message-queue/

# Copy premium calculation service package files
COPY services/premium-calculation-service/package*.json ./services/premium-calculation-service/

# Install all dependencies at root level
RUN npm install --legacy-peer-deps && npm cache clean --force

# ================================================
# BUILD STAGE
# ================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Copy entire monorepo structure
COPY . .

# Install dependencies
RUN npm install --legacy-peer-deps --no-save && npm cache clean --force

# Build only premium calculation service and its dependencies
RUN cd services/premium-calculation-service && npm run build

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

# Copy package files
COPY package*.json ./

# Install production only dependencies
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/services/premium-calculation-service/dist ./dist

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
