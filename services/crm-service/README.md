# CRM Service

Customer Relationship Management service for the Medical Coverage System.

## Description

This service manages contacts, companies, leads, opportunities, activities, and marketing campaigns for the medical insurance platform.

## Features

- Contact Management
- Company Profiles
- Lead Tracking & Scoring
- Opportunity Pipeline
- Activity Logging
- Marketing Campaigns
- Analytics & Dashboards
- Bulk Operations

## Folder Structure

```
src/
├── api/             # API controllers (request handlers)
├── config/          # Configuration files
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # Route definitions
├── services/        # Business logic layer
├── types/           # TypeScript type definitions
├── utils/           # Utilities & helpers
├── index.ts         # Entry point
└── server.ts        # Server setup & initialization
```

## Installation

```bash
npm install
```

## Running the service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure the variables:

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 3006 |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:3000 |
| DATABASE_URL | PostgreSQL connection string | |
| LOG_LEVEL | Logging level | info |
| JWT_SECRET | JWT verification secret | |
| API_KEY | Internal API authentication key | |

## API Endpoints

All API endpoints are prefixed with `/api`

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| GET | /api/leads | List leads |
| POST | /api/leads | Create new lead |
| GET | /api/leads/:id | Get lead by ID |
| PUT | /api/leads/:id | Update lead |
| DELETE | /api/leads/:id | Delete lead |
| GET | /api/contacts | List contacts |
| POST | /api/contacts | Create contact |
| GET | /api/contacts/:id | Get contact by ID |
| PUT | /api/contacts/:id | Update contact |
| DELETE | /api/contacts/:id | Delete contact |
| GET | /api/companies | List companies |
| POST | /api/companies | Create company |
| GET | /api/companies/:id | Get company by ID |
| PUT | /api/companies/:id | Update company |
| DELETE | /api/companies/:id | Delete company |
| GET | /api/opportunities | List opportunities |
| POST | /api/opportunities | Create opportunity |
| GET | /api/opportunities/:id | Get opportunity by ID |
| PUT | /api/opportunities/:id | Update opportunity |
| DELETE | /api/opportunities/:id | Delete opportunity |
| GET | /api/activities | List activities |
| POST | /api/activities | Log new activity |
| GET | /api/email-campaigns | List marketing campaigns |
| POST | /api/email-campaigns | Create campaign |
| GET | /api/dashboard | Dashboard summary |
| GET | /api/analytics | Analytics reports |
| POST | /api/bulk/import | Bulk import records |
| POST | /api/bulk/export | Bulk export records |
| POST | /api/export | Data export operations |
| POST | /api/import | Data import operations |

## Middleware

- **Audit Middleware**: Applied globally to all routes - logs all API operations with user context, timestamp, and request details
- **Authentication**: JWT token required for all API endpoints except `/health`
- **Response Standardization**: Standardized JSON response format for all endpoints
- **Rate Limiting**: 100 requests/minute per client

## Database Migrations

```bash
# Run migrations
npm run migrate

# Generate new migration
npm run migrate:generate --name migration-name

# Rollback last migration
npm run migrate:rollback
```

## Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

## Additional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| REDIS_URL | Redis connection string for caching | redis://localhost:6379 |
| RATE_LIMIT_ENABLED | Enable rate limiting | true |
| AUDIT_LOG_ENABLED | Enable audit logging | true |
| MAX_BATCH_SIZE | Maximum records per bulk operation | 1000 |
| EXPORT_MAX_ROWS | Maximum rows for export files | 50000 |

## License

Proprietary - Medical Coverage System