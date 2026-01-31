# Build stage
FROM node:18-alpine AS base

RUN apk add --no-cache dumb-init

FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (prefer lockfile if present)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM base AS production

# Create app user
RUN addgroup -g 1001 -S membership && \
    adduser -S membership -u 1001 -G membership

WORKDIR /app

# Copy package files
COPY --from=builder --chown=membership:membership /app/package*.json ./

# Copy built application
COPY --from=builder --chown=membership:membership /app/dist ./dist
COPY --from=builder --chown=membership:membership /app/node_modules ./node_modules

# Create logs directory
RUN mkdir -p /app/logs && chown membership:membership /app/logs

# Switch to non-root user
USER membership

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]