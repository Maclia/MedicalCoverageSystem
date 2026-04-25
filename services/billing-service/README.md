# Billing Service - Payment Processing & Invoicing

The Billing Service manages all financial transactions, payment processing, invoicing, and commission calculations for the Medical Coverage System.

## Features

- **Payment Processing** - Credit card, bank transfer, and mobile money payments
- **Invoice Generation & Management** - Automated invoice creation and tracking
- **Token Billing System** - Usage-based billing for API and service consumption
- **Commission Calculation** - Automated broker and agent commission calculations
- **Transaction History** - Complete audit trail of all financial operations
- **Reconciliation Engine** - Automatic payment matching and reconciliation
- **Refund Processing** - Standardized refund workflows
- **Payment Reminders** - Automated notifications for pending payments
- **Dunning Management** - Collection workflow for overdue accounts

## API Endpoints

### Payments
- `POST /api/payments` - Process new payment
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments` - List payments with filters
- `POST /api/payments/:id/refund` - Process payment refund

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices/:id/send` - Send invoice to customer
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Token Billing
- `POST /api/token-billing/consume` - Record token consumption
- `GET /api/token-billing/balance/:accountId` - Get account token balance
- `POST /api/token-billing/recharge` - Recharge token balance

### System
- `GET /health` - Service health check
- `GET /health/detailed` - Detailed health status including payment gateway connectivity

## Environment Variables

### Required
- `BILLING_DB_URL` - PostgreSQL database connection string
- `PAYMENT_GATEWAY_API_KEY` - Payment processor API key
- `BILLING_ENCRYPTION_KEY` - Encryption key for sensitive payment data (32 characters)

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 3003)
- `REDIS_URL` - Redis connection for caching
- `LOG_LEVEL` - Logging level (info/debug/warn/error)
- `WEBHOOK_SECRET` - Payment gateway webhook verification secret

## Architecture

### Layer Structure
```
src/
├── api/
│   ├── paymentsController.ts
│   ├── invoicesController.ts
│   └── tokenBillingController.ts
├── services/
│   ├── PaymentService.ts
│   ├── InvoiceService.ts
│   ├── CommissionService.ts
│   └── TokenBillingService.ts
├── config/
├── models/
├── middleware/
├── utils/
└── types/
```

### Dependencies
- **Express.js** - Web framework
- **Drizzle ORM** - Database access
- **PostgreSQL** - Primary database
- **Redis** - Caching and rate limiting
- **Stripe/Payment Processor** - Payment gateway integration
- **Winston** - Structured logging

## Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Security

- All payment card data is tokenized (never stored raw)
- PCI DSS compliant processing workflows
- End-to-end encryption for financial data
- Rate limiting on payment endpoints
- Complete audit logging for all financial operations
- Dual authorization for refund processing above threshold

## Integration

- Integrates with Finance Service for ledger entries
- Publishes payment events to message queue
- Consumes policy and membership events from other services
- Provides webhooks for real-time payment status updates