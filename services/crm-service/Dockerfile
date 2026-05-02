# ================================================
# ✅ CRM SERVICE OPTIMIZED DOCKERFILE
# Fixes: EOF / Network timeout during npm install
# ================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init python3 make gcc g++

# Increase npm timeout and memory limits
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NPM_CONFIG_FETCH_TIMEOUT=600000
ENV NPM_CONFIG_NETWORK_TIMEOUT=600000

# Copy package files
COPY package*.json tsconfig.json ./

# Install all dependencies once (single install pass)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies before final stage
RUN npm prune --omit=dev && npm cache clean --force

# ================================================
# PRODUCTION FINAL STAGE
# ================================================
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy only required artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3005) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
