# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies (prefer lockfile if present)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY src ./src
COPY tsconfig.json tsconfig.node.json ./

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install production dependencies only
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5009/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
