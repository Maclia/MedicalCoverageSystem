# Fraud Detection Service - Quick Start Guide

## 🚀 Fastest Way to Get Running

### Option A: Docker Compose (5 minutes)

```bash
# From project root, start all services including fraud-detection
docker-compose up -d

# Verify it's running
curl http://localhost:5009/health

# View logs
docker-compose logs -f fraud-detection-service
```

**Done!** Service is running at `http://localhost:5009`

---

### Option B: Local Development (10 minutes)

#### 1. Prerequisites
- PostgreSQL running on localhost:5432
- Redis running on localhost:6379
- Node.js 20+ installed

#### 2. Setup
```bash
# Navigate to service directory
cd services/fraud-detection-service

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Create the database
psql -U postgres -c "CREATE DATABASE medical_coverage_fraud_detection;"

# Run migrations
npm run build  # Build TypeScript first
```

#### 3. Start Service
```bash
npm run dev
```

**Done!** Service is running at `http://localhost:5009`

---

## 📊 Quick API Test

### Health Check
```bash
curl http://localhost:5009/health
```

### Test Fraud Assessment
```bash
curl -X POST http://localhost:5009/api/fraud-detection/claims/assess \
  -H "Content-Type: application/json" \
  -d '{
    "claimId": "550e8400-e29b-41d4-a716-446655440000",
    "memberId": "550e8400-e29b-41d4-a716-446655440001",
    "providerId": "550e8400-e29b-41d4-a716-446655440002",
    "claimAmount": 1500.00,
    "diagnosis": "Common cold",
    "procedures": ["99213"],
    "claimDate": "2024-12-21", 
    "memberAddress": "123 Main St, City, State 12345",
    "providerNPI": "1234567890"
  }'
```

### Sample Response
```json
{
  "assessmentId": "uuid",
  "riskScore": 35,
  "riskLevel": "MEDIUM",
  "flaggedForInvestigation": false,
  "detectionDetails": {
    "anomalyScore": 40,
    "geolocationScore": 25,
    "nlpScore": 30,
    "externalDbScore": 35
  }
}
```

---

## 🔍 Troubleshooting

### Service won't start
```bash
# Check if port 5009 is in use
lsof -i :5009

# Kill process on that port (if needed)
kill -9 <PID>

# Check logs for errors
cd services/fraud-detection-service && npm run dev
```

### Database connection error
```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify database exists
psql -U postgres -c "\l" | grep fraud

# Test with direct connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medical_coverage_fraud_detection" npm run dev
```

### Redis connection error
```bash
# Verify Redis is running
redis-cli ping

# Should return "PONG"
```

---

## 📝 Configuration

### Development (.env file)
```env
PORT=5009
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_fraud_detection
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key
```

### Docker (via docker-compose.yml)
```yaml
fraud-detection-service:
  environment:
    PORT: 5009
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/medical_coverage_fraud_detection
    REDIS_URL: redis://redis:6379
```

---

## 📚 Common Commands

### Development
```bash
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm start                # Run built version
npm run lint             # Check code quality
npm test                 # Run tests
```

### Docker
```bash
docker-compose up fraud-detection-service      # Start specific service
docker-compose logs -f fraud-detection-service # View logs
docker-compose exec fraud-detection-service npm test  # Run tests in container
docker-compose down                            # Stop all services
```

---

## 🔗 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| POST | `/api/fraud-detection/claims/assess` | Assess claim |
| POST | `/api/fraud-detection/enrollments/assess` | Assess enrollment |
| POST | `/api/fraud-detection/providers/assess` | Assess provider |
| GET | `/api/fraud-detection/assessments/{id}` | Get assessment |
| GET | `/api/fraud-detection/assessments/high-risk` | Get high-risk cases |
| GET | `/api/fraud-detection/status` | Service status |

---

## 📖 Next Steps

- **Full Documentation**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Architecture**: See [README.md](./README.md)
- **Integration**: See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## ❓ Need Help?

**Service won't compile?**
```bash
npm run typecheck  # Check for TypeScript errors
npm run lint       # Check for linting errors
```

**Port already in use?**
```bash
# Change port in .env
PORT=5010 npm run dev
```

**Need fresh database?**
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE medical_coverage_fraud_detection;"
psql -U postgres -c "CREATE DATABASE medical_coverage_fraud_detection;"
```

---

**Version**: 1.0.0  
**Last Updated**: December 21, 2024
