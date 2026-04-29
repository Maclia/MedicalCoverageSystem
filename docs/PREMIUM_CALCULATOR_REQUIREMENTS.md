# Premium Calculator System Requirements Specification

## Version: 1.0
## Last Updated: 2026-04-29

---

## 1. OVERVIEW

This document defines the complete requirements for the Medical Coverage System Premium Calculation Engine. The system provides accurate, auditable, and configurable premium calculations for medical insurance policies.

---

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 Core Calculation Engine

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | System shall calculate annual premium based on member profile attributes | HIGH | ✅ Implemented |
| FR-002 | System shall support inpatient, outpatient, dental, and optical cover types | HIGH | ⚙️ Partial |
| FR-003 | System shall apply age band base rates | HIGH | ✅ Implemented |
| FR-004 | System shall apply geographic region multipliers | HIGH | ✅ Implemented |
| FR-005 | System shall apply medical risk profile factors | HIGH | ✅ Implemented |
| FR-006 | System shall apply lifestyle factors (smoker/non-smoker) | MEDIUM | ✅ Implemented |
| FR-007 | System shall apply family size discounts | MEDIUM | ✅ Implemented |
| FR-008 | System shall apply cover limit multipliers | HIGH | ✅ Implemented |
| FR-009 | System shall provide detailed calculation breakdown with audit trail | HIGH | ✅ Implemented |
| FR-010 | System shall generate unique quote IDs for all calculations | HIGH | ✅ Implemented |
| FR-011 | Calculated quotes shall be valid for 30 days | MEDIUM | ✅ Implemented |
| FR-012 | System shall support corporate scheme overrides | HIGH | ⏳ Pending |

### 2.2 Rate Table Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-101 | All rate tables, factors, and business rules shall be persisted in database | HIGH | ✅ Implemented |
| FR-102 | Rate tables shall support versioning with effective dates | HIGH | ✅ Implemented |
| FR-103 | System shall support multiple concurrent rate table versions | MEDIUM | ✅ Implemented |
| FR-104 | Administrators shall be able to modify rate tables without frontend deployment | HIGH | ✅ Implemented |
| FR-105 | Rate table changes shall have full audit logging | HIGH | ⏳ Pending |

### 2.3 User Interface Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-201 | Calculator shall provide real-time calculation feedback | HIGH | ✅ Implemented |
| FR-202 | System shall display annual and monthly premium values | HIGH | ✅ Implemented |
| FR-203 | Calculation breakdown shall show each step with value, factor, and result | HIGH | ✅ Implemented |
| FR-204 | Interface shall support quick actions dialog mode | HIGH | ✅ Implemented |
| FR-205 | Quotes shall be shareable via unique URL | MEDIUM | ⏳ Pending |

---

## 3. TECHNICAL REQUIREMENTS

### 3.1 API Specifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/premium/v1/calculate` | POST | Submit calculation request |
| `/api/premium/v1/quote/{quoteId}` | GET | Retrieve existing quote |
| `/api/premium/v1/rate-tables` | GET | Fetch active rate tables |
| `/api/premium/v1/rate-tables` | POST | Create new rate table version |
| `/api/premium/v1/rate-tables/{id}` | PUT | Update rate table |

### 3.2 Data Persistence

All premium calculation data shall be persisted in the database:
- Quote history with full calculation parameters
- Rate table versions with change tracking
- Calculation audit logs
- Scheme override configurations

### 3.3 Performance Requirements

| Metric | Requirement |
|--------|-------------|
| Calculation Latency | < 200ms |
| Rate Table Cache TTL | 3600 seconds |
| Quote Storage Period | 7 years |
| Concurrent Users | 1000+ |

---

## 4. INPUT PARAMETERS

| Parameter | Type | Valid Values |
|-----------|------|--------------|
| `age` | Number | 0 - 120 |
| `gender` | Enum | MALE, FEMALE |
| `regionCode` | String | NAIROBI_TOP, NAIROBI_STANDARD, URBAN, RURAL |
| `coverLimit` | Number | 500000, 1000000, 2500000, 5000000, 10000000 |
| `riskCode` | String | STANDARD, CONTROLLED_CHRONIC, MULTIPLE_CHRONIC, HIGH_RISK |
| `lifestyleCode` | Enum | SMOKER, NON_SMOKER |
| `familySize` | Number | 1 - 10 |
| `outpatientLimit` | Number | 0 - 500000 |
| `coverType` | String | INPATIENT, OUTPATIENT, DENTAL, OPTICAL, COMPREHENSIVE |

---

## 5. OUTPUT SPECIFICATION

### PremiumCalculationResult

```typescript
{
  quoteId: string,              // Unique quote identifier
  basePremium: number,          // Base premium before adjustments
  finalPremium: number,         // Final calculated premium
  monthlyPremium: number,       // Monthly payment amount
  calculationDate: string,      // ISO timestamp
  validUntil: string,           // Quote expiry date
  breakdown: CalculationStep[], // Full audit trail
  factors: Record<string, number> // Applied multipliers
}
```

### CalculationStep

```typescript
{
  step: string,                 // Step identifier
  description: string,          // Human readable description
  value: number,                // Input value
  factor?: number,              // Applied multiplier (if any)
  result: number                // Result after step
}
```

---

## 6. BUSINESS RULES

### 6.1 Age Bands

| Age Range | Base Annual Premium |
|-----------|----------------------|
| 0-17 | KES 18,000 |
| 18-25 | KES 28,000 |
| 26-35 | KES 42,000 |
| 36-45 | KES 58,000 |
| 46-55 | KES 78,000 |
| 56-65 | KES 110,000 |
| 66-75 | KES 165,000 |
| 75+ | KES 240,000 |

### 6.2 Region Factors

| Region | Multiplier |
|--------|------------|
| Capital Top Tier | 1.30x |
| Capital Standard | 1.10x |
| Urban Areas | 1.00x |
| Rural Network | 0.85x |

### 6.3 Risk Factors

| Risk Profile | Multiplier |
|--------------|------------|
| Standard | 1.00x |
| Controlled Chronic | 1.15x |
| Multiple Chronic | 1.35x |
| High Risk | 1.60x |

---

## 7. IMPLEMENTATION STATUS

✅ **COMPLETED**:
- Core calculation engine
- React Query integration
- Rate table API endpoints
- Database persistence
- TypeScript type definitions
- User interface components
- Quick actions dialog integration

🚧 **IN PROGRESS**:
- Scheme override system
- Rate table audit logging
- Quote sharing functionality
- Batch calculation API
- Historical comparison reports

---

## 8. DEPENDENCIES

- Premium Calculation Service (backend microservice)
- PostgreSQL database for rate table storage
- Redis cache for performance optimization
- React Query for client-side caching
- React Hook Form for input validation

---

This document defines the complete premium calculator implementation requirements. All future changes to the calculation engine must be documented here.