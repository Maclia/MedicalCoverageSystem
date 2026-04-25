# Wellness Service - Health & Wellness Programs

The Wellness Service manages preventive care programs, health assessments, wellness benefits, and member health tracking for the Medical Coverage System.

## Features

- **Wellness Program Management** - Health and wellness program administration
- **Health Risk Assessments** - Online health evaluation questionnaires
- **Preventive Care Tracking** - Screening and checkup reminders
- **Activity Tracking Integration** - Fitness device and app integration
- **Reward Program** - Healthy behavior incentives and rewards
- **Health Coaching** - Virtual wellness coaching scheduling
- **Vaccination Tracking** - Immunization records and reminders
- **Wellness Challenges** - Member engagement challenges and campaigns
- **Health Education Content** - Educational resources and articles

## API Endpoints

### Programs
- `GET /api/programs` - List available wellness programs
- `GET /api/programs/:id` - Get program details
- `POST /api/programs/:id/enroll` - Enroll member in program
- `GET /api/programs/member/:memberId` - Get member enrolled programs

### Assessments
- `GET /api/assessments` - List health assessments
- `POST /api/assessments/submit` - Submit assessment responses
- `GET /api/assessments/results/:memberId` - Get assessment results

### Activities
- `POST /api/activities/log` - Log wellness activity
- `GET /api/activities/member/:memberId` - Get member activity history
- `GET /api/activities/stats/:memberId` - Get wellness statistics

### System
- `GET /health` - Service health check

## Environment Variables

### Required
- `WELLNESS_DB_URL` - PostgreSQL database connection string

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 3008)
- `REDIS_URL` - Redis connection for caching
- `LOG_LEVEL` - Logging level (info/debug/warn/error)
- `FITNESS_API_KEY` - Third-party fitness device integration API key

## Architecture

### Layer Structure
```
src/
├── api/
├── services/
│   └── WellnessService.ts
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
- **Redis** - Caching
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

## Integration

- Integrates with Membership Service for member data
- Publishes wellness achievement events to message queue
- Provides wellness data to Analytics Service for reporting
- Sends reminders and notifications via system communication services