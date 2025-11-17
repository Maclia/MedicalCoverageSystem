#!/bin/bash

# Docker startup script for MedicalCoverageSystem
set -e

echo "🏥 Starting Medical Coverage System in Docker..."

# Wait for database if running in docker-compose
if [ -n "$DATABASE_URL" ]; then
    echo "📊 Database URL detected: $DATABASE_URL"

    # Extract database host from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')

    if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ]; then
        echo "⏳ Waiting for database at $DB_HOST..."
        while ! nc -z $DB_HOST 5432; do
            echo "🔌 Database is unavailable - sleeping..."
            sleep 2
        done
        echo "✅ Database is ready!"
    fi
fi

# Create necessary directories
mkdir -p /app/logs
mkdir -p /app/uploads

# Set permissions
chown -R nextjs:nodejs /app/logs
chown -R nextjs:nodejs /app/uploads

# Log environment (without secrets)
echo "🌍 Environment: $NODE_ENV"
echo "🚀 Port: $PORT"
echo "🔧 JWT Secret configured: $(if [ -n "$JWT_SECRET" ]; then echo "Yes"; else echo "No - USING DEFAULT!"; fi)"

# Run database migrations if available
if [ "$NODE_ENV" = "production" ]; then
    echo "🔄 Running database migrations..."
    npm run db:push 2>/dev/null || echo "⚠️  Migration failed - continuing anyway..."
fi

# Start the application
echo "🎯 Starting Medical Coverage System..."
exec npm start