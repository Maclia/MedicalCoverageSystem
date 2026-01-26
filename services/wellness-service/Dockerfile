# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (prefer lockfile if present)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S wellness -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=wellness:nodejs /app/dist ./dist
COPY --from=builder --chown=wellness:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=wellness:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown wellness:nodejs /app/logs

# Switch to non-root user
USER wellness

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:3008/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]