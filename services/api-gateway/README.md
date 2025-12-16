# API Gateway

The API Gateway serves as the central entry point for all client requests to the Medical Coverage System microservices architecture.

## Features

- **Central Request Routing** to all microservices
- **Authentication & Authorization** with JWT validation
- **Rate Limiting** with Redis-backed storage
- **Circuit Breaker Pattern** for service resilience
- **Health Monitoring** of all downstream services
- **Request Correlation** for distributed tracing
- **Standardized API Responses** across all services
- **Security Headers** and CORS configuration
- **Load Balancing** support for service instances
- **WebSocket Support** for real-time features

## Architecture

### Service Discovery
- **Service Registry** maintains health status of all microservices
- **Circuit Breakers** prevent cascading failures
- **Health Checks** monitor service availability
- **Retry Logic** with exponential backoff

### Security
- **JWT Authentication** with token validation
- **Role-based Access Control** (RBAC)
- **Rate Limiting** per endpoint and user type
- **CORS Configuration** for cross-origin requests
- **Security Headers** (helmet.js)

### Monitoring & Observability
- **Correlation IDs** for request tracing
- **Structured Logging** with Winston
- **Performance Metrics** and response times
- **Health Endpoints** for service monitoring

## API Routes

### Gateway Endpoints
- `GET /health` - Gateway health check
- `GET /services` - Service status overview
- `GET /docs` - API documentation

### Service Routes
- `GET /api/auth/*` - Core authentication service
- `GET /api/insurance/*` - Insurance service
- `GET /api/hospital/*` - Hospital service
- `GET /api/billing/*` - Billing service
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