#!/bin/bash

# ==========================================
# Medical Coverage System - Docker Quick Start
# ==========================================

set -e

echo "🏥 Medical Coverage System - Docker Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo -e "${YELLOW}⚠️  .env.docker not found. Creating from example...${NC}"

    if [ -f .env.docker.example ]; then
        cp .env.docker.example .env.docker
        echo -e "${GREEN}✅ Created .env.docker from example${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.docker and change the following:${NC}"
        echo "   - POSTGRES_PASSWORD"
        echo "   - REDIS_PASSWORD"
        echo "   - JWT_SECRET (min 32 characters)"
        echo "   - JWT_REFRESH_SECRET (min 32 characters)"
        echo "   - SESSION_SECRET"
        echo "   - ENCRYPTION_KEY"
        echo ""
        echo "Press Enter to open .env.docker in editor (or Ctrl+C to edit manually)"
        read -r
        ${EDITOR:-nano} .env.docker
    else
        echo -e "${RED}❌ .env.docker.example not found. Cannot create .env.docker${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Environment file ready${NC}"
echo ""

# Ask user which mode to run
echo "Select deployment mode:"
echo "1) Simple (Recommended) - Postgres + Redis + App"
echo "2) Full - All services including Nginx, monitoring, backups"
echo "3) Development - With hot reload"
echo ""
read -p "Enter choice [1-3]: " mode_choice

case $mode_choice in
    1)
        COMPOSE_FILE="docker-compose.simple.yml"
        PROFILE=""
        echo -e "${GREEN}🚀 Starting in Simple mode${NC}"
        ;;
    2)
        COMPOSE_FILE="docker-compose.yml"
        PROFILE="--profile production"
        echo -e "${GREEN}🚀 Starting in Full Production mode${NC}"
        ;;
    3)
        COMPOSE_FILE="docker-compose.yml"
        PROFILE="--profile dev"
        echo -e "${GREEN}🚀 Starting in Development mode${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice. Using Simple mode.${NC}"
        COMPOSE_FILE="docker-compose.simple.yml"
        PROFILE=""
        ;;
esac

echo ""
echo "📦 Pulling Docker images..."
docker-compose -f $COMPOSE_FILE --env-file .env.docker pull

echo ""
echo "🔨 Building application image..."
docker-compose -f $COMPOSE_FILE --env-file .env.docker build

echo ""
echo "🚀 Starting services..."
docker-compose -f $COMPOSE_FILE --env-file .env.docker $PROFILE up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service status..."
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "🏥 Health Checks:"

# Check Postgres
if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL is not ready yet${NC}"
fi

# Check Redis
if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Redis is not ready yet${NC}"
fi

# Check Application
PORT=${PORT:-3001}
sleep 5
if curl -f http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Application is not ready yet (may take a few more seconds)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Medical Coverage System is running!${NC}"
echo "=========================================="
echo ""
echo "📍 Access the application:"
echo "   🌐 Application: http://localhost:$PORT"
echo "   🔧 API Health:  http://localhost:$PORT/api/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs:      docker-compose -f $COMPOSE_FILE logs -f"
echo "   Stop services:  docker-compose -f $COMPOSE_FILE down"
echo "   Restart:        docker-compose -f $COMPOSE_FILE restart"
echo "   Shell access:   docker-compose -f $COMPOSE_FILE exec app sh"
echo ""
echo "📖 For more information, see DOCKER_SETUP.md"
echo ""
