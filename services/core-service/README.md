# Core Service - Authentication & User Management

The Core Service handles authentication, authorization, and user management for the Medical Coverage System. It's the first microservice extracted from the monolithic architecture.

## Features

- **User Registration & Management**
- **JWT-based Authentication**
- **Role-based Access Control**
- **Password Security & Reset**
- **Session Management**
- **Comprehensive Audit Logging**
- **Structured Logging**
- **Rate Limiting**
- **Security Headers**
- **Health Monitoring**

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Authenticate user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `POST /auth/change-password` - Change password

### User Profile
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### System
- `GET /health` - Health check endpoint
- `GET /docs` - API documentation

## Environment Variables

### Required
- `CORE_DB_URL` - PostgreSQL database connection string
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (minimum 32 characters)

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 3001)
- `REDIS_URL` - Redis connection for session storage
- `LOG_LEVEL` - Logging level (info/debug/warn/error)

## Security Features

### Password Security
- Minimum 8 characters with complexity requirements
- bcrypt hashing with configurable salt rounds
- Rate limiting on login attempts
- Account lockout protection

### JWT Security
- Access tokens (15 minutes expiry)
- Refresh tokens (7 days expiry)
- Secret validation on startup
- Token rotation on refresh

### API Security
- CORS configuration
- Security headers (helmet.js)
- Rate limiting headers
- Request correlation IDs
- Input validation

## Audit & Logging

### Structured Logging
- Winston-based logging
- Correlation ID tracking
- Log levels and rotation
- Sensitive data masking

### Audit Trails
- Authentication events
- Data access logging
- Profile modifications
- Security events

## Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Update environment variables
# Edit .env with your configuration

# Run in development
npm run dev
```

### Build & Test
```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Docker
```bash
# Build image
docker build -t medical-core-service .

# Run container
docker run -p 3001:3001 --env-file .env medical-core-service
```

## Deployment

### Docker Compose
The service is designed to be deployed as part of the larger Medical Coverage System using Docker Compose.

### Health Checks
- Endpoint: `/health`
- Returns service status, uptime, and memory usage
- Integrates with container orchestration

### Graceful Shutdown
- Handles SIGTERM/SIGINT signals
- Cleans up expired sessions
- Completes in-flight requests

## Architecture

### Layer Structure
```
src/
├── api/           # Controllers and routes
├── services/      # Business logic
├── data/          # Data access layer
├── models/        # Data models
├── config/        # Configuration
├── utils/         # Utilities (logger, errors, validation)
├── middleware/    # Express middleware
└── tests/         # Test files
```

### Dependencies
- **Express.js** - Web framework
- **Drizzle ORM** - Database access
- **PostgreSQL** - Primary database
- **Redis** - Session storage
- **Winston** - Structured logging
- **Joi** - Input validation

## Integration

### Service Communication
The Core Service communicates with other services via REST APIs and message queues for asynchronous operations.

### Database Schema
Owns the following tables:
- `users`
- `user_sessions`
- `audit_logs` (central audit repository)

### Security Model
- JWT tokens for service-to-service authentication
- RBAC for user authorization
- Audit logging for compliance

## Monitoring

### Metrics
- Request/response times
- Authentication success/failure rates
- Error rates and types
- Session lifecycle metrics

### Logging
- Structured JSON logs
- Correlation ID tracing
- Performance metrics
- Security events

## Compliance

### Data Protection
- PII masking in logs
- Secure password storage
- Audit trail maintenance
- Data access controls

### Healthcare Standards
- HIPAA considerations
- Audit requirements
- Data retention policies
- Security controls

## Troubleshooting

### Common Issues
1. **JWT Secret Validation** - Ensure secrets are at least 32 characters
2. **Database Connection** - Check CORE_DB_URL configuration
3. **Session Storage** - Verify Redis connectivity
4. **Rate Limiting** - Monitor authentication attempt patterns

### Debug Mode
Set `LOG_LEVEL=debug` for detailed logging information.

### Health Monitoring
Monitor the `/health` endpoint for service status and performance metrics.