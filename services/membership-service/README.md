# Membership Service - Member Management & Cards

The Membership Service handles member profiles, membership plans, benefit cards, and eligibility verification for the Medical Coverage System.

## Features

- **Member Profile Management** - Complete member demographic and contact information
- **Membership Plan Administration** - Plan creation, upgrades, and downgrades
- **Benefit Card Management** - Digital and physical card generation and lifecycle
- **Eligibility Verification** - Real-time coverage status checks
- **Dependent Management** - Family member and dependent tracking
- **Member Portal Access** - Self-service functionality for members
- **Enrollment Workflows** - New member onboarding and registration
- **Benefit Usage Tracking** - Real-time benefit consumption monitoring
- **Status History** - Complete audit trail of membership status changes

## API Endpoints

### Members
- `GET /api/members` - List all members with filtering
- `GET /api/members/:id` - Get member profile details
- `POST /api/members` - Register new member
- `PUT /api/members/:id` - Update member information

### Cards
- `POST /api/cards/generate` - Generate new benefit card
- `GET /api/cards/member/:memberId` - List member cards
- `POST /api/cards/:id/block` - Block lost/stolen card
- `POST /api/cards/:id/replace` - Request card replacement
- `POST /api/cards/verify` - Verify card validity and eligibility

### Eligibility
- `POST /api/eligibility/check` - Verify member eligibility for services
- `GET /api/eligibility/:memberId/benefits` - Get member available benefits

### System
- `GET /health` - Service health check

## Environment Variables

### Required
- `MEMBERSHIP_DB_URL` - PostgreSQL database connection string
- `CARD_ENCRYPTION_KEY` - Encryption key for card data (32 characters)

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 3007)
- `REDIS_URL` - Redis connection for caching
- `LOG_LEVEL` - Logging level (info/debug/warn/error)
- `CARD_TEMPLATE_SERVICE_URL` - Card generation and printing service URL

## Architecture

### Layer Structure
```
src/
├── api/
├── services/
│   ├── MembershipService.ts
│   ├── CardManagementService.ts
│   └── MemberCardRulesService.ts
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
- **Redis** - Caching and eligibility lookups
- **Winston** - Structured logging
- **QRCode** - Digital card generation

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

- Card data is encrypted at rest using AES-256
- Card numbers are masked in all logs and API responses
- Card verification endpoints have strict rate limiting
- Complete audit trail for all card operations
- Eligibility checks are authenticated and authorized

## Integration

- Integrates with Core Service for authentication
- Integrates with Claims Service for eligibility verification
- Integrates with Insurance Service for plan benefits
- Publishes membership events to message queue
- Provides card verification services to Hospital Service