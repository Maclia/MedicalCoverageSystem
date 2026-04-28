# API Gateway Service

## Purpose
Single entry point for all client requests. Handles routing, authentication, rate limiting, request validation, and cross-cutting concerns for the entire microservices ecosystem.

## Responsibilities
- Request routing to appropriate microservices
- JWT token validation and authentication
- Rate limiting and throttling
- Request logging and audit trails
- Response transformation and standardization
- CORS handling
- Circuit breaking and fallback mechanisms

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| ALL | `/*` | Proxies requests to upstream services |
| GET | `/api/health` | Service health check |
| GET | `/api/gateway/status` | Gateway operational status |

## Environment Variables
```
PORT=3000
AUTH_SERVICE_URL=http://core-service:3001
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
LOG_LEVEL=info
REDIS_URL=
```

## Dependencies
- Core Service (Authentication)
- All downstream microservices

## Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test
```

## Standard Structure Compliance
✅ Uses `src/server.ts` entry point
✅ Standard middleware stack implemented
✅ Health check endpoint available
✅ Response standardization enabled
✅ Audit logging implemented
✅ Rate limiting configured