# Pricing Service Integration Patterns

## 🔄 Integration Architecture Overview

This service follows the standard system service communication patterns:
- Async event-driven integration via Message Queue
- Sync HTTP client calls via Service Registry
- Saga Orchestration pattern for distributed transactions
- Domain Events for cross-service state changes

---

## 📌 CRM Service Integration (Quote Generation)

### 1. CRM → Pricing Service Workflow
```
Quote Flow:
┌─────────────┐     1. Request Quote      ┌────────────────┐
│ CRM Service │ ─────────────────────────► │ Pricing Service│
│ (Leads)     │    2. Calculate Premium   │                │
│             │ ◄───────────────────────── │                │
│             │     3. Return Quote       │                │
│             │                            │                │
│             │     4. Create Quote       │                │
│             │ ◄───────────────────────── │                │
└─────────────┘     5. Quote Generated    └────────────────┘
```

### API Endpoints for CRM:
```http
POST /api/pricing/v1/quote/generate
Body:
{
  "leadId": "uuid",
  "age": 38,
  "gender": "MALE",
  "regionCode": "NAIROBI_TOP",
  "coverLimit": 2500000,
  "coverType": "INPATIENT",
  "outpatientLimit": 100000,
  "familySize": 4,
  "riskCode": "STANDARD",
  "lifestyleCode": "NON_SMOKER"
}

Response:
{
  "quoteId": "uuid",
  "basePremium": 58000,
  "finalPremium": 116397,
  "breakdown": [ CalculationSteps ],
  "validUntil": "2026-05-28",
  "rateTableId": "uuid"
}
```

### Event Integration:
- CRM publishes `QuoteRequested` event
- Pricing Service subscribes, calculates, publishes `QuoteGenerated`
- CRM creates quote record with returned pricing

---

## 📌 Insurance / Scheme Service Integration

### 1. Scheme Member Addition Workflow
```
Member Onboarding Flow:
┌────────────────┐    1. Member Added     ┌────────────────┐
│ Scheme Service │ ──────────────────────► │ Pricing Service│
│                │    2. Get Rate Table    │                │
│                │ ◄────────────────────── │                │
│                │                         │                │
│                │    3. Calculate Premium │                │
│                │ ◄────────────────────── │                │
│                │    4. Prorated Amount   │                │
│                │ ◄────────────────────── │                │
└────────────────┘    5. Billing Trigger   └────────────────┘
```

### API Endpoints for Scheme Service:
```http
GET  /api/pricing/v1/rate-tables/active
POST /api/pricing/v1/calculate/member
POST /api/pricing/v1/calculate/prorated
POST /api/pricing/v1/scheme/{schemeId}/rates
```

### Domain Events:
- `RateTableActivated` → all services notified of new rates
- `MemberPremiumCalculated` → Billing service picks up for invoicing
- `SchemeRatesUpdated` → existing policies recalculated

---

## 📌 Billing Service Integration

```
Premium Billing Flow:
┌────────────────┐    1. Get Premium     ┌────────────────┐
│ Billing Service│ ──────────────────────► │ Pricing Service│
│                │    2. Amount Returned  │                │
│                │ ◄────────────────────── │                │
│                │                         │                │
│                │    3. Generate Invoice │                │
│                │                         │                │
└────────────────┘                         └────────────────┘
```

---

## 🔧 Standard Service Client Setup

All services use identical client pattern from shared library:

```typescript
// Example CRM Service Client Implementation
import { ServiceRegistry } from '@medical/shared/service-communication';
import { HttpClient } from '@medical/shared/service-communication';

export class PricingServiceClient {
  private client: HttpClient;

  constructor() {
    this.client = ServiceRegistry.getClient('pricing-service');
  }

  async generateQuote(request: QuoteRequest): Promise<QuoteResponse> {
    return this.client.post('/v1/quote/generate', request);
  }

  async calculateMemberPremium(input: PremiumInput): Promise<PremiumResult> {
    return this.client.post('/v1/calculate/member', input);
  }
}
```

---

## ✅ Integration Checklist

✅ **CRM Service Integration**:
- [ ] Add pricing service client to CRM
- [ ] Update QuoteController to call pricing endpoint
- [ ] Remove hardcoded pricing logic from QuoteService
- [ ] Subscribe to QuoteGenerated events
- [ ] Add quote expiration handling

✅ **Scheme Service Integration**:
- [ ] Add pricing service client to insurance-service
- [ ] Call pricing on member addition
- [ ] Implement prorated premium calculation
- [ ] Remove premium calculation from SchemeService
- [ ] Update policy creation flow

✅ **Billing Service Integration**:
- [ ] Get premium amounts from pricing instead of calculating locally
- [ ] Support scheme overrides and experience loadings

✅ **System Wide**:
- [ ] Add pricing-service to API Gateway routes
- [ ] Register in Service Registry
- [ ] Add to docker-compose.yml
- [ ] Update environment variables template
- [ ] Add distributed tracing headers