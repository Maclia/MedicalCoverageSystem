# Multi-stage build for MedicalCoverageSystem
# Optimized for Node.js 20 with ES modules and authentication features
FROM node:20-alpine AS base

# Install dependencies needed for native modules and system tools
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies with audit
RUN npm ci --only=production && \
    npm cache clean --force && \
    npm audit --audit-level=high

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application with optimized client bundle
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling and additional system tools
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --shell /bin/bash nodejs

# Copy built application from builder with correct permissions
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy essential application files
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=nodejs:nodejs /app/server/database ./server/database
COPY --from=builder --chown=nodejs:nodejs /app/server/services ./server/services
COPY --from=builder --chown=nodejs:nodejs /app/server/routes ./server/routes

# Create necessary directories with proper permissions
RUN mkdir -p \
    /app/uploads \
    /app/logs \
    /app/backups \
    /app/temp \
    /app/public && \
    chown -R nodejs:nodejs /app/uploads /app/logs /app/backups /app/temp /app/public

# Security: Set proper file permissions
RUN chmod -R 755 /app/dist && \
    chmod -R 644 /app/shared && \
    chmod -R 755 /app/server/database

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Environment variables for production
ENV PORT=5000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV JWT_SECRET=your-production-jwt-secret-change-this
ENV JWT_REFRESH_SECRET=your-production-refresh-secret-change-this
ENV DB_SSL=true
ENV CORS_ORIGIN=https://your-production-domain.com

# Add health check with proper timeout and retry logic including finance services
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health && curl -f http://localhost:5000/api/finance/health || exit 1

# Add custom labels for better orchestration
LABEL maintainer="MedicalCoverageSystem Team" \
      version="3.0.0" \
      description="Medical Coverage System with Finance Management, Authentication and Role-Based Access" \
      org.opencontainers.image.source="https://github.com/your-org/medical-coverage-system" \
      finance.modules="billing,payments,commissions,claims-financial" \
      finance.api.version="1.0.0"

# Start the application with proper signal handling and optimized memory usage
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--max-old-space-size=2048", "dist/index.js"]