# Docker Quick Start Guide

**Get Medical Coverage System running in 5 minutes!**

---

## 🚀 Fastest Way to Deploy

### Option 1: Automated Script (Easiest)

```bash
# One command to set everything up
./docker-start.sh
```

The script will:
- ✅ Check Docker is installed
- ✅ Create environment file
- ✅ Prompt you to change passwords
- ✅ Build and start all services
- ✅ Run health checks
- ✅ Show you access URLs

### Option 2: Manual Setup (3 Commands)

```bash
# 1. Create environment file
cp .env.docker.example .env.docker

# 2. Edit critical security settings
nano .env.docker
# Change: POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 3. Start everything
docker-compose -f docker-compose.simple.yml --env-file .env.docker up -d
```

---

## ✅ Verify It's Working

```bash
# Check services are running
docker ps

# Test health endpoint
curl http://localhost:3001/api/health

# View logs
docker-compose -f docker-compose.simple.yml logs -f app
```

**Access**: http://localhost:3001

---

## 🛑 Stop Everything

```bash
# Stop services
docker-compose -f docker-compose.simple.yml down

# Stop and remove data (fresh start)
docker-compose -f docker-compose.simple.yml down -v
```

---

## 📖 More Information

- **Full Guide**: See `DOCKER_SETUP.md`
- **Troubleshooting**: See `DOCKER_SETUP.md` → Troubleshooting section
- **Production Deployment**: See `DOCKER_SETUP.md` → Production Checklist

---

## ⚙️ What's Included

When you run `docker-compose.simple.yml`, you get:

1. **PostgreSQL Database** (port 5432)
   - Persistent data storage
   - Automatic health checks

2. **Redis Cache** (port 6379)
   - Session storage
   - Caching layer

3. **Medical Coverage App** (port 3001)
   - Backend API
   - Frontend UI
   - Token Management
   - CRM System
   - All features enabled

---

## 🔐 Security Reminder

**Before deploying to production**, change these in `.env.docker`:

```env
POSTGRES_PASSWORD=CHANGE_THIS  # Use strong password
REDIS_PASSWORD=CHANGE_THIS      # Use strong password
JWT_SECRET=CHANGE_THIS          # Min 32 random characters
JWT_REFRESH_SECRET=CHANGE_THIS  # Min 32 random characters
SESSION_SECRET=CHANGE_THIS      # Random string
ENCRYPTION_KEY=CHANGE_THIS      # Random string
```

Generate strong secrets:
```bash
# Generate random 32-character strings
openssl rand -base64 32
```

---

## 🆘 Need Help?

**Issue**: Container won't start
```bash
docker-compose -f docker-compose.simple.yml logs app
```

**Issue**: Can't connect to database
```bash
docker logs medical_postgres
docker exec medical_postgres psql -U postgres -l
```

**Issue**: Port already in use
```bash
# Change PORT in .env.docker
PORT=3002
```

For more help, see `DOCKER_SETUP.md`

---

**That's it! You're now running Medical Coverage System in Docker!** 🎉
