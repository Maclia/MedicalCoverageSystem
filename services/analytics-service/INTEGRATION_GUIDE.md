# Analytics Service Integration Guide

## Overview

The Analytics Service is a new microservice (Port 3009) that collects real-time metrics from all other services in the Medical Coverage System. It provides:

- **Real-time Event Collection** - Captures events from Claims, Finance, Notification, Payment services
- **Metrics Aggregation** - Computes hourly/daily aggregates for performance
- **Service Health Monitoring** - Tracks uptime, response times, error rates
- **Business KPIs** - Claims, payments, sagas, recovery statistics
- **Saga Tracing** - Complete event history via correlation IDs

## Service Architecture

```
All Microservices                Analytics Service           Dashboards/Reports
    │                                    │                           │
    ├─ Claims Service (3006)             │                          │
    │  └─→ POST /api/analytics/events    │                          │
    │                                     ├─→ MetricsCollector       │
    ├─ Finance Service (3007)            │   (Event buffering)       │
    │  └─→ POST /api/analytics/events    │                          │
    │                                     ├─→ AnalyticsAggregator    ├─→ Grafana Dashboards
    ├─ Payment Service (3008)            │   (Hourly/daily compute)  │
    │  └─→ POST /api/analytics/events    │                          │
    │                                     ├─→ PostgreSQL DB          │
    ├─ Notification Service (3010)       │   (analytics)             │
    │  └─→ POST /api/analytics/events    │                          │
    │                                     ├─→ REST API               ├─→ Mobile Apps
    └─ API Gateway (5000)                │   (/api/analytics/...)    │
       └─→ Routes to analytics           └───┘                       │
                                                                      │
                                         Real-time metrics
                                         for monitoring
```

## Integration Steps

### Step 1: Claims Service Integration

**File**: `services/claims-service/src/services/ClaimsService.ts`

```typescript
import axios from 'axios';

const analyticsClient = axios.create({
  baseURL: 'http://localhost:3009/api/analytics'
});

export class ClaimsService {
  async createClaim(data: CreateClaimInput): Promise<Claim> {
    const startTime = Date.now();
    
    try {
      // Create claim logic
      const claim = await this.db.insert(claims).values(data);
      
      // Log event to analytics
      await analyticsClient.post('/events', {
        events: [{
          eventType: 'claim_created',
          claimId: claim.id,
          memberId: data.memberId,
          status: 'SUCCESS',
          duration: Date.now() - startTime,
          metadata: {
            amount: data.amount,
            diagnosis: data.diagnosis,
          },
          source: 'claims-service'
        }]
      }).catch(err => console.error('Analytics logging failed:', err));
      
      return claim;
    } catch (error) {
      // Log failure
      await analyticsClient.post('/events', {
        events: [{
          eventType: 'claim_created',
          status: 'FAILURE',
          duration: Date.now() - startTime,
          errorMessage: error.message,
          source: 'claims-service'
        }]
      }).catch(err => console.error('Analytics logging failed:', err));
      
      throw error;
    }
  }

  async approveClaim(claimId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.db.update(claims).set({ status: 'approved' });
      
      await analyticsClient.post('/events', {
        events: [{
          eventType: 'claim_approved',
          claimId,
          status: 'SUCCESS',
          duration: Date.now() - startTime,
          source: 'claims-service'
        }]
      }).catch(() => {});
    } catch (error) {
      await analyticsClient.post('/events', {
        events: [{
          eventType: 'claim_approved',
          claimId,
          status: 'FAILURE',
          errorMessage: error.message,
          source: 'claims-service'
        }]
      }).catch(() => {});
      
      throw error;
    }
  }
}
```

### Step 2: Finance Service Integration

**File**: `services/finance-service/src/services/SagaOrchestrator.ts`

```typescript
export class SagaOrchestrator {
  private analyticsClient: AxiosInstance;

  constructor() {
    this.analyticsClient = axios.create({
      baseURL: 'http://localhost:3009/api/analytics'
    });
  }

  async executeSaga(sagaTransaction: SagaTransaction, executionPlan: any[]): Promise<SagaTransaction> {
    const startTime = Date.now();
    const correlationId = sagaTransaction.correlationId;

    try {
      // Log saga started
      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'saga_started',
          sagaId: sagaTransaction.sagaId,
          correlationId,
          status: 'IN_PROGRESS',
          source: 'finance-service'
        }]
      }).catch(() => {});

      // Execute saga steps...
      const result = await this.executeAllSteps(sagaTransaction, executionPlan);

      // Log saga completed
      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'saga_completed',
          sagaId: result.sagaId,
          correlationId,
          status: 'SUCCESS',
          duration: Date.now() - startTime,
          metadata: {
            stepsCompleted: result.steps.length,
            totalValue: result.metadata.totalValue
          },
          source: 'finance-service'
        }]
      }).catch(() => {});

      return result;
    } catch (error) {
      // Log saga failed
      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'saga_failed',
          sagaId: sagaTransaction.sagaId,
          correlationId,
          status: 'FAILURE',
          duration: Date.now() - startTime,
          errorMessage: error.message,
          source: 'finance-service'
        }]
      }).catch(() => {});

      throw error;
    }
  }
}
```

### Step 3: Payment Service Integration

**File**: `services/payment-service/src/services/PaymentService.ts`

```typescript
export class PaymentService {
  private analyticsClient: AxiosInstance;

  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResult> {
    const startTime = Date.now();
    const correlationId = paymentRequest.correlationId || uuid();

    try {
      // Process payment
      const result = await this.paymentGateway.charge(paymentRequest);

      // Log payment event
      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'payment_processed',
          correlationId,
          claimId: paymentRequest.claimId,
          memberId: paymentRequest.memberId,
          status: result.success ? 'SUCCESS' : 'FAILURE',
          statusCode: result.statusCode,
          duration: Date.now() - startTime,
          metadata: {
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            transactionId: result.transactionId,
          },
          source: 'payment-service'
        }]
      }).catch(() => {});

      return result;
    } catch (error) {
      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'payment_failed',
          correlationId,
          status: 'FAILURE',
          duration: Date.now() - startTime,
          errorMessage: error.message,
          source: 'payment-service'
        }]
      }).catch(() => {});

      throw error;
    }
  }
}
```

### Step 4: Notification Service Integration

**File**: `services/notification-service/src/services/NotificationService.ts`

```typescript
export class NotificationService {
  private analyticsClient: AxiosInstance;

  async sendNotification(notification: NotificationRequest): Promise<void> {
    const startTime = Date.now();

    try {
      await this.emailService.send(notification.email);

      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'notification_sent',
          correlationId: notification.correlationId,
          status: 'SUCCESS',
          duration: Date.now() - startTime,
          metadata: {
            type: notification.type,
            recipient: notification.email,
            channel: 'email',
          },
          source: 'notification-service'
        }]
      }).catch(() => {});
    } catch (error) {
      await this.analyticsClient.post('/events', {
        events: [{
          eventType: 'notification_sent',
          correlationId: notification.correlationId,
          status: 'FAILURE',
          errorMessage: error.message,
          source: 'notification-service'
        }]
      }).catch(() => {});

      throw error;
    }
  }
}
```

### Step 5: API Gateway Routing

**File**: `services/api-gateway/src/api/routes.ts`

```typescript
export function setupGatewayRoutes(app: Express) {
  // ... existing routes ...

  // Analytics routes (proxy to analytics service)
  app.use('/api/analytics', (req, res, next) => {
    req.headers['authorization'] = req.headers['authorization']; // Pass auth token
    return httpProxy.web(req, res, {
      target: 'http://localhost:3009',
      changeOrigin: true,
      pathRewrite: {
        '^/api/analytics': '/api/analytics'
      }
    });
  });
}
```

## Data Flow Examples

### Example 1: Claims to Payment Saga

```
1. Claim Created (Claims Service)
   → POST /api/analytics/events
   → eventType: 'claim_created'
   → correlationId: '550e8400-...'

2. Saga Started (Finance Service)
   → POST /api/analytics/events
   → eventType: 'saga_started'
   → correlationId: '550e8400-...' (same)

3. Payment Processed (Payment Service)
   → POST /api/analytics/events
   → eventType: 'payment_processed'
   → correlationId: '550e8400-...' (same)

4. Notification Sent (Notification Service)
   → POST /api/analytics/events
   → eventType: 'notification_sent'
   → correlationId: '550e8400-...' (same)

5. Saga Completed (Finance Service)
   → POST /api/analytics/events
   → eventType: 'saga_completed'
   → correlationId: '550e8400-...' (same)

Query complete trace:
GET /api/analytics/events/550e8400-...
→ Returns all 5 events with timestamps
```

### Example 2: Error Recovery

```
1. Payment Failed (Payment Service)
   → eventType: 'payment_failed'
   → status: 'FAILURE'

2. Recovery Initiated (Finance Service)
   → eventType: 'recovery_initiated'

3. Recovery Success/Failure (Finance Service)
   → eventType: 'recovery_success' or 'recovery_failed'

Query recovery metrics:
GET /api/analytics/payments?hoursBack=24
→ Shows payment success rate, recovery stats
```

## Metrics Collection Checklist

### Claims Service Must Track
- [ ] Claim created (with amount, diagnosis)
- [ ] Claim approved
- [ ] Claim rejected
- [ ] Claim processing time
- [ ] Validation errors

### Finance Service Must Track
- [ ] Saga started (with correlationId)
- [ ] Saga step completed (with step name)
- [ ] Saga failed
- [ ] Saga compensation executed
- [ ] Recovery attempts

### Payment Service Must Track
- [ ] Payment processed (with amount)
- [ ] Payment failed (with error)
- [ ] Payment retry
- [ ] Transaction duration

### Notification Service Must Track
- [ ] Email sent
- [ ] SMS sent
- [ ] Notification failed
- [ ] Delivery time

## Best Practices

### 1. Always Include Correlation ID
```typescript
const correlationId = request.correlationId || uuid();
// Use same correlationId throughout saga
// Enables complete end-to-end tracing
```

### 2. Handle Analytics Failures Gracefully
```typescript
await analyticsClient.post('/events', { events })
  .catch(err => {
    logger.warn('Analytics logging failed (non-blocking)', err);
    // Don't throw - don't impact main operation
  });
```

### 3. Include Relevant Metadata
```typescript
{
  eventType: 'claim_created',
  metadata: {
    amount: 5000,
    currency: 'USD',
    diagnosis: 'Appendicitis',
    provider: 'City Hospital',
    estimatedDuration: '2 hours'
  }
}
```

### 4. Measure Duration Accurately
```typescript
const startTime = Date.now();
try {
  const result = await operation();
  duration: Date.now() - startTime
} catch (error) {
  duration: Date.now() - startTime
}
```

### 5. Track Both Success and Failure
```typescript
// Always log, whether success or failure
// Include error details on failure
status: success ? 'SUCCESS' : 'FAILURE',
errorMessage: error?.message,
errorStack: error?.stack
```

## Monitoring Dashboards

### Real-time Dashboard
- Active sagas (in-progress)
- Payment success rate (last hour)
- Claim approval rate (last 24h)
- Service health status
- Critical alerts

### Performance Dashboard
- Claims: avg processing time (trend)
- Payments: p95, p99 duration (tail latency)
- Sagas: completion rate
- Recovery: success rate

### Business Dashboard
- Total claims created
- Total payment value
- Member activity
- Provider performance
- Revenue metrics

## Troubleshooting

### Events Not Appearing
1. Check analytics service is running: `curl http://localhost:3009/api/analytics/health`
2. Check network connectivity between services
3. Verify events are being POSTed
4. Check analytics service logs

### Wrong Correlation ID
1. Ensure correlationId passed through all service calls
2. Use same ID for entire saga
3. Verify from API request headers

### High Event Latency
1. Check buffer flush interval (default 5s)
2. Check database performance
3. Check network latency between services

## Production Deployment

### Environment Variables
```env
# Analytics Service (.env)
DATABASE_URL=postgresql://user:pass@prod-db:5432/analytics
PORT=3009
NODE_ENV=production
LOG_LEVEL=info
```

### Scaling Considerations
- Event buffer: 100 events (adjust based on load)
- Flush interval: 5 seconds (shorter for higher throughput)
- Aggregation: 5 minutes (adjust based on query frequency)
- Database: Separate from operational data
- Archival: Move events > 90 days to separate storage

## Next Steps

1. **Deploy Analytics Service**
   ```bash
   cd services/analytics-service
   npm install && npm run db:push
   npm start
   ```

2. **Integrate with Claims Service**
   - Add analytics client
   - Log claim events
   - Test event recording

3. **Integrate with Finance Service**
   - Add analytics client to SagaOrchestrator
   - Log saga lifecycle events
   - Test correlation tracing

4. **Set up Dashboards**
   - Create Grafana dashboards
   - Configure alerts
   - Monitor KPIs

---

For detailed API documentation, see: [Analytics Service README](./README.md)
