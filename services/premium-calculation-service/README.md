# Premium Calculation Service

Responsible for all insurance premium calculations, rating engine, and pricing rules evaluation.

## Overview
This microservice handles dynamic premium calculation for member insurance coverage. Implements business rules, risk assessment formulas, and premium adjustments for all scheme types in the system.

## Responsibilities
- ✅ Base premium calculation per member profile
- ✅ Risk factor adjustment and weighting
- ✅ Scheme tier pricing calculation
- ✅ Dependent coverage premium calculation
- ✅ Geographic region pricing adjustments
- ✅ Age and demographic factors
- ✅ Discounts and promotions application
- ✅ Premium validation and auditing

## Service Details
| Attribute | Value |
|-----------|-------|
| **Port** | 8012 |
| **Database** | PostgreSQL |
| **Dependencies** | Insurance Service, Core Service |
| **Message Queue Events** | premium.calculation.completed |

## API Endpoints

### Premium Calculation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/calculate` | Calculate premium for member profile |
| `POST` | `/api/v1/calculate/bulk` | Bulk premium calculation |
| `GET` | `/api/v1/rules` | Get active calculation rules |
| `GET` | `/api/v1/quote/:quoteId` | Get existing premium quote |
| `POST` | `/api/v1/validate` | Validate premium calculation |
| `GET` | `/health` | Service health check |

## Environment Variables
```env
PORT=8012
DATABASE_URL=postgresql://user:pass@localhost:5432/premium_calculation
REDIS_URL=redis://localhost:6379
CORE_SERVICE_URL=http://localhost:8001/api
INSURANCE_SERVICE_URL=http://localhost:8004/api
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
JWT_SECRET=
LOG_LEVEL=info
```

## Getting Started

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Build
npm run build
```

### Docker
```bash
docker build -t premium-calculation-service .
docker run -p 8012:8012 premium-calculation-service
```

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design, calculation flows, and business rules implementation details.

## Integration
This service is consumed by:
- Billing Service (for invoice generation)
- Insurance Service (for policy creation)
- CRM Service (for quote generation)
- Client Frontend (for premium calculator widget)

## Performance Specifications
- Average calculation time: < 50ms
- Supports 5000+ concurrent calculations
- 99.99% calculation accuracy
- All calculations are auditable and reproducible

## Health Check
```bash
curl http://localhost:8012/health
```

## Standard Compliance
✅ Follows standard service architecture
✅ Implements standard middleware stack
✅ Audit logging enabled
✅ Rate limiting implemented
✅ Standard error handling
✅ JWT authentication required