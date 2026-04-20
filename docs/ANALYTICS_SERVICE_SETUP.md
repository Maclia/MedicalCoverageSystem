# Analytics Service - Setup & Deployment Guide

**Service Name**: Analytics Service  
**Port**: 3009  
**Database**: medical_coverage_analytics (PostgreSQL)  
**Status**: Ready for deployment

---

## 📋 Quick Start

### 1. Install Dependencies
```bash
cd services/analytics-service
npm install
```

### 2. Create Database
```bash
# Using Docker
docker run -d --name postgres-analytics \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Create database
psql -U postgres -c "CREATE DATABASE medical_coverage_analytics;"
```

### 3. Configure Environment
**File**: `.env` in workspace root
```env
# Analytics Service
ANALYTICS_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_analytics
ANALYTICS_PORT=3009
```

Or **File**: `services/analytics-service/.env`
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medical_coverage_analytics
PORT=3009
NODE_ENV=development
LOG_LEVEL=info
```

### 4. Run Migrations
```bash
npm run db:push
```

### 5. Start Service
```bash
npm run dev      # Development (auto-reload)
npm start        # Production
```

### 6. Verify Service
```bash
curl http://localhost:3009/api/analytics/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2026-04-20T14:30:00Z",
  "uptime": 125.456
}
```

---

## 🏗️ Architecture

### Services & Communication

```
┌──────────────────────────────────────────────────────────────┐
│                  API Gateway (Port 5000)                      │
│                                                                │
│    ├─ /api/fraud → Fraud Service (3011)                      │
│    ├─ /api/claims → Claims Service (3006)                    │
│    ├─ /api/finance → Finance Service (3007)                  │
│    ├─ /api/payments → Payment Service (3008)                 │
│    ├─ /api/notifications → Notification Service (3010)       │
│    ├─ /api/analytics → Analytics Service (3009) ←── NEW      │
│    └─ /api/crm → CRM Service (3004)                          │
└──────────────────────────────────────────────────────────────┘
         ↓
    PostgreSQL
    (9 databases)
    - medical_coverage_core
    - medical_coverage_claims
    - medical_coverage_finance
    - medical_coverage_analytics ←── NEW
    - ... (5 more)
```

### Analytics Service Internal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Analytics Service (Express.js, Node.js)            │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Layer (routes.ts)                               │   │
│  │  - POST /events (record events)                       │   │
│  │  - GET /metrics (query metrics)                       │   │
│  │  - GET /claims (claims analytics)                     │   │
│  │  - GET /payments (payments analytics)                 │   │
│  │  - GET /sagas (saga analytics)                        │   │
│  │  - GET /summary (executive summary)                   │   │
│  │  - POST /aggregate (trigger aggregation)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Service Layer                                       │   │
│  │  ┌──────────────────┐      ┌────────────────────┐   │   │
│  │  │ MetricsCollector │      │AnalyticsAggregator │   │   │
│  │  │                  │      │                    │   │   │
│  │  │ - recordEvent()  │      │ - aggregateHour()  │   │   │
│  │  │ - getEvents()    │      │ - aggregateDay()   │   │   │
│  │  │ - getSuccess()   │      │ - startSchedule()  │   │   │
│  │  │ - getDuration()  │      │ - stopSchedule()   │   │   │
│  │  │ - recordBatch()  │      │ - compute metrics  │   │   │
│  │  └──────────────────┘      └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database Layer (Drizzle ORM)                        │   │
│  │                                                       │   │
│  │  Tables:                                             │   │
│  │  - events (real-time event stream)                   │   │
│  │  - hourly_aggregates (computed hourly)               │   │
│  │  - daily_aggregates (computed daily)                 │   │
│  │  - service_health (uptime/response time)             │   │
│  │  - service_metrics (CPU/memory/connections)          │   │
│  │  - business_metrics (KPIs)                           │   │
│  │  - anomalies (detected anomalies)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database: medical_coverage_analytics     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Tables

### events
- Real-time event stream from all services
- 10M+ rows possible per month
- Indexed by: type, correlation, timestamp
- TTL: 90 days (archive after)

### hourly_aggregates
- Pre-computed hourly metrics
- Computed every 5 minutes
- Unique constraint: (hour, metricType)
- Data: counts, success rates, durations (min/avg/max)

### daily_aggregates
- Pre-computed daily metrics
- Computed every 5 minutes
- Unique constraint: (date, metricType)
- Data: percentiles (p50, p95, p99), peak hour, success rate

### service_health
- Service status and availability
- One row per service
- Last updated: health check timestamp
- Data: availability %, response time, error rate

### service_metrics
- Real-time resource utilization
- Updated periodically (every minute)
- Data: CPU, memory, connections, RPS, response times

### business_metrics
- Daily KPIs (one row per day)
- Calculated at end of day
- Data: claim counts, payment values, approval rates, member activity

### anomalies
- Detected anomalies and outliers
- Severity levels: low, medium, high, critical
- Can be acknowledged/resolved
- Recommendations for action

---

## 🔄 Event Flow

### Example: Claims → Payment → Notification Saga

```
Timeline of events:

00:00 ms  - Claim Created (Claims Service)
           eventType: claim_created
           status: SUCCESS
           duration: 145ms
           ↓
           POST /api/analytics/events
           ↓
           MetricsCollector buffers event

00:05 ms  - Buffer reaches 100 events OR 5s elapsed
           ↓
           MetricsCollector flushes to database
           ↓
           INSERT INTO events VALUES (...)

00:30 ms  - Saga Started (Finance Service)
           eventType: saga_started
           correlationId: same as claim
           status: IN_PROGRESS
           ↓
           Buffered and flushed like above

01:45 ms  - Payment Processed (Payment Service)
           eventType: payment_processed
           correlationId: same
           status: SUCCESS
           duration: 256ms
           ↓
           Buffered and flushed

02:15 ms  - Notification Sent (Notification Service)
           eventType: notification_sent
           correlationId: same
           status: SUCCESS
           duration: 89ms
           ↓
           Buffered and flushed

02:30 ms  - Saga Completed (Finance Service)
           eventType: saga_completed
           correlationId: same
           status: SUCCESS
           duration: 2300ms
           ↓
           Buffered and flushed

00:05 (minute mark) - Aggregation Scheduled Task
           ↓
           AnalyticsAggregator runs:
           - aggregateRecentHours(1) → computes hourly_aggregates
           - aggregateRecentDays(1) → computes daily_aggregates
           ↓
           Inserts/updates:
           - hourly_aggregates (hour, metricType)
           - daily_aggregates (date, metricType)

Query result: GET /api/analytics/events/correlationId
             ↓
             Returns all 5 events with timestamps
             Shows complete saga execution trace
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Database created: `medical_coverage_analytics`
- [ ] .env file configured with DATABASE_URL
- [ ] npm dependencies installed
- [ ] Migrations run: `npm run db:push`
- [ ] Service tested locally: `npm run dev`

### Deployment Steps
1. Navigate to service: `cd services/analytics-service`
2. Install/update dependencies: `npm install`
3. Run migrations: `npm run db:push`
4. Start service: `npm start`
5. Verify health: `curl http://localhost:3009/api/analytics/health`

### Post-Deployment
- [ ] Service running on port 3009
- [ ] Database tables created (8 tables)
- [ ] Health endpoint responding
- [ ] API Gateway routing to /api/analytics
- [ ] Other services can POST events
- [ ] Metrics queries working

### Integration Checklist
- [ ] Claims Service integrated (logs claim_created events)
- [ ] Finance Service integrated (logs saga_* events)
- [ ] Payment Service integrated (logs payment_* events)
- [ ] Notification Service integrated (logs notification_* events)
- [ ] All services sending correlationIds
- [ ] Events appearing in database within 5 seconds

---

## 📈 Expected Performance

### Event Recording
- Buffer size: 100 events
- Flush interval: 5 seconds (max 5s latency)
- Throughput: 1,000+ events/second
- Database write: < 1ms per event

### Query Performance
- Events by time range: < 50ms (indexed)
- Events by correlationId: < 100ms (indexed)
- Hourly metrics: < 10ms (pre-computed)
- Daily metrics: < 10ms (pre-computed)
- Aggregation cycle: < 1 minute (background)

### Resource Usage
- Memory: ~200MB baseline
- CPU: < 5% at rest
- Database connections: 5-10 active
- Storage: ~1GB per 100M events (with compression)

---

## 🔧 Configuration Options

### Event Buffering
```typescript
const BUFFER_SIZE = 100;      // Events before flush
const FLUSH_INTERVAL = 5000;  // ms between flushes
```

**Adjust for**:
- Higher load: Increase BUFFER_SIZE (e.g., 500)
- Lower latency: Decrease FLUSH_INTERVAL (e.g., 2000)
- Memory constrained: Decrease BUFFER_SIZE (e.g., 50)

### Aggregation Schedule
```typescript
const AGGREGATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

**Adjust for**:
- Real-time dashboards: Decrease (e.g., 1 minute)
- Batch reporting: Increase (e.g., 30 minutes)
- High load: Increase to reduce background processing

### Data Retention
- Events: 90 days (archive after)
- Hourly aggregates: 1 year
- Daily aggregates: Forever
- Anomalies: 1 year (resolve after)

---

## 🔌 Integration with Other Services

### Adding to Claims Service

**File**: `services/claims-service/src/services/ClaimsService.ts`

```typescript
import axios from 'axios';

const analyticsClient = axios.create({
  baseURL: 'http://localhost:3009/api/analytics'
});

async recordClaimEvent(type: string, claimId: string, status: 'SUCCESS' | 'FAILURE', duration: number) {
  try {
    await analyticsClient.post('/events', {
      events: [{
        eventType: `claim_${type}`,
        claimId,
        status,
        duration,
        source: 'claims-service'
      }]
    });
  } catch (error) {
    logger.warn('Analytics logging failed (non-critical)', error);
  }
}
```

### Adding to Finance Service

**File**: `services/finance-service/src/services/SagaOrchestrator.ts`

```typescript
async executeSaga(saga: SagaTransaction) {
  const startTime = Date.now();
  
  // Log saga started
  await this.logEvent({
    eventType: 'saga_started',
    sagaId: saga.sagaId,
    correlationId: saga.correlationId,
    status: 'IN_PROGRESS',
    source: 'finance-service'
  });

  try {
    // Execute saga...
    
    // Log saga completed
    await this.logEvent({
      eventType: 'saga_completed',
      sagaId: saga.sagaId,
      correlationId: saga.correlationId,
      status: 'SUCCESS',
      duration: Date.now() - startTime
    });
  } catch (error) {
    // Log saga failed
    await this.logEvent({
      eventType: 'saga_failed',
      sagaId: saga.sagaId,
      correlationId: saga.correlationId,
      status: 'FAILURE',
      errorMessage: error.message,
      duration: Date.now() - startTime
    });
    throw error;
  }
}
```

---

## 📊 Monitoring & Dashboards

### Health Check
```bash
curl http://localhost:3009/api/analytics/health
```

### View Event Count
```bash
psql medical_coverage_analytics -c "SELECT COUNT(*) FROM events;"
```

### Check Aggregates
```bash
psql medical_coverage_analytics -c "
  SELECT date, metric_type, total_count, success_rate 
  FROM daily_aggregates 
  ORDER BY date DESC 
  LIMIT 10;
"
```

### Monitor Service Health
```bash
curl http://localhost:3009/api/analytics/services | jq '.'
```

### Get Summary
```bash
curl http://localhost:3009/api/analytics/summary | jq '.'
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
npm run dev  # Development mode shows all logs

# Common issues:
# 1. Database not running
#    → Start PostgreSQL
# 2. Database doesn't exist
#    → psql -U postgres -c "CREATE DATABASE medical_coverage_analytics;"
# 3. Port already in use
#    → PORT=3010 npm start  (use different port)
# 4. Dependencies not installed
#    → npm install
```

### Events Not Appearing

```bash
# 1. Check service is running
curl http://localhost:3009/api/analytics/health

# 2. Verify database connection
psql medical_coverage_analytics -c "SELECT 1;"

# 3. Post test event
curl -X POST http://localhost:3009/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "eventType": "test",
      "status": "SUCCESS",
      "source": "test-service"
    }]
  }'

# 4. Check database has record
psql medical_coverage_analytics -c "SELECT COUNT(*) FROM events;"

# 5. Check logs for flush errors
```

### High Query Latency

```bash
# 1. Check database indexes
psql medical_coverage_analytics -c "SELECT * FROM pg_indexes WHERE tablename = 'events';"

# 2. Check query plans
psql medical_coverage_analytics -c "
  EXPLAIN ANALYZE
  SELECT * FROM events WHERE event_type = 'claim_created' LIMIT 100;
"

# 3. Check table size
psql medical_coverage_analytics -c "
  SELECT pg_size_pretty(pg_total_relation_size('events'));
"
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Complete API documentation and examples |
| **INTEGRATION_GUIDE.md** | How to integrate with other services |
| **SETUP_DEPLOYMENT.md** | This file - setup and deployment |
| **schema.ts** | Database schema definitions |
| **index.ts** | Main service entry point |

---

## 🎯 Next Steps

### Immediate (Today)
1. Deploy analytics service
2. Create analytics database
3. Run migrations
4. Verify health endpoint

### Short-term (This Week)
1. Integrate Claims Service
2. Integrate Finance Service
3. Test event recording
4. Verify aggregation

### Medium-term (This Month)
1. Integrate all services
2. Create Grafana dashboards
3. Set up alerting
4. Monitor production metrics

### Long-term (This Quarter)
1. ML-based anomaly detection
2. Predictive analytics
3. Custom metric creation
4. Executive dashboards

---

## 📞 Support

For issues or questions:
1. Check README.md for API documentation
2. Check INTEGRATION_GUIDE.md for integration examples
3. Review logs: `npm run dev` to see all output
4. Check database directly: `psql medical_coverage_analytics`

---

**Status**: ✅ Ready for deployment

**Commands Summary**:
```bash
# Development
cd services/analytics-service && npm run dev

# Production
cd services/analytics-service && npm run db:push && npm start

# Testing
curl http://localhost:3009/api/analytics/health
```
