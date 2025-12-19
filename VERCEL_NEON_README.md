# Medical Coverage System - Neon + Vercel Deployment

## 🚀 Quick Setup

### 1. Database Setup (Neon)
1. Create a [Neon](https://neon.tech) account
2. Create a new project
3. Copy the connection string

### 2. Frontend Deployment (Vercel)
1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### 3. Backend Deployment Options
Choose one of:
- **Vercel Serverless**: Deploy API routes as serverless functions
- **Vercel Pro**: For persistent backend with database connections
- **Railway/Render**: Alternative for full backend deployment

## 📋 Environment Variables

### Required for All Environments
```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Email (optional)
SMTP_HOST=your-smtp-server
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
```

### Vercel-Specific
```bash
# Vercel environment variables
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

## 📁 Project Structure (Simplified)

```
MedicalCoverageSystem/
├── client/                 # Frontend (deploys to Vercel)
│   ├── src/
│   ├── vercel.json        # Vercel config
│   └── package.json
├── server/                 # Backend (API routes)
├── shared/                 # Shared types/schemas
├── database/               # Migration scripts
├── vercel.json            # Root Vercel config (optional)
└── package.json
```

## 🚀 Deployment Commands

### Frontend Only (Vercel)
```bash
cd client
npm run build
# Vercel auto-deploys on git push
```

### Full Stack (Vercel + External Backend)
```bash
# Deploy frontend
vercel --prod

# Deploy backend separately (Railway/Render/VPS)
# Follow provider-specific deployment guides
```

## 🔄 Migration Steps

1. **Backup current data** (if any)
2. **Create Neon database** and update `DATABASE_URL`
3. **Test database connection** locally
4. **Deploy to Vercel** with environment variables
5. **Update DNS** to point to Vercel
6. **Remove Docker dependencies**

## 📊 Cost Comparison

| Service | Current (Docker) | Neon + Vercel |
|---------|------------------|---------------|
| Database | ~$10/month (VPS) | $0-20/month (usage-based) |
| Frontend | Included in VPS | Free tier available |
| Backend | Included in VPS | $0-20/month (serverless) |
| DevOps | Manual maintenance | Fully managed |

## 🛠️ Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up local Neon connection
cp .env.example .env
# Edit DATABASE_URL with Neon connection string

# Run development server
npm run dev
```

### Production Deployment
1. Push to main branch
2. Vercel auto-deploys frontend
3. Backend auto-deploys (if using Vercel serverless)

## 🔒 Security Considerations

- **Neon**: Built-in SSL, connection pooling
- **Vercel**: Automatic HTTPS, DDoS protection
- **Environment Variables**: Never commit secrets
- **Database Access**: Restrict to application IPs only

## 📈 Scaling

- **Neon**: Auto-scales with usage
- **Vercel**: Serverless scaling to zero
- **Monitoring**: Built-in Vercel analytics
- **Performance**: Global CDN included