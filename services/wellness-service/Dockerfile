# Multi-stage build for Wellness Service
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files first (for layer caching optimization)
COPY package*.json ./

# Install all dependencies (including dev) for build
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Copy from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create app user (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S wellness -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=wellness:nodejs /app/dist ./dist

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R wellness:nodejs /app

# Switch to non-root user
USER wellness

# Expose port
EXPOSE 3008

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3008/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:3008/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]