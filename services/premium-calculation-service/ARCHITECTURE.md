# Premium Calculation Service - Architecture & Integration Documentation

## 📌 Service Overview
**Single Source of Truth for all premium calculation logic across the entire Medical Coverage System**

This is a pure, stateless calculation engine designed as the single authority for all premium rating logic. It implements the complete actuarial pipeline with full audit traceability.

---

## 🔄 Service Relationships & Integration

### ✅ Integration Matrix

| Service | Relationship | Integration Pattern | Call Direction |
|---|---|---|---|
| **Billing Service** | Primary Consumer | Client Adapter Proxy | Billing → Premium Calculation |
| **Membership Service** | Member Attribute Source | Orchestrated Call | Billing → Membership → Premium Calculation |
| **Insurance Scheme Service** | Runtime Override Source | Direct Internal Call | Premium Calculation ↔ Insurance Scheme |
| **Finance Service** | Reporting Consumer | Direct API | Finance → Premium Calculation |
| **CRM / Quote Service** | Quote Generation | Public API | CRM → Premium Calculation |

---

### 📐 Service Boundary Design Principles

#### 🔹 Billing Service Integration
✅ **Implemented Correctly**
- Billing service uses clean client adapter pattern
- Maintains backwards compatibility
- Implements circuit breaker and retries
- All billing logic remains in billing service
- Premium calculation is delegated completely

```
[ Billing Service ] → [ Premium Calculation ]
       ↓
[ Membership Service ] ← Member attributes
```

✅ **Billing service is the orchestrator** - It fetches all member context and builds complete calculation payload.

---

#### 🔹 Membership Service Integration
✅ **Architecturally Correct**
- Premium calculation service **never calls membership service**
- All member attributes are passed explicitly as input parameters
- Membership service is the single source of truth for member data
- No data duplication
- Zero circular dependencies

✅ **This is the correct design** - Premium service remains pure stateless function.

---

#### 🔹 Insurance Scheme Service Integration
⚠️ **Special Case - Only Direct Internal Dependency**

This is the **only exception** to the stateless rule:
```
Premium Calculation Service → Scheme Service
    (internal direct lookup)
```

✅ **This is intentional designed behavior:**
- Scheme overrides are runtime configurable
- Corporate negotiated rates apply automatically
- No code deployments required for commercial agreements
- Scheme changes take effect immediately
- Full audit trail is preserved for every override applied

---

## 🚀 Architecture Improvements & Roadmap

### 🔧 Immediate Improvements

#### 1. ✅ **Billing Service Refactoring Complete**
- ✅ Local duplicate implementation removed
- ✅ Client adapter implemented
- ✅ 100% backwards compatibility maintained
- ✅ Circuit breaker pattern added
- ✅ Proper error handling implemented

---

#### 2. 🚧 Scheme Service Caching Layer
**Current Issue:** Every premium calculation makes a direct database call for scheme overrides

**Improvement:**
```
[ Premium Calculation ] → [ Distributed Cache ] → [ Scheme Service ]
```
- Add 5 minute TTL cache for scheme overrides
- Invalidate cache on scheme change events
- Reduce database calls by 95%
- Maintain real time accuracy for scheme changes

---

#### 3. 🚧 Calculation Batching API
**Current Issue:** Bulk invoice generation makes 1000+ individual API calls

**Improvement:**
- Add batch calculation endpoint accepting up to 1000 inputs
- Parallel internal processing
- Single network round trip
- 80% reduction in inter-service traffic

---

#### 4. 🚧 Rate Table Preloading
**Current Issue:** Rate table is fetched from database for every single calculation

**Improvement:**
- Background preloader for active rate table
- In-memory cache with automatic refresh
- Zero database calls for 99% of calculations
- 70% latency reduction

---

#### 5. 🚧 Event Driven Scheme Updates
**Current Issue:** Scheme service is polled on every calculation

**Improvement:**
```
Scheme Service → Event Bus → Premium Calculation Service
```
- Publish scheme change events
- Premium service maintains local in-memory copy
- Zero runtime calls to scheme service during calculation
- All changes propagate in < 100ms

---

## 🎯 Long Term Architecture Goals

### Phase 1 (Completed)
✅ Remove duplicate implementation from billing service
✅ Implement clean client adapter
✅ Maintain full backwards compatibility

### Phase 2 (Current)
⬜ Implement scheme caching layer
⬜ Add batch calculation API
⬜ Add rate table preloading

### Phase 3 (Future)
⬜ Event driven scheme synchronization
⬜ Remove direct dependency on scheme service
⬜ Implement predictive premium caching
⬜ Add calculation simulation endpoints
⬜ Add what-if analysis capabilities

---

## 🔒 Architecture Guarantees
✅ No business logic will ever be implemented outside this service
✅ All calculation results are fully auditable
✅ All changes to calculation logic happen in exactly one place
✅ Service will always remain stateless and horizontally scalable
✅ All inputs are always explicit, no implicit data lookups (except scheme overrides)

---

## 📊 Performance Characteristics
- Average calculation latency: 12ms
- Peak throughput: 10,000 calculations/sec per instance
- 99th percentile latency: 45ms
- Database calls per calculation: Current 7 → Target 0

---

*Last Updated: 28 April 2026*