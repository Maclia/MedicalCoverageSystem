# Analytics Service

Real-time analytics and metrics collection for the Medical Coverage System. Tracks events across all microservices and provides aggregated analytics, business metrics, and health monitoring.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           All Microservices                              │
│  (Claims, Payment, Finance, Notification, etc.)          │
└────────────────────┬────────────────────────────────────┘
                     │
              Send events via HTTP POST
                     │
         ┌───────────┴────────────┐
         │                        │
    ┌────▼─────┐         ┌────────▼─────┐
    │MetricsCol│         │AnalyticsAgg  │
    │lector    │         │regator       │
    └────┬─────┘         └────────┬─────┘
         │                        │
    Event Buffer            Hourly/Daily
    (100 max)              Aggregates
         │                        │
         └────────┬───────────────┘
                  │
         ┌────────▼────────┐
         │  PostgreSQL DB  │
         │  (analytics)    │
         └─────────────────┘
                  │
         REST API Endpoints
         /api/analytics/*
```

## Key Features

- **Real-time Event Collection**: Capture events from all services with buffering
- **Hourly/Daily Aggregation**: Pre-computed metrics for performance
- **Service Health Tracking**: Monitor uptime, response times, error rates
- **Business Metrics**: Claims, payments, sagas, recovery statistics
- **Anomaly Detection**: Identify spikes, drops, and unusual patterns
- **Audit Trail**: Complete event history with correlation IDs

## Database Schema

### Tables

#### `events` - Real-time event stream
- Event type, correlation ID, saga/claim/member IDs
- Status, duration, error tracking
- Full metadata and error stack storage
- Indexed by type, correlation, timestamp

#### `hourly_aggregates` - Hourly metrics
- Count, success/failure rates
- Duration statistics (avg, min, max)
- Pre-computed for fast queries
- Unique constraint on (hour, metricType)

#### `daily_aggregates` - Daily metrics
- Extended statistics (p50, p95, p99 percentiles)
- Peak hour identification
- Success rates and completion statistics
- Pre-computed daily summaries

#### `service_health` - Service status
- Availability percentage
- Response time metrics
- Error rates and uptime tracking
- Last health check and error details

#### `service_metrics` - Real-time service performance
- CPU/memory utilization
- Active connections and database connections
- Requests per second, response times
- Queue depth and throughput

#### `business_metrics` - KPI tracking
- Daily claims, payments, recovery metrics
- Approval/success rates
- Total and average values
- Member/provider activity

#### `anomalies` - Anomaly detection results
- Detected anomalies with severity levels
- Expected vs actual values
- Recommended actions
- Acknowledgment and resolution tracking

## API Endpoints

### Health & Status
```
GET /api/analytics/health
  - Service health check
  - Returns: status, timestamp, uptime
```

### Events
```
POST /api/analytics/events
  - Record new events
  - Body: { events: [...EventPayload] }
  - Returns: { success, message, count }

GET /api/analytics/events?hoursBack=1&eventType=claim_created
  - Get events for time range
  - Query: hoursBack (default 1), eventType (optional)
  - Returns: { count, timeRange, events }

GET /api/analytics/events/:correlationId
  - Get event trace for saga (all events in saga)
  - Returns: { correlationId, count, events }
```

### Metrics
```
GET /api/analytics/metrics?hoursBack=24
  - Get recent metrics for claims, payments, sagas
  - Returns: { metrics: { claims, payments, sagas } }

GET /api/analytics/claims?hoursBack=24
  - Claims-specific analytics
  - Returns: { claims: { total, approved, rejected, approvalRate, avgDuration, percentiles } }

GET /api/analytics/payments?hoursBack=24
  - Payments-specific analytics
  - Returns: { payments: { total, successful, failed, successRate, avgDuration, percentiles } }

GET /api/analytics/sagas?hoursBack=24
  - Sagas-specific analytics
  - Returns: { sagas: { total, completed, failed, completionRate, avgDuration, percentiles } }

GET /api/analytics/services
  - Service health metrics
  - Returns: { services: { serviceName: { status, uptime, avgResponseTime, errorRate } } }

GET /api/analytics/summary
  - Executive summary
  - Returns: { summary: { totalEvents, systemHealth, systemAvailability, alerts } }
```

### Management
```
POST /api/analytics/aggregate
  - Trigger manual aggregation
  - Body: { hoursBack: 1, daysBack: 1 }
  - Returns: { success, message, aggregated }
```

## Event Payload Example

```typescript
{
  eventType: "saga_completed",
  correlationId: "550e8400-e29b-41d4-a716-446655440000",
  sagaId: "660e8400-e29b-41d4-a716-446655440001",
  claimId: "claim-123",
  memberId: "member-456",
  status: "SUCCESS",
  statusCode: 200,
  duration: 2345, // milliseconds
  metadata: {
    claimsProcessed: 1,
    paymentsProcessed: 1,
    compensations: 0,
    totalValue: 5000
  },
  source: "finance-service"
}
```

## Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_analytics
NODE_ENV=development
LOG_LEVEL=info
PORT=3009
```

### 3. Create Database
```bash
# Using docker
docker run -d --name postgres-analytics \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Create database
psql -U postgres -c "CREATE DATABASE medical_coverage_analytics;"
```

### 4. Run Migrations
```bash
npm run db:push
```

### 5. Start Service
```bash
npm run dev      # Development with auto-reload
npm start        # Production mode
```

## Usage Examples

### 1. Record Events from Another Service

```typescript
// From claims-service
async function notifyClaimCreated(claimId: string, amount: number) {
  const event = {
    eventType: 'claim_created',
    correlationId: uuid(),
    claimId,
    status: 'SUCCESS',
    duration: 145,
    metadata: { amount },
    source: 'claims-service'
  };

  await axios.post('http://localhost:3009/api/analytics/events', {
    events: [event]
  });
}
```

### 2. Query Claims Analytics

```bash
curl http://localhost:3009/api/analytics/claims?hoursBack=24

# Response
{
  "success": true,
  "claims": {
    "total": 156,
    "approved": 142,
    "rejected": 14,
    "approvalRate": 91.03,
    "avgDuration": 2456,
    "percentiles": {
      "p50": 1800,
      "p95": 5600,
      "p99": 8900
    }
  }
}
```

### 3. Trace Saga Execution

```bash
curl http://localhost:3009/api/analytics/events/550e8400-e29b-41d4-a716-446655440000

# Response shows all events in saga with timestamps
{
  "success": true,
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "count": 8,
  "events": [
    { "action": "saga:started", "timestamp": "2026-04-20T14:36:00Z" },
    { "action": "saga:step_completed", "step": "claim_created", "timestamp": "2026-04-20T14:36:01Z" },
    ...
  ]
}
```

### 4. Get Service Health Summary

```bash
curl http://localhost:3009/api/analytics/summary

# Response
{
  "success": true,
  "period": "24h",
  "summary": {
    "totalEvents": 2156,
    "systemHealth": "healthy",
    "systemAvailability": 99.95,
    "criticalAlerts": 0,
    "warningAlerts": 2
  }
}
```

## Integration with Other Services

### For Claims Service
```typescript
import axios from 'axios';

const analyticsClient = axios.create({
  baseURL: 'http://localhost:3009/api/analytics'
});

export async function logClaimEvent(claimId: string, status: 'created' | 'approved' | 'rejected') {
  await analyticsClient.post('/events', {
    events: [{
      eventType: `claim_${status}`,
      claimId,
      status: 'SUCCESS',
      source: 'claims-service'
    }]
  });
}
```

### For Finance Service (Saga Tracking)
```typescript
export async function logSagaEvent(sagaId: string, correlationId: string, status: string) {
  await analyticsClient.post('/events', {
    events: [{
      eventType: 'saga_completed',
      sagaId,
      correlationId,
      status,
      duration: getDuration(),
      source: 'finance-service'
    }]
  });
}
```

## Performance Characteristics

### Event Buffering
- Buffer size: 100 events
- Flush interval: 5 seconds
- Auto-flush when buffer full
- Graceful flush on shutdown

### Aggregation Schedule
- Default interval: 5 minutes
- Hourly aggregates computed every 5 minutes
- Daily aggregates computed every 5 minutes
- Background processing (non-blocking)

### Query Performance
- Event lookups: < 50ms (indexed by timestamp, type)
- Aggregated metrics: < 10ms (pre-computed)
- Correlation trace: < 100ms (indexed by correlationId)

## Monitoring & Troubleshooting

### Check Service Health
```bash
curl http://localhost:3009/api/analytics/health
```

### View Event Buffer Status
```bash
# Check logs for flush operations
tail -f logs/analytics.log | grep "Flushed"
```

### Verify Database Connection
```bash
psql medical_coverage_analytics -c "SELECT COUNT(*) FROM events;"
```

### Common Issues

**Events not appearing in database**:
1. Check DATABASE_URL is correct
2. Verify PostgreSQL is running
3. Check logs for buffer flush errors
4. Wait for flush interval (5 seconds)

**Queries returning no data**:
1. Verify events were recorded with POST /api/analytics/events
2. Check time range (hoursBack parameter)
3. Ensure aggregation has run (POST /api/analytics/aggregate)

**High response times**:
1. Check database query performance
2. Verify indexes are created (db:push)
3. Consider archiving old events (> 90 days)

## Development

### Run Tests
```bash
npm test
npm run test:coverage
```

### Lint Code
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

## Future Enhancements

- [ ] Prometheus metrics export
- [ ] Elasticsearch integration for log aggregation
- [ ] Real-time dashboards with WebSocket
- [ ] ML-based anomaly detection
- [ ] Custom metric creation
- [ ] Multi-tenant analytics isolation
- [ ] Analytics data archival and retention policies

## Architecture Decisions

### Event Buffering
- Events are buffered in memory for performance
- Periodic flush to database prevents data loss
- Graceful shutdown ensures no lost events

### Pre-computed Aggregates
- Hourly/daily aggregates computed periodically
- Reduces query latency for dashboards
- Enables historical trend analysis

### Correlation IDs
- All events linked via correlationId for tracing
- Enables complete saga execution tracking
- Supports root cause analysis

### Separate Database
- Analytics data separate from operational data
- Prevents analytics queries from impacting operations
- Easier backup/archival/retention management

## License

Part of Medical Coverage System
