# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app/services/hospital-service

# Copy package files
COPY services/hospital-service/package*.json ./

# Install all dependencies (prefer lockfile if present)
RUN if [ -f package-lock.json ]; then npm install --legacy-peer-deps; else npm install --legacy-peer-deps; fi

# Copy source code
COPY services/hospital-service/ ./
COPY shared/ /app/shared/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app/services/hospital-service

# Copy package files
COPY services/hospital-service/package*.json ./

# Install only production dependencies (prefer lockfile if present)
RUN if [ -f package-lock.json ]; then npm install --omit=dev --legacy-peer-deps; else npm install --omit=dev --legacy-peer-deps; fi && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/services/hospital-service/dist ./dist
COPY --chown=nodejs:nodejs shared/ /app/shared/

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
