# Hospital Service - Provider & Appointment Management

The Hospital Service manages healthcare providers, facilities, appointments, and medical provider verification for the Medical Coverage System.

## Features

- **Hospital & Clinic Management** - Register and manage healthcare facilities
- **Doctor & Provider Profiles** - Complete provider credentialing and verification
- **Appointment Scheduling** - Online appointment booking and management
- **Provider Verification** - Automated license and credential verification
- **Facility Network Management** - In-network and out-of-network tracking
- **Availability Management** - Doctor schedule and availability tracking
- **Referral Management** - Patient referral workflow system
- **Department Management** - Hospital department organization
- **Medical Procedure Catalog** - Standardized procedure and service listings

## API Endpoints

### Hospitals
- `GET /api/hospitals` - List all hospitals with filtering
- `GET /api/hospitals/:id` - Get hospital details
- `POST /api/hospitals` - Register new hospital
- `PUT /api/hospitals/:id` - Update hospital information

### Providers
- `GET /api/providers` - List healthcare providers
- `GET /api/providers/:id` - Get provider profile
- `POST /api/providers/:id/verify` - Trigger provider verification
- `GET /api/providers/:id/schedule` - Get provider availability

### Appointments
- `POST /api/appointments` - Book new appointment
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/appointments/patient/:patientId` - List patient appointments

### System
- `GET /health` - Service health check

## Environment Variables

### Required
- `HOSPITAL_DB_URL` - PostgreSQL database connection string
- `PROVIDER_VERIFICATION_API_KEY` - Medical license verification service API key

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 3006)
- `REDIS_URL` - Redis connection for caching
- `LOG_LEVEL` - Logging level (info/debug/warn/error)
- `GOOGLE_MAPS_API_KEY` - Geocoding and distance calculation

## Architecture

### Layer Structure
```
src/
├── api/
│   └── appointmentsController.ts
├── services/
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

- Integrates with Claims Service for pre-authorization checks
- Integrates with Insurance Service for network eligibility verification
- Publishes appointment events to message queue
- Provides provider lookup services for all system components