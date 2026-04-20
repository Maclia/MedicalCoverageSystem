# Multi-stage build for the frontend application
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl dumb-init

# Dependencies stage - copy package files FIRST for layer caching
FROM base AS deps
WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev) for building
RUN npm install --legacy-peer-deps && npm cache clean --force

# Development stage
FROM base AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for development
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the development server
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder

WORKDIR /app

# Copy from dependencies stage first (for layer caching)
COPY --from=deps /app/node_modules ./node_modules

# Copy package files and source
COPY package*.json tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY index.html ./

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user explicitly (nginx user may already exist)
RUN addgroup -g 1001 -S appuser 2>/dev/null || true && \
    adduser -S appuser -u 1001 -G appuser 2>/dev/null || true

# Set correct permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to nginx user (already non-root)
USER nginx

# Expose port
EXPOSE 80

# Environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Test stage (for running tests)
FROM base AS test

WORKDIR /app

# Copy from dependencies stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files and source
COPY package*.json ./
COPY src ./src
COPY jest.config.js tsconfig.test.json ./
COPY public ./public

# Expose port for test development
EXPOSE 5173

# Run tests (can be overridden with docker run)
CMD ["npm", "run", "test"]