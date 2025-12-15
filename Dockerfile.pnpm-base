# syntax=docker/dockerfile:1.7-labs

##############################
# Base image
##############################
FROM node:20-slim AS base
ENV NODE_ENV=production
WORKDIR /app

##############################
# Dependency stage (cached)
##############################
FROM base AS deps

# Install build tools for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only package files
COPY package.json package-lock.json* ./

# Configure npm for network resilience (without use-ipv4)
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set prefer-online true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi

# Install dependencies — use BuildKit caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

##############################
# Builder stage
##############################
FROM base AS builder

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Configure npm for network resilience (without use-ipv4)
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set prefer-online true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi

# Install ALL dependencies (with cache)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy full source
COPY . .

# Build both client and server (vite + esbuild)
RUN npm run build

##############################
# Runtime (lean, secure)
##############################
FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

WORKDIR /app

# Install only what runtime needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init curl postgresql-client ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system nodejs && \
    adduser --system --ingroup nodejs nodejs

# Copy production dependency tree
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy runtime files
COPY --from=builder --chown=nodejs:nodejs /app/package.json .
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Prepare folders
RUN mkdir -p uploads logs backups temp && \
    chown -R nodejs:nodejs .

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Add custom labels for better orchestration
LABEL maintainer="MedicalCoverageSystem Team" \
      version="3.0.0" \
      description="Medical Coverage System with integrated frontend and backend" \
      org.opencontainers.image.source="https://github.com/your-org/medical-coverage-system"

# Start application with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--max-old-space-size=2048", "dist/index.js"]