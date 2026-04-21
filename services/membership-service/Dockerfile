# Multi-stage build for Membership Service
FROM node:20-alpine AS dependencies

WORKDIR /app/services/membership-service

# Copy package files first (for layer caching optimization)
COPY services/membership-service/package*.json ./

# Install all dependencies (including dev) for build
RUN npm install --legacy-peer-deps && npm cache clean --force

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/services/membership-service

# Install system dependencies
RUN apk add --no-cache dumb-init

# Copy from dependencies stage
COPY --from=dependencies /app/services/membership-service/node_modules ./node_modules
COPY services/membership-service/package*.json services/membership-service/tsconfig.json ./

# Copy source code
COPY services/membership-service/src/ ./src/
COPY shared/ /app/shared/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app/services/membership-service

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create app user (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S membership -u 1001 -G nodejs

# Copy package files
COPY services/membership-service/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=membership:nodejs /app/services/membership-service/dist ./dist
COPY --chown=membership:nodejs shared/ /app/shared/

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R membership:nodejs /app

# Switch to non-root user
USER membership

# Expose port
EXPOSE 3005

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
