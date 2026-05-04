# TOKEN UTILIZATION PROCESS - FULL TECHNICAL DOCUMENTATION

Medical Coverage System Platform

---

## 1. SYSTEM OVERVIEW

Tokens are the internal prepaid operational currency for all platform services. This document describes the complete end-to-end token utilization workflow, including reservation, consumption, refund, and accounting processes.

---

## 2. TOKEN LIFECYCLE STATES

| State | Description |
|-------|-------------|
| `AVAILABLE` | Tokens in organization balance available for use |
| `RESERVED` | Tokens temporarily held during operation execution |
| `CONSUMED` | Tokens permanently deducted after successful operation |
| `REFUNDED` | Reserved tokens returned to available balance |
| `EXPIRED` | Tokens that passed expiration date without use |

---

## 3. END-TO-END UTILIZATION WORKFLOW

```
┌───────────────────────────────────────────────────────────┐
│                     OPERATION REQUEST                     │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│  STEP 1: TOKEN RESERVATION                               │
│                                                          │
│  ✓ Lookup operation token cost from rate card            │
│  ✓ Validate organization has sufficient balance          │
│  ✓ Create reservation record with expiry (30 seconds)    │
│  ✓ Deduct reserved amount from available balance         │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│  STEP 2: OPERATION EXECUTION                             │
│                                                          │
│  ✓ Execute actual business operation                     │
│  ✓ Track execution status and all sub-operations         │
│  ✓ Collect audit trail and telemetry                     │
└─────────────────────────────┬─────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
┌─────────▼─────────┐                   ┌─────────▼─────────┐
│ OPERATION SUCCESS │                   │ OPERATION FAILURE │
└─────────┬─────────┘                   └─────────┬─────────┘
          │                                       │
┌─────────▼─────────┐                   ┌─────────▼─────────┐
│ STEP 3: CONSUME   │                   │ STEP 4: REFUND    │
│                   │                   │                   │
│ ✓ Mark tokens as  │                   │ ✓ Cancel          │
│   permanently     │                   │   reservation     │
│   consumed        │                   │ ✓ Return tokens    │
│ ✓ Create debit    │                   │   to balance       │
│   ledger entry    │                   │ ✓ Create credit    │
│ ✓ Log audit event │                   │   ledger entry    │
└───────────────────┘                   └───────────────────┘
```

---

## 4. RESERVATION MECHANISM

### 4.1 Reservation Properties
```javascript
Reservation {
  id: string,
  organizationId: number,
  operationType: string,
  operationReference: string,
  tokenAmount: number,
  expiresAt: Timestamp,
  status: 'active' | 'completed' | 'cancelled',
  createdAt: Timestamp,
  correlationId: string
}
```

### 4.2 Timeout Rules
- Default reservation timeout: **30 seconds**
- Long running operations: up to **5 minutes**
- Batch operations: up to **15 minutes**
- All expired reservations are automatically rolled back by background job

### 4.3 Concurrency Handling
- All balance updates use **optimistic locking** with version numbers
- Concurrent requests are queued and processed sequentially
- Race condition protection at database transaction level
- No overdraw guarantee with ACID compliance

---

## 5. TOKEN RATE CARD

### 5.1 Claim Processing
| Operation | Token Cost | Refundable |
|-----------|------------|------------|
| Claim submission | 7 tokens | ✅ Yes |
| Duplicate detection | 5 tokens | ✅ Yes |
| Provider authorization | 5 tokens | ✅ Yes |
| Member eligibility | 5 tokens | ✅ Yes |
| Benefit balance check | 3 tokens | ✅ Yes |
| Business rules validation | 10 tokens | ✅ Yes |
| Medical code validation | 8 tokens | ✅ Yes |
| Fraud detection scan | 20 tokens | ✅ Yes |
| Claim adjudication scoring | 15 tokens | ❌ No |
| Automatic approval/denial | 12 tokens | ❌ No |
| Benefit calculation | 10 tokens | ❌ No |
| Payment authorization | 8 tokens | ✅ Yes |
| Ledger posting | 12 tokens | ❌ No |
| Remittance creation | 7 tokens | ❌ No |
| Reconciliation | 5 tokens | ❌ No |

### 5.2 Other Operations
| Category | Operation | Token Cost |
|----------|-----------|------------|
| Membership | Card issuance | 15 tokens |
| Membership | Card verification | 3 tokens |
| Membership | Eligibility check | 5 tokens |
| Pre-Authorization | Create request | 12 tokens |
| Pre-Authorization | Approve | 10 tokens |
| Provider | Verification check | 6 tokens |
| Provider | Credential validation | 20 tokens |
| Reporting | Standard report | 50 tokens |
| Reporting | Custom report | 100 tokens |
| Documents | OCR per page | 12 tokens |
| Documents | Fraud scan | 20 tokens |

---

## 6. ACCOUNTING SYSTEM

### 6.1 Double Entry Bookkeeping
All token movements follow strict double entry rules:

| Transaction | Debit Account | Credit Account |
|-------------|---------------|----------------|
| Token Purchase | Token Assets | Accounts Receivable |
| Token Reservation | Reserved Tokens | Available Tokens |
| Token Consumption | Expensed Tokens | Reserved Tokens |
| Token Refund | Available Tokens | Reserved Tokens |
| Token Expiry | Expired Tokens | Available Tokens |

### 6.2 Ledger Entries
Every token transaction records:
- Balance before operation
- Transaction amount
- Balance after operation
- Reference ID to originating operation
- User context and audit trail
- Correlation ID for distributed tracing

---

## 7. ERROR HANDLING & RECOVERY

### 7.1 Automatic Refund Triggers
Tokens are **automatically refunded** when:
- ❌ Any validation check fails
- ❌ Operation times out
- ❌ System error or infrastructure failure
- ❌ Business rule rejection
- ❌ Payment authorization failure
- ❌ Duplicate operation detected

### 7.2 No Partial Charges
> **CRITICAL RULE**: There are no partial token charges.
> Either **100% of tokens are charged** on full success or **100% are refunded**.
> There are never situations where only part of the operation cost is charged.

### 7.3 Reconciliation Job
Background job runs every 5 minutes to:
1.  Find expired reservations
2.  Automatically refund orphaned tokens
3.  Reconcile ledger balances
4.  Generate discrepancy alerts
5.  Repair any inconsistent states

---

## 8. BULK & VOLUME DISCOUNTS

| Volume | Discount Percentage | Effective Cost Per Claim |
|--------|---------------------|--------------------------|
| 1-9 | 0% | 132 tokens |
| 10-99 | 10% | 119 tokens |
| 100-999 | 20% | 106 tokens |
| 1000+ | 30% | 92 tokens |

Discounts are calculated at batch submission time and applied before token reservation.

---

## 9. MONITORING & OBSERVABILITY

### 9.1 Token Metrics Collected
- Real-time token consumption rate (tokens/second)
- Operation success vs refund ratio
- Average cost per operation type
- Reservation timeout frequency
- Balance depletion trends
- Top consuming organizations

### 9.2 Alert Thresholds
- Organization balance < 20% remaining → Warning
- Organization balance < 10% remaining → Critical alert
- Organization balance = 0 → Operations blocked
- Refund rate > 30% → Investigation alert
- Reservation timeout > 5% → System health alert

---

## 10. TECHNICAL IMPLEMENTATION NOTES

### 10.1 Database Isolation
All token operations run at `SERIALIZABLE` transaction isolation level to eliminate race conditions and ensure absolute balance accuracy.

### 10.2 Idempotency
All token requests support idempotency keys, allowing safe retries without risk of duplicate charges.

### 10.3 Audit Immutability
All token ledger entries are append-only and cryptographically signed. Entries cannot be modified or deleted after creation.

---

## 11. EXCEPTIONS & SPECIAL CASES

| Scenario | Handling |
|----------|----------|
| Network failure during reservation | Idempotent retry with same request ID |
| Service crash mid-operation | Automatic refund on next reconciliation run |
| Partial operation failure | Full 100% refund of all tokens |
| Dispute resolution | Manual adjustment with audit trail |
| Promotional tokens | Separate ledger account, consumed first |

---

## 12. CLIENT SIDE PERSISTED MUTATION INTEGRATION

### 12.1 Offline Token Handling
When client operates in offline mode:
- Token reservations are queued locally with estimated costs
- Reservation requests are retried automatically when connectivity is restored
- All operations are atomic - either complete fully or are rolled back
- User receives clear visibility of pending token charges

### 12.2 Mutation Queue Guarantees
- Idempotency keys are preserved across retries
- Token reservation expiration is extended for offline operations
- No duplicate charges even after multiple reconnection attempts
- Local balance cache is kept synchronized with server state

---

## 13. RECENT CHANGES & UPGRADES

### 13.1 v2.5 System Updates
- ✅ Added partial token consumption support for staged operations
- ✅ Implemented token rollover between billing periods
- ✅ Added tiered rate cards for enterprise customers
- ✅ Optimized reservation database queries (3x performance improvement)
- ✅ Added real-time balance webhook notifications

### 13.2 Updated Token Rates (Effective 27 April 2026)
| Operation | Previous Cost | New Cost | Change |
|-----------|---------------|----------|--------|
| Fraud detection scan | 20 tokens | 15 tokens | -25% |
| Claim adjudication scoring | 15 tokens | 12 tokens | -20% |
| OCR per page | 12 tokens | 8 tokens | -33% |
| Custom report | 100 tokens | 75 tokens | -25% |

---

---

## 14. TOKEN SECURITY VALIDATION

### 14.1 Transaction Security Flow
All operations now implement multi-level token validation before transaction execution:

```
┌───────────────────────────────────────────────────────────┐
│                     TOKEN VALIDATION                      │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│  ✅ JWT Signature Verification                            │
│  ✅ Token Expiration Check                                │
│  ✅ Required Claims Validation                            │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│  ✅ User Existence Verification (Database)                │
│  ✅ User Active Status Confirmation                       │
│  ✅ Token Revocation Check (Password change detection)    │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│  ✅ Active Session Validation                             │
│  ✅ Transaction Permission Check                          │
│  ✅ Rate Limiting Verification                            │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│  ✅ Security Audit Event Logged                           │
│  ✅ Transaction Allowed to Execute                        │
└───────────────────────────────────────────────────────────┘
```

### 14.2 Security Features
| Security Check | Description | Enforcement |
|----------------|-------------|-------------|
| Real-time user validation | User status is verified against live database on every transaction | Mandatory |
| Token revocation | Tokens are automatically invalidated after password change | Mandatory |
| Active session requirement | User must have at least one active valid session | Mandatory |
| Permission checking | Transaction-specific permissions are verified | Optional per operation |
| Audit logging | All validation attempts are permanently logged | Mandatory |

### 14.3 Implementation Methods
```typescript
// Standard token validation
authService.validateAccessToken(token)

// Transaction-level security validation
authService.validateTokenForTransaction(token, requiredPermission)
```

---

**Document Version**: 1.2
**Last Updated**: 4 May 2026
**Applies To**: All Platform Services v2.5+
