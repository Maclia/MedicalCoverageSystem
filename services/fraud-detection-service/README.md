# Fraud Detection Service

## Purpose
Real-time fraud detection, pattern analysis, and risk assessment for all system transactions. Uses machine learning and rule-based detection to identify suspicious activities.

## Responsibilities
- Real-time transaction monitoring
- Pattern recognition and anomaly detection
- Risk scoring and assessment
- Fraud investigation case management
- Alert generation and notification
- Machine learning model training and execution

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/fraud/assess` | Assess transaction fraud risk |
| GET | `/api/fraud/alerts` | Get active fraud alerts |
| POST | `/api/fraud/investigate` | Create fraud investigation case |
| GET | `/api/fraud/risk/:memberId` | Get member risk profile |
| GET | `/api/health` | Service health check |

## Environment Variables
```
PORT=3009
DATABASE_URL=
REDIS_URL=
ML_MODEL_PATH=
LOG_LEVEL=info
THRESHOLD_RISK_SCORE=75
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
✅ Authentication middleware configured