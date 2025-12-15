# Multi-stage build for the backend application
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3 \
    make \
    g++ \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy package files
COPY package.json package-lock.json* ./

# Configure npm for network resilience
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set prefer-online true && \
    npm config set use-ipv4 true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi

# Install all dependencies
RUN npm ci --include=dev

# Development stage
FROM base AS development

# Install system dependencies for development
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Go to parent directory to access full project
WORKDIR /app

# Copy root package files
COPY ../package.json ../package-lock.json* ./

# Configure npm for network resilience
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set prefer-online true && \
    npm config set use-ipv4 true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi

# Install dependencies
RUN npm ci --include=dev

# Copy all source code (server, shared, client for types)
COPY ../ .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application in development mode
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Go to parent directory for full project build
WORKDIR /app

# Copy root package files
COPY ../package.json ../package-lock.json* ./

# Configure npm for network resilience
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set prefer-online true && \
    npm config set use-ipv4 true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi

# Install all dependencies
RUN npm ci --include=dev

# Copy all source code
COPY ../ .

# Build the application (server only)
RUN npm run build:server

# Production stage
FROM base AS production
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    dumb-init \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

# Copy root package.json
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Copy production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built server application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy shared code (database schema, types)
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Test stage (for running tests)
FROM base AS test
WORKDIR /app

# Install test dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy package files
COPY package.json package-lock.json* ./

# Configure npm for network resilience
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set prefer-online true && \
    npm config set use-ipv4 true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi

# Install all dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Run tests
CMD ["npm", "run", "test"]