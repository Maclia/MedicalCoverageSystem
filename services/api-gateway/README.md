# API Gateway - Medical Coverage System

The API Gateway serves as the central entry point for all microservices in the Medical Coverage System, providing authentication, rate limiting, request routing, and comprehensive API documentation.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Access to microservice endpoints

### Installation

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🏗️ Architecture

### Core Features
- **JWT Authentication**: Bearer token validation with role-based access
- **Rate Limiting**: Configurable limits per endpoint and user type
- **Service Proxy**: Dynamic routing to 9 microservices
- **Health Monitoring**: Real-time service health checks
- **Swagger Documentation**: Complete OpenAPI 3.0 specification
- **Circuit Breakers**: Automatic failover protection
- **Request Tracing**: Correlation IDs for debugging

### Service Routing

| Path Pattern | Target Service | Authentication |
|--------------|----------------|----------------|
| `/api/auth/*` | Core Service | Auth rate limit |
| `/api/core/*` | Core Service | JWT required |
| `/api/insurance/*` | Insurance Service | JWT required |
| `/api/schemes/*` | Insurance Service | JWT required |
| `/api/benefits/*` | Insurance Service | JWT required |
| `/api/coverage/*` | Insurance Service | JWT required |
| `/api/hospital/*` | Hospital Service | JWT required |
| `/api/patients/*` | Hospital Service | User rate limit |
| `/api/appointments/*` | Hospital Service | JWT required |
| `/api/medical-records/*` | Hospital Service | JWT required |
| `/api/personnel/*` | Hospital Service | JWT required |
| `/api/billing/*` | Billing Service | JWT required |
| `/api/invoices/*` | Billing Service | User rate limit |
| `/api/accounts-receivable/*` | Billing Service | JWT required |
| `/api/tariffs/*` | Billing Service | JWT required |
| `/api/claims/*` | Claims Service | User rate limit |
| `/api/disputes/*` | Claims Service | JWT required |
| `/api/reconciliation/*` | Claims Service | JWT required |
| `/api/finance/*` | Finance Service | JWT required |
| `/api/payments/*` | Finance Service | User rate limit |
| `/api/ledger/*` | Finance Service | JWT required |
| `/api/crm/*` | CRM Service | JWT required |
| `/api/leads/*` | CRM Service | JWT required |
| `/api/agents/*` | CRM Service | JWT required |
| `/api/commissions/*` | CRM Service | JWT required |
| `/api/membership/*` | Membership Service | JWT required |
| `/api/enrollments/*` | Membership Service | JWT required |
| `/api/renewals/*` | Membership Service | JWT required |
| `/api/wellness/*` | Wellness Service | JWT required |
| `/api/programs/*` | Wellness Service | JWT required |
| `/api/activities/*` | Wellness Service | JWT required |
| `/api/incentives/*` | Wellness Service | JWT required |

## 📚 API Documentation

### Swagger UI
Access the interactive API documentation at:
```
http://localhost:5000/api-docs
```

### OpenAPI Specification
Download the OpenAPI JSON specification at:
```
http://localhost:5000/swagger.json
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_ISSUER=medical-coverage-system
JWT_AUDIENCE=medical-api-gateway

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Service URLs (examples)
CORE_SERVICE_URL=http://localhost:3001
INSURANCE_SERVICE_URL=http://localhost:3002
HOSPITAL_SERVICE_URL=http://localhost:3003
BILLING_SERVICE_URL=http://localhost:3004
CLAIMS_SERVICE_URL=http://localhost:3005
FINANCE_SERVICE_URL=http://localhost:3006
CRM_SERVICE_URL=http://localhost:3007
MEMBERSHIP_SERVICE_URL=http://localhost:3008
WELLNESS_SERVICE_URL=http://localhost:3009

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ENABLE_CSP=true
TRUST_PROXY=false

# Health Checks
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=2000
HEALTH_CHECK_RETRIES=3

# Logging
LOG_LEVEL=info
LOGGING_ENABLED=true
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build:check  # TypeScript compilation check
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Building
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm test             # Run tests
npm run test:watch   # Watch mode tests
npm run test:coverage # Test coverage

# Utilities
npm run validate     # Validate build setup
npm run clean        # Clean build artifacts
npm run rebuild      # Full rebuild
```

### Project Structure

```
src/
├── api/
│   └── routes.ts           # Main routing configuration
├── config/
│   └── index.ts            # Configuration management
├── middleware/
│   ├── proxy.ts            # Service proxy middleware
│   ├── auth.ts             # Authentication middleware
│   ├── rateLimiting.ts     # Rate limiting middleware
│   ├── auditMiddleware.ts  # Request auditing
│   └── responseStandardization.ts # Response formatting
├── services/
│   ├── ServiceRegistry.ts  # Service discovery
│   └── CircuitBreaker.ts   # Circuit breaker pattern
├── utils/
│   └── logger.ts           # Logging utilities
├── swagger.ts              # Swagger configuration
└── index.ts                # Application entry point
```

## 🔍 Troubleshooting

### Build Issues

#### 1. TypeScript Compilation Errors
```bash
# Check for compilation errors
npm run build:check

# Clean and rebuild
npm run rebuild
```

#### 2. Missing Dependencies
```bash
# Clean install
npm run clean
npm install
```

#### 3. Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

### Runtime Issues

#### 1. Service Connection Errors
- Verify all microservice URLs in environment variables
- Check service health: `GET /health`
- Review service status: `GET /services`

#### 2. Authentication Issues
- Verify JWT_SECRET is set
- Check token format: `Authorization: Bearer <token>`
- Validate token expiration

#### 3. Rate Limiting Issues
- Check rate limit headers in responses
- Adjust RATE_LIMIT_* environment variables
- Review request patterns

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `SERVICE_UNAVAILABLE` | Target service is down | Check service health and restart |
| `CIRCUIT_BREAKER_OPEN` | Service circuit breaker triggered | Wait for automatic recovery or restart |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait for rate limit reset |
| `AUTHENTICATION_FAILED` | Invalid JWT token | Provide valid Bearer token |
| `AUTHORIZATION_FAILED` | Insufficient permissions | Check user roles and permissions |

## 📊 Monitoring

### Health Endpoints

```bash
# Gateway health
GET /health

# Service status overview
GET /services

# Detailed service health
GET /services/{serviceName}/health
```

### Metrics

The gateway provides real-time metrics for:
- Request/response times
- Error rates
- Service availability
- Rate limiting status
- Circuit breaker states

## 🔐 Security

### Authentication
- JWT Bearer token authentication
- Role-based access control (RBAC)
- Token refresh mechanism

### Rate Limiting
- Configurable per endpoint
- User-based and IP-based limits
- Burst handling

### Security Headers
- CORS configuration
- Content Security Policy (CSP)
- Helmet security middleware

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "correlationId": "request-tracking-id",
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    },
    "timestamp": "2025-12-21T10:00:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {},
    "correlationId": "request-tracking-id"
  }
}
```

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure TypeScript compilation passes
5. Run linting before committing

## 📄 License

MIT License - see LICENSE file for details.

---

**Version**: 1.0.0
**Last Updated**: December 21, 2025
- `GET /api/claims/*` - Claims service
- `GET /api/payment/*` - Payment service

## Configuration

### Environment Variables

#### Required
- `REDIS_URL` - Redis connection for rate limiting
- `JWT_SECRET` - JWT signing secret

#### Service Configuration
- `CORE_SERVICE_URL` - Authentication service URL
- `INSURANCE_SERVICE_URL` - Insurance service URL
- `HOSPITAL_SERVICE_URL` - Hospital service URL
- `BILLING_SERVICE_URL` - Billing service URL
- `CLAIMS_SERVICE_URL` - Claims service URL
- `PAYMENT_SERVICE_URL` - Payment service URL

#### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window

#### Security
- `CORS_ORIGINS` - Allowed CORS origins
- `ENABLE_CSP` - Content Security Policy

## Rate Limiting

### Default Limits
- **Standard**: 100 requests per minute
- **Authentication**: 5 attempts per 15 minutes
- **Authenticated Users**: 200 requests per minute
- **Admin Users**: 1000 requests per minute

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Circuit Breaker

### Configuration
- **Failure Threshold**: 5 consecutive failures
- **Recovery Timeout**: 60 seconds
- **Monitoring Period**: 10 seconds

### States
- **CLOSED**: Normal operation
- **OPEN**: Requests blocked, recovery timeout active
- **HALF_OPEN**: Limited requests allowed for testing

## Request Flow

1. **Client Request** reaches API Gateway
2. **Authentication** (if required) validates JWT
3. **Rate Limiting** checks request limits
4. **Circuit Breaker** verifies service health
5. **Proxy Middleware** routes to appropriate service
6. **Response Standardization** formats response
7. **Logging & Metrics** record request data

## Health Monitoring

### Gateway Health
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 3600,
    "services": {
      "healthy": 5,
      "total": 6,
      "list": [...]
    }
  }
}
```

### Service Status
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "name": "core",
        "healthy": true,
        "responseTime": 45,
        "circuitBreakerOpen": false
      }
    ]
  }
}
```

## Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update environment variables
# Edit .env with your configuration

# Run in development
npm run dev
```

### Build & Test
```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Docker
```bash
# Build image
docker build -t medical-api-gateway .

# Run container
docker run -p 3000:3000 --env-file .env medical-api-gateway
```

## Deployment

### Docker Compose
```yaml
services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - CORE_SERVICE_URL=http://core-service:3001
      - INSURANCE_SERVICE_URL=http://insurance-service:3002
      - HOSPITAL_SERVICE_URL=http://hospital-service:3003
      - BILLING_SERVICE_URL=http://billing-service:3004
      - CLAIMS_SERVICE_URL=http://claims-service:3005
      - PAYMENT_SERVICE_URL=http://payment-service:3006
    depends_on:
      - redis
      - core-service
      - insurance-service
      - hospital-service
      - billing-service
      - claims-service
      - payment-service
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: medical-api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Performance

### Metrics
- **Request Throughput**: Requests per second
- **Response Times**: P50, P95, P99 percentiles
- **Error Rates**: 4xx and 5xx response percentages
- **Circuit Breaker Status**: Open/closed state per service

### Optimization
- **Connection Pooling**: Reuse HTTP connections
- **Response Compression**: Gzip for large payloads
- **Caching Headers**: Appropriate cache directives
- **Load Balancing**: Multiple service instances

## Troubleshooting

### Common Issues
1. **Service Unavailable**: Check service health status
2. **Rate Limit Exceeded**: Verify rate limit configuration
3. **Circuit Breaker Open**: Check service logs and metrics
4. **JWT Validation Failed**: Verify token format and secrets

### Debug Mode
Set `LOG_LEVEL=debug` for detailed logging.

### Health Check Failures
1. Verify downstream service health
2. Check network connectivity
3. Review service configuration

## Security Considerations

### Authentication
- JWT tokens must include required claims
- Token expiration is enforced
- Service-to-service authentication for admin endpoints

### Rate Limiting
- Different limits per user type
- Redis-backed storage for distributed deployment
- Sliding window implementation

### Data Protection
- Request correlation IDs for tracing
- Sensitive data masking in logs
- Secure headers configuration

## Monitoring

### Metrics Collection
- Request/response metrics
- Error rates by service
- Circuit breaker state changes
- Rate limiting statistics

### Alerting
- Service health failures
- High error rates
- Circuit breaker activations
- Performance degradation

### Logging
- Structured JSON logs
- Correlation ID tracking
- Performance metrics
- Security events