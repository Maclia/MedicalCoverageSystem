# Multi-stage build for the backend application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    python3 \
    make \
    g++ \
    postgresql-client

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/

# Install all dependencies
RUN npm ci --include=dev

# Development stage
FROM base AS development
WORKDIR /app

# Install system dependencies for development
RUN apk add --no-cache \
    curl \
    postgresql-client \
    drizzle-kit

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads/contracts

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application in development mode
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client \
    dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Create necessary directories
RUN mkdir -p /app/uploads/contracts && \
    chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Test stage (for running tests)
FROM base AS test
WORKDIR /app

# Install test dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/

# Install all dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Run tests
CMD ["npm", "run", "test"]