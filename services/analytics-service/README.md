# Analytics Service

## Purpose
System-wide analytics, reporting, and metrics aggregation service. Provides business intelligence dashboards, performance metrics, and trend analysis for all medical coverage operations.

## Responsibilities
- Generate operational reports and dashboards
- Aggregate metrics from all microservices
- Calculate KPIs and performance indicators
- Provide trend analysis and forecasting
- Export data in multiple formats

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/dashboard` | Get dashboard summary metrics |
| GET | `/api/analytics/reports/:type` | Generate specific report type |
| GET | `/api/analytics/metrics` | Get system performance metrics |
| POST | `/api/analytics/export` | Export analytics data |
| GET | `/api/health` | Service health check |

## Environment Variables
```
PORT=3010
DATABASE_URL=
REDIS_URL=
ELASTICSEARCH_URL=
LOG_LEVEL=info
```

## Dependencies
- Core Service (Authentication)
- Claims Service
- Billing Service
- Membership Service

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