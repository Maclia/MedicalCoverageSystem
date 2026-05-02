# 🚀 CRM Service Architecture Refactor Plan
## Compliance with Architecture Standards AV-001

---

## ✅ PROBLEM STATEMENT
Current CRM Service directly publishes events to EventBus bypassing the Transaction Outbox pattern. This violates AV-001 standard and creates:
- ❌ Risk of event loss on service crash
- ❌ No transactional consistency between database changes and events
- ❌ No at-least-once delivery guarantee
- ❌ Cannot replay events
- ❌ Broken audit trail guarantees

---

## 📋 REFACTOR PHASES

### PHASE 1: OUTBOX PATTERN INTEGRATION ✅
| Step | Action | Estimate | Status |
|---|---|---|---|
| 1.1 | Add outbox database schema to CRM database | 1h | `TODO` |
| 1.2 | Implement OutboxRepository for CRM service | 2h | `TODO` |
| 1.3 | Integrate OutboxProcessor worker into CRM service | 1h | `TODO` |
| 1.4 | Modify EventClient to write to outbox instead of direct publish | 1h | `TODO` |

### PHASE 2: SAFE TRANSITION 🔄
| Step | Action | Estimate | Status |
|---|---|---|---|
| 2.1 | Keep both publishing paths temporarily with feature flag | 0.5h | `TODO` |
| 2.2 | Run dual publishing for 48 hours monitoring | 48h | `TODO` |
| 2.3 | Verify 100% event delivery consistency | 1h | `TODO` |
| 2.4 | Remove direct EventBus publish calls | 0.5h | `TODO` |

### PHASE 3: SAGA ORCHESTRATION 🎯
| Step | Action | Estimate | Status |
|---|---|---|---|
| 3.1 | Implement CRM event saga definitions | 3h | `TODO` |
| 3.2 | Migrate lead conversion flow to use saga pattern | 4h | `TODO` |
| 3.3 | Migrate company creation flow to use saga pattern | 3h | `TODO` |
| 3.4 | Migrate opportunity won flow to use saga pattern | 3h | `TODO` |

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### Database Schema Changes
```sql
-- CRM Outbox Table
CREATE TABLE crm_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    failed_attempts INT NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE INDEX idx_crm_outbox_status ON crm_outbox(status);
CREATE INDEX idx_crm_outbox_created_at ON crm_outbox(created_at);
```

### EventClient Refactor
```typescript
// After refactor:
async publishEvent(eventType: string, aggregateId: string, data: any, metadata: any = {}): Promise<string> {
  const event = EventFactory.createEvent({
    type: eventType,
    aggregateId: String(aggregateId),
    aggregateType: 'crm',
    data,
    metadata: {
      service: 'crm-service',
      timestamp: Date.now(),
      ...metadata
    }
  });

  // Write to database transactionally
  await this.outboxRepository.save(event);
  
  // Event will be published asynchronously by OutboxProcessor
  return event.id;
}
```

---

## ✅ VALIDATION CHECKLIST AFTER REFACTOR

1. 🔍 **AV-001 Compliance**
    - [ ] No direct `eventBus.publish()` calls exist in CRM service
    - [ ] All events go through outbox table
    - [ ] OutboxProcessor is the only component with EventBus access

2. 🔍 **Transaction Safety**
    - [ ] Event persistence happens in same transaction as business data
    - [ ] Events are guaranteed to be published even if service crashes
    - [ ] Duplicate event handling implemented

3. 🔍 **Observability**
    - [ ] Outbox metrics exposed (pending count, published per second, failures)
    - [ ] Dead letter queue configured for failed events
    - [ ] Alerting set up for outbox backlog

---

## ⏰ TIMELINE
| Phase | Timeline |
|---|---|
| Phase 1 Implementation | Day 1 |
| Phase 2 Dual Publishing | Days 2-3 |
| Phase 3 Saga Migration | Days 4-6 |
| Final Validation & Sign-off | Day 7 |

---

## 🎯 SUCCESS METRICS
✅ **100% AV-001 Standard Compliance**
✅ **Zero event loss**
✅ **Transactional consistency guarantee**
✅ **Architecture validation tests pass on every PR**
✅ **Overall system compliance score: 100%**

> This refactor will bring the CRM service into full alignment with the system architecture standards and remove the current deployment blocker.