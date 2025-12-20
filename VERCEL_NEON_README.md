# Medical Coverage System - Deployment Guide

## 🚀 Deployment Options

This system supports multiple deployment strategies. Choose based on your needs:

### 1. **Recommended: Docker + Cloud Database** (Current Setup)
- Full microservices architecture
- Containerized deployment
- Neon PostgreSQL database
- Suitable for Railway, Render, or VPS

### 2. **Frontend-Only Vercel + External Backend**
- Deploy React frontend to Vercel
- Deploy backend microservices separately
- Mixed deployment approach

### 3. **Full Vercel (Requires Architecture Changes)**
- Convert backend to serverless functions
- Not currently implemented
- Requires significant refactoring

## 📋 Environment Variables

### Database Configuration (Neon)
```bash
# Main database
DATABASE_URL=postgresql://[user]:[password]@[host]/medical_coverage?sslmode=require&channel_binding=require

# Service-specific databases
FINANCE_DATABASE_URL=postgresql://[user]:[password]@[host]/medical_coverage_finance?sslmode=require&channel_binding=require
CORE_DB_URL=postgresql://[user]:[password]@[host]/medical_coverage?sslmode=require&channel_binding=require
HOSPITAL_DB_URL=postgresql://[user]:[password]@[host]/medical_coverage?sslmode=require&channel_binding=require
INSURANCE_DB_URL=postgresql://[user]:[password]@[host]/medical_coverage?sslmode=require&channel_binding=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-at-least-32-chars

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Vercel-Specific (Frontend Only)
```bash
VERCEL_URL=https://your-app.vercel.app
NODE_ENV=production
```

## 🔧 Configuration Files

### Vercel Configuration
- `vercel.json` - Vercel deployment configuration
- `api/` - Serverless API routes (if using Vercel backend)

### Database Migration
```bash
# Install Neon CLI
npm install -g @neondatabase/cli

# Push schema to Neon
npm run db:push
```

## 📁 Project Structure

```
MedicalCoverageSystem/
├── client/                 # React frontend (Vite)
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── server/                 # Main backend server
│   ├── api/
│   ├── routes.ts
│   └── index.ts
├── services/               # Microservices
│   ├── api-gateway/
│   ├── core-service/
│   │   ├── config/
│   │   └── src/
│   ├── crm-service/
│   ├── finance-service/
│   ├── hospital-service/
│   ├── insurance-service/
│   ├── membership-service/
│   ├── wellness-service/
│   └── shared/
├── shared/                 # Shared schemas/types
├── config/                 # Shared configurations
├── database/               # Database setup scripts
├── docs/                   # Documentation
├── scripts/                # Automation scripts
├── tests/                  # Test suites
├── docker-compose.yml      # Docker orchestration
├── vercel.json            # Vercel config (frontend only)
└── package.json
```

## 🚀 Deployment Commands

### Primary: Docker Deployment
```bash
# Start all services
./docker-start.sh dev    # Development
./docker-start.sh prod   # Production

# Or using docker-compose
docker-compose up -d
```

### Frontend Only (Vercel)
```bash
cd client
npm run build
# Vercel auto-deploys on git push
```

### Hybrid: Vercel Frontend + Docker Backend
```bash
# Deploy frontend to Vercel
vercel --prod

# Deploy backend with Docker
./docker-start.sh prod
```

## 🔄 Migration Steps

### Current Setup (Docker + Neon)
1. **Set up Neon database** with multiple databases
2. **Update .env** with Neon connection strings
3. **Run database migrations**: `npm run db:push`
4. **Deploy with Docker**: `./docker-start.sh prod`

### Migrating to Vercel Frontend
1. **Connect repo to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy frontend** (backend remains Docker)
4. **Update API calls** to point to Docker backend

### Migrating to Full Vercel (Advanced)
1. **Refactor backend** to serverless functions
2. **Move API routes** to `api/` directory
3. **Convert Express routes** to Vercel functions
4. **Test serverless compatibility**

## 📊 Cost Comparison

| Deployment | Database | Frontend | Backend | DevOps |
|------------|----------|----------|---------|--------|
| **Docker + VPS** | $0-20/mo (Neon) | Included | $5-50/mo (VPS) | Manual |
| **Docker + Railway** | $0-20/mo (Neon) | Included | $5-50/mo | Managed |
| **Vercel Frontend + Docker Backend** | $0-20/mo (Neon) | Free | $5-50/mo | Mixed |
| **Full Vercel** | $0-20/mo (Neon) | Free | $0-20/mo | Fully managed |

## 🛠️ Development Workflow

### Local Development (Docker)
```bash
# Start all services
npm run dev              # Runs frontend + backend
npm run dev:client       # Frontend only
npm run dev:server       # Backend only

# Or with Docker
./docker-start.sh dev
```

### Database Operations
```bash
# Push schema changes
npm run db:push

# Run seed data
npm run seed
```

### Testing
```bash
npm run test:all         # All tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests
```

## 🔒 Security Considerations

- **Neon Database**: SSL required, connection pooling, IP restrictions
- **Docker**: Isolated containers, network security
- **Environment Variables**: Encrypted in production
- **API Security**: JWT authentication, rate limiting
- **Vercel (if used)**: Automatic HTTPS, DDoS protection

## 📈 Scaling & Architecture

### Current Architecture
- **Microservices**: Independent services for different domains
- **Database**: Multi-database setup with Neon
- **Deployment**: Containerized with Docker
- **Frontend**: React SPA with Vite

### Scaling Options
- **Horizontal**: Add more service instances
- **Database**: Neon auto-scales with usage
- **Load Balancing**: Nginx reverse proxy
- **Caching**: Redis for session and data caching

### Performance Monitoring
- Health checks for all services
- Database connection pooling
- API response monitoring
- Error logging and alerting