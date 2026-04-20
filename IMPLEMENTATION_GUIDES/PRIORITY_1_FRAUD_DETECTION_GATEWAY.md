# Priority 1: Fraud Detection Service API Gateway Integration

**Status**: To Be Implemented  
**Estimated Effort**: 1-2 hours  
**Date Created**: April 20, 2026  
**Dependencies**: None (can be implemented independently)

---

## Overview

This guide implements external fraud assessment request routing through the API Gateway. The fraud detection service will receive claims and provider data for real-time fraud risk assessment.

## Architecture

```
Client Request
    ↓
API Gateway: POST /api/fraud/assess
    ↓
Fraud Detection Service
    ├─ Analyze claim patterns
    ├─ Check provider risk scores
    ├─ Assess member history
    └─ Return fraud risk level
    ↓
Response to Client
```

## Implementation Steps

### Step 1: Add Fraud Route to API Gateway

**File**: `services/api-gateway/src/routes/fraud.ts`

```typescript
import express, { Request, Response } from 'express';
import axios from 'axios';
import { requireRole } from '../middleware/auth';

const router = express.Router();
const FRAUD_SERVICE_URL = process.env.FRAUD_SERVICE_URL || 'http://fraud-service:3011';

/**
 * POST /api/fraud/assess
 * 
 * Assess fraud risk for a claim
 * 
 * Request body:
 * {
 *   claimId: string,
 *   memberId: string,
 *   providerId: string,
 *   amount: number,
 *   procedureCode: string,
 *   timestamp: ISO8601 string
 * }
 * 
 * Response:
 * {
 *   claimId: string,
 *   riskScore: number (0-100),
 *   riskLevel: 'low' | 'medium' | 'high' | 'critical',
 *   flags: string[],
 *   recommendations: string[],
 *   timestamp: ISO8601 string
 * }
 */
router.post('/assess', requireRole('claims_adjuster', 'fraud_analyst'), async (req: Request, res: Response) => {
  try {
    const { claimId, memberId, providerId, amount, procedureCode, timestamp } = req.body;

    // Validate required fields
    if (!claimId || !memberId || !providerId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: claimId, memberId, providerId, amount',
      });
    }

    // Call fraud detection service
    const fraudResponse = await axios.post(`${FRAUD_SERVICE_URL}/assess`, {
      claimId,
      memberId,
      providerId,
      amount,
      procedureCode,
      timestamp: timestamp || new Date().toISOString(),
    }, {
      headers: {
        'Authorization': req.headers.authorization,
        'X-Request-ID': req.headers['x-request-id'],
      },
      timeout: 30000,
    });

    // Log assessment for audit trail
    console.log(`[FRAUD ASSESSMENT] Claim ${claimId}: Risk Level ${fraudResponse.data.riskLevel}`);

    // Return fraud assessment result
    res.json({
      ...fraudResponse.data,
      assessedBy: 'fraud-detection-service',
      assessedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[FRAUD GATEWAY ERROR]', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'Fraud service unavailable',
      });
    }

    res.status(500).json({
      error: 'Failed to assess fraud risk',
      details: error.message,
    });
  }
});

/**
 * GET /api/fraud/history/:memberId
 * 
 * Get fraud assessment history for a member
 */
router.get('/history/:memberId', requireRole('claims_adjuster', 'fraud_analyst'), async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const historyResponse = await axios.get(`${FRAUD_SERVICE_URL}/history/${memberId}`, {
      params: { limit, offset },
      headers: {
        'Authorization': req.headers.authorization,
      },
      timeout: 30000,
    });

    res.json(historyResponse.data);
  } catch (error: any) {
    console.error('[FRAUD HISTORY ERROR]', error.message);
    res.status(500).json({ error: 'Failed to fetch fraud history' });
  }
});

/**
 * POST /api/fraud/bulk-assess
 * 
 * Assess fraud risk for multiple claims (batch processing)
 */
router.post('/bulk-assess', requireRole('fraud_analyst', 'admin'), async (req: Request, res: Response) => {
  try {
    const { claims } = req.body;

    if (!Array.isArray(claims) || claims.length === 0) {
      return res.status(400).json({
        error: 'Expected array of claims in request body',
      });
    }

    if (claims.length > 1000) {
      return res.status(400).json({
        error: 'Batch limit exceeded (max 1000 claims per request)',
      });
    }

    // Call fraud service for batch assessment
    const bulkResponse = await axios.post(`${FRAUD_SERVICE_URL}/bulk-assess`, { claims }, {
      headers: {
        'Authorization': req.headers.authorization,
      },
      timeout: 60000,
    });

    res.json({
      processed: bulkResponse.data.processed,
      assessments: bulkResponse.data.assessments,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[BULK FRAUD ASSESSMENT ERROR]', error.message);
    res.status(500).json({ error: 'Bulk fraud assessment failed' });
  }
});

export default router;
```

### Step 2: Register Fraud Routes in API Gateway

**File**: `services/api-gateway/src/index.ts`

Add to your Express app setup:

```typescript
import fraudRoutes from './routes/fraud';

// ... other route registrations

// Fraud Detection Routes
app.use('/api/fraud', fraudRoutes);

console.log('✓ Fraud detection routes registered');
```

### Step 3: Create Fraud Service Environment Configuration

**File**: `services/api-gateway/.env`

Add:

```env
# Fraud Detection Service
FRAUD_SERVICE_URL=http://fraud-service:3011
FRAUD_TIMEOUT=30000
```

### Step 4: Add Request/Response Validation Schemas

**File**: `shared/schemas/fraudSchema.ts`

```typescript
import { z } from 'zod';

export const fraudAssessmentRequestSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  memberId: z.string().uuid('Invalid member ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  amount: z.number().positive('Amount must be positive'),
  procedureCode: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const fraudAssessmentResponseSchema = z.object({
  claimId: z.string(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  flags: z.array(z.string()),
  recommendations: z.array(z.string()),
  timestamp: z.string().datetime(),
});

export const fraudHistorySchema = z.object({
  assessmentId: z.string(),
  claimId: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.string().datetime(),
  assessedBy: z.string(),
});

export type FraudAssessmentRequest = z.infer<typeof fraudAssessmentRequestSchema>;
export type FraudAssessmentResponse = z.infer<typeof fraudAssessmentResponseSchema>;
```

### Step 5: Add Error Handling and Logging

**File**: `services/api-gateway/src/middleware/fraudErrorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export interface FraudError extends Error {
  statusCode?: number;
  riskLevel?: string;
}

export const fraudErrorHandler = (
  error: FraudError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error.statusCode || 500;
  
  console.error('[FRAUD ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: error.message,
    statusCode,
  });

  res.status(statusCode).json({
    error: 'Fraud assessment failed',
    message: error.message,
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
  });
};
```

### Step 6: Add Middleware Authentication

Update your auth middleware to include fraud endpoints:

**File**: `services/api-gateway/src/middleware/auth.ts`

```typescript
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions for fraud assessment',
        requiredRoles: roles,
      });
    }
    
    next();
  };
};
```

## API Endpoint Examples

### Request Example

```bash
curl -X POST http://localhost:3001/api/fraud/assess \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "claimId": "550e8400-e29b-41d4-a716-446655440000",
    "memberId": "550e8400-e29b-41d4-a716-446655440001",
    "providerId": "550e8400-e29b-41d4-a716-446655440002",
    "amount": 5000,
    "procedureCode": "99213",
    "timestamp": "2026-04-20T10:30:00Z"
  }'
```

### Response Example

```json
{
  "claimId": "550e8400-e29b-41d4-a716-446655440000",
  "riskScore": 65,
  "riskLevel": "high",
  "flags": [
    "provider_high_claim_rate",
    "member_frequent_claims",
    "amount_above_average"
  ],
  "recommendations": [
    "Review with provider",
    "Request additional documentation",
    "Consider peer review"
  ],
  "assessedBy": "fraud-detection-service",
  "assessedAt": "2026-04-20T10:30:15Z",
  "timestamp": "2026-04-20T10:30:00Z"
}
```

## Testing

### Unit Test Example

**File**: `services/api-gateway/tests/routes/fraud.test.ts`

```typescript
import request from 'supertest';
import express from 'express';
import fraudRoutes from '../../src/routes/fraud';

describe('Fraud Detection Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/fraud', fraudRoutes);
  });

  describe('POST /api/fraud/assess', () => {
    it('should assess fraud risk for valid claim', async () => {
      const response = await request(app)
        .post('/api/fraud/assess')
        .send({
          claimId: '550e8400-e29b-41d4-a716-446655440000',
          memberId: '550e8400-e29b-41d4-a716-446655440001',
          providerId: '550e8400-e29b-41d4-a716-446655440002',
          amount: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('riskLevel');
      expect(['low', 'medium', 'high', 'critical']).toContain(response.body.riskLevel);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/fraud/assess')
        .send({ claimId: '550e8400-e29b-41d4-a716-446655440000' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

## Deployment Checklist

- [ ] Fraud service is running on port 3011
- [ ] FRAUD_SERVICE_URL environment variable is set in API Gateway
- [ ] Authentication middleware properly validates user roles
- [ ] Request/response schemas are imported and validated
- [ ] Error handling middleware is registered
- [ ] Audit logging is configured
- [ ] Unit tests pass
- [ ] Integration tests pass with fraud service
- [ ] Documentation is updated in API reference

## Monitoring & Alerts

Configure monitoring for:

1. **Response Time**: Alert if fraud assessment > 5 seconds
2. **Error Rate**: Alert if error rate > 5%
3. **Service Availability**: Alert if fraud service is down
4. **Risk Score Distribution**: Monitor high-risk flag frequency

## Next Steps

After implementation:

1. Test with sample claims
2. Verify fraud service integration
3. Add prometheus metrics
4. Create user documentation
5. Train staff on fraud assessment workflow
