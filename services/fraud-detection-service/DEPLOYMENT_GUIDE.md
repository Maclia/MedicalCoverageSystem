# Fraud Detection Service - Deployment Guide

## Overview

The Fraud Detection Service is a critical microservice in the Medical Coverage System that identifies and investigates potentially fraudulent activities across claims, enrollments, and providers. This guide provides comprehensive deployment and setup instructions.

## System Requirements

### Development Environment
- Node.js 20 or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- npm or yarn package manager

### Production Environment
- Docker & Docker Compose
- Neon Serverless PostgreSQL (recommended)
- Redis Cloud or self-hosted Redis
- API Gateway running on port 3001

## Quick Start

### Option 1: Docker Compose (Recommended)

The fraud-detection-service is pre-configured in the main docker-compose.yml file and will start automatically with other services.

```bash
# Start all services including fraud-detection-service
docker-compose up -d

# View logs
docker-compose logs -f fraud-detection-service

# Verify service health
curl http://localhost:5009/health
```

### Option 2: Local Development

#### 1. Install Dependencies
```bash
cd services/fraud-detection-service
npm install
```

#### 2. Configure Environment
Copy .env.example to .env and update with your local settings:
```bash
cp .env.example .env
```

Edit .env with your database and service URLs:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_fraud_detection
REDIS_URL=redis://localhost:6379
API_GATEWAY_URL=http://localhost:3001
```

#### 3. Database Setup
```bash
# Ensure PostgreSQL is running
# Create the fraud detection database
psql -U postgres -c "CREATE DATABASE medical_coverage_fraud_detection;"

# Run migrations via the root npm scripts
cd ../..
npm run db:push:fraud-detection
```

#### 4. Start the Service
```bash
# Development mode with hot reload
cd services/fraud-detection-service
npm run dev

# Or production build and start
npm run build
npm start
```

Service will be available at: `http://localhost:5009`

## Configuration

### Environment Variables

The service is configured via environment variables. Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5009 | Service port |
| `NODE_ENV` | development | Runtime environment |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis connection URL |
| `JWT_SECRET` | - | JWT signing secret |
| `CORS_ORIGINS` | http://localhost:3000 | Allowed CORS origins |

### Fraud Detection Configuration

```env
# Risk Scoring
FRAUD_DETECTION_SENSITIVITY=medium  # low, medium, high, critical
FRAUD_ALERT_THRESHOLD=30            # Risk score for flagging
FRAUD_INVESTIGATION_THRESHOLD=50    # Risk score for investigation
FRAUD_AUTO_REVIEW_THRESHOLD=70      # Risk score for auto-review

# Detection Methods
ENABLE_ML_DETECTION=false           # Machine learning models
ANOMALY_DETECTION_ENABLED=true      # Statistical anomalies
GEOLOCATION_CHECK_ENABLED=true      # Location verification
EXTERNAL_DB_CHECK_ENABLED=false     # MIB/NICB/NDH checks
NLP_ANALYSIS_ENABLED=true           # Text analysis

# Risk Thresholds
RISK_SCORE_THRESHOLD=50             # Investigation threshold
AUTO_DECLINE_THRESHOLD=75           # Automatic decline threshold
IMPOSSIBLE_TRAVEL_THRESHOLD_KM=900  # Impossible travel distance

# Automated Actions
AUTOMATED_FLAGGING_ENABLED=true     # Auto-flag investigations
AUTO_DECLINE_CLAIMS=false           # Automatically decline high-risk claims
INVESTIGATION_AUTO_ASSIGNMENT=false # Auto-assign to investigators
```

### External API Configuration

```env
# MIB (Medical Information Bureau)
MIB_API_URL=https://api.mib.com
MIB_API_KEY=${SECURE_VALUE}

# NICB (National Insurance Crime Bureau)
NICB_API_URL=https://api.nicb.org
NICB_API_KEY=${SECURE_VALUE}

# NDH (National Drivers History)
NDH_API_URL=https://api.ndh.org
NDH_API_KEY=${SECURE_VALUE}

# Geolocation Service
GEOLOCATION_API_URL=https://api.geolocation.com
GEOLOCATION_API_KEY=${SECURE_VALUE}

# Internal NLP Service
NLP_SERVICE_URL=http://nlp-service:6000
```

## API Endpoints

### Health Check
```bash
GET /health

# Response
{
  "status": "healthy",
  "service": "fraud-detection-service",
  "timestamp": "2024-12-21T10:00:00.000Z",
  "uptime": 3600
}
```

### Assess Claim for Fraud
```bash
POST /api/fraud-detection/claims/assess

# Request
{
  "claimId": "uuid",
  "memberId": "uuid",
  "providerId": "uuid",
  "claimAmount": 1500.00,
  "diagnosis": "Common cold",
  "procedures": ["99213"],
  "claimDate": "2024-12-21",
  "memberAddress": "123 Main St, City, State 12345",
  "providerNPI": "1234567890"
}

# Response
{
  "assessmentId": "uuid",
  "claimId": "uuid",
  "riskScore": 35,
  "riskLevel": "MEDIUM",
  "flaggedForInvestigation": true,
  "detectionDetails": {
    "anomalyScore": 40,
    "geolocationScore": 25,
    "nlpScore": 30,
    "externalDbScore": 35
  },
  "flags": {
    "isAnomaly": false,
    "geolocationFlag": false,
    "externalDbFlag": false,
    "nlpFlag": false
  },
  "assessedAt": "2024-12-21T10:00:00.000Z"
}
```

### Assess Enrollment for Fraud
```bash
POST /api/fraud-detection/enrollments/assess

# Request
{
  "enrollmentId": "uuid",
  "memberId": "uuid",
  "companyId": "uuid",
  "coverageAmount": 50000,
  "memberName": "John Doe",
  "memberDob": "1980-01-15",
  "documentType": "passport",
  "documentVerificationStatus": "pending"
}

# Response includes enrollment risk assessment
```

### Assess Provider for Fraud
```bash
POST /api/fraud-detection/providers/assess

# Request
{
  "providerId": "uuid",
  "providerName": "Dr. Smith Medical Clinic",
  "providerNPI": "1234567890",
  "claimsCount": 150,
  "averageClaimAmount": 1200.00,
  "totalClaimsAmount": 180000.00,
  "suspiciousPatterns": []
}

# Response includes provider risk assessment
```

### Retrieve Assessment
```bash
GET /api/fraud-detection/assessments/{assessmentId}

# Response returns full assessment details
```

### Get High-Risk Cases
```bash
GET /api/fraud-detection/assessments/high-risk?limit=10&offset=0

# Response returns paginated high-risk assessments
```

### Service Status
```bash
GET /api/fraud-detection/status

# Response
{
  "service": "fraud-detection-service",
  "status": "operational",
  "version": "1.0.0",
  "uptime": 3600,
  "detections": {
    "totalAssessments": 1250,
    "highRiskCount": 45,
    "flaggedForInvestigation": 23
  },
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "externalDatabases": "unavailable"
  }
}
```

## Database Schema

The service creates the following tables:

- `claim_fraud_assessments` - Fraud assessments for claims
- `enrollment_fraud_assessments` - Fraud assessments for enrollments
- `provider_fraud_assessments` - Fraud assessments for providers
- `fraud_detection_logs` - Detection method logs and results
- `fraud_detection_config` - Service configuration
- `fraud_investigation_queue` - Cases pending investigation
- `fraud_detection_audit` - Audit trail of all changes

Automatic schema creation is handled by the database initialization scripts during Docker Compose startup.

## Integration with Other Services

### API Gateway Integration

The API Gateway routes fraud detection requests:

```
POST /api/fraud-detection/* -> http://fraud-detection-service:5009/api/fraud-detection/*
```

Ensure the API Gateway has the fraud detection service URL configured:

```env
FRAUD_DETECTION_SERVICE_URL=http://fraud-detection-service:5009
```

### Core Service Integration

The fraud-detection-service can be called from the Core Service to assess member risk:

```typescript
// Example: Assess a claim
const response = await axios.post('http://api-gateway:5000/api/fraud-detection/claims/assess', {
  claimId: claim.id,
  memberId: claim.memberId,
  providerId: claim.providerId,
  claimAmount: claim.amount,
  // ... other fields
});
```

### Claims Service Integration

The fraud-detection-service returns risk assessments for claims processing:

```typescript
// Route claim based on fraud risk
if (riskScore > 75) {
  // Auto-decline claim
  claim.status = 'DECLINED';
} else if (riskScore > 50) {
  // Route to manual review
  claim.status = 'PENDING_REVIEW';
} else {
  // Auto-approve
  claim.status = 'APPROVED';
}
```

## Monitoring & Logs

### Log Files

Logs are written to:
- Console output (development)
- `./logs/error.log` - Error level logs
- `./logs/all.log` - All logs

### Log Levels
- `error` - Critical errors requiring attention
- `warn` - Warning conditions
- `info` - General information
- `http` - HTTP request/response logs
- `debug` - Detailed debugging information

### Health Monitoring

Use the health endpoint to monitor service status:
```bash
# Check service health
curl http://localhost:5009/health

# Monitor in Docker
docker-compose exec fraud-detection-service curl http://localhost:5009/health
```

### Performance Metrics

Monitor key metrics:
- Assessment processing time
- Risk scoring accuracy
- Detection method performance
- Database query performance
- External API response times

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database created and migrations run
- [ ] External API keys obtained (if using external integrations)
- [ ] Security certificates installed (for production HTTPS)
- [ ] Logging configured and tested

### Deployment
- [ ] Docker image built successfully
- [ ] Health check passes
- [ ] Service integrates with API Gateway
- [ ] Database operations functional
- [ ] Redis connectivity verified

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Verify health endpoint responds
- [ ] Test API endpoints
- [ ] Confirm database records created
- [ ] Verify inter-service communication

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs fraud-detection-service

# Verify environment variables
docker-compose exec fraud-detection-service env | grep FRAUD

# Check Node process
docker-compose exec fraud-detection-service ps aux
```

### Database Connection Issues
```bash
# Verify database exists
docker-compose exec postgres psql -U postgres -l | grep fraud

# Test connection
docker-compose exec fraud-detection-service node -e "
  const pg = require('pg');
  const client = new pg.Client(process.env.DATABASE_URL);
  client.connect().then(() => {
    console.log('Connected!');
    process.exit(0);
  }).catch(e => {
    console.error('Connection failed:', e.message);
    process.exit(1);
  });
"
```

### Redis Connection Issues
```bash
# Verify Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

### External API Failures
- Verify API keys are correct
- Check API endpoint URLs
- Confirm network connectivity
- Check rate limits
- Review API documentation for changes

## Scaling Considerations

For production deployments:

1. **Multiple Instances**: Run multiple fraud-detection-service instances behind a load balancer
2. **Queue Processing**: Use Bull queues for asynchronous processing
3. **Caching**: Implement Redis caching for frequent queries
4. **Database**: Use PostgreSQL connection pooling
5. **Monitoring**: Set up monitoring/alerting for service health

## Security Considerations

- API keys stored in environment variables (never commit)
- JWT authentication for inter-service communication
- CORS configured for allowed origins only
- Database connection uses SSL in production
- Non-root user execution in Docker
- Regular security updates for dependencies

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- claim-assessment.test.ts
```

## Support & Documentation

For more information:
- See [README.md](./README.md) for architecture overview
- See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details
- See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for integration examples

## Version History

- **v1.0.0** (2024-12-21) - Initial release with core fraud detection services

---

*Last Updated: December 21, 2024*
