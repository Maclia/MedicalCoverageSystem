# Claims Service

A microservice for processing insurance claims in the Medical Coverage System.

## Overview

The Claims Service is responsible for handling all aspects of insurance claim processing, including claim submission, validation, status tracking, and integration with other services in the Medical Coverage System.

## Features

- **Claim Submission**: Process new insurance claims with comprehensive validation
- **Claim Management**: Track claim status throughout the lifecycle
- **Fraud Detection**: Integration with fraud detection service
- **Payment Processing**: Integration with payment service for claim settlements
- **Dispute Management**: Handle claim disputes and appeals
- **Analytics**: Generate claim statistics and reports
- **Audit Trail**: Maintain complete audit logs for compliance

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod schemas
- **Logging**: Winston
- **Testing**: Jest, Supertest
- **Containerization**: Docker
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL 14+
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd services/claims-service
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env with your database configuration
```

4. Start the service:
```bash
npm run dev
```

## API Documentation

See [API Documentation](docs/api.md) for complete API reference.

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run lint         # Check code style
npm run lint:fix     # Auto-fix linting issues

# Database
npx drizzle-kit generate  # Generate migrations
npx drizzle-kit migrate   # Run migrations
```

### Development Tools

- **VS Code Integration**: Auto-format on save, ESLint integration
- **Docker Support**: Development and production configurations
- **Monitoring**: Health checks, structured logging
- **Testing**: Comprehensive test suite with coverage

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Service port | 3005 |
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL connection string | postgresql://localhost:5432/medical_coverage |
| JWT_SECRET | JWT secret key | required |
| LOG_LEVEL | Logging level | info |

### Database Configuration

The service uses PostgreSQL with the following default settings:

- Host: localhost
- Port: 5432
- Database: medical_coverage
- User: postgres
- Password: (empty)

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest tests/claims.test.ts
```

### Test Database

The service uses a separate test database configuration. Ensure you have a test database set up in your .env file.

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t claims-service .

# Run Docker container
docker run -p 3005:3005 claims-service
```

### Production Deployment

1. Build the project: `npm run build`
2. Set up environment variables
3. Start the service: `npm start`
4. Configure reverse proxy (e.g., Nginx)
5. Set up monitoring and logging

## Monitoring

### Health Check

The service provides a health check endpoint:

```
GET /health
```

Returns service status, version, and database connectivity information.

### Metrics

The service includes basic metrics collection:
- Response times
- Error rates
- Database connection status
- Memory usage

## Security

### Authentication

- JWT-based authentication
- Role-based access control
- Secure token validation

### Data Protection

- Input validation with Zod schemas
- SQL injection prevention
- XSS protection
- Rate limiting

### Security Headers

- Helmet security headers
- CORS configuration
- Content Security Policy

## Backup and Recovery

### Backup Procedures

```bash
# Create backup
./backup.sh

# Restore from backup
./restore.sh
```

### Disaster Recovery

- Regular database backups
- Configuration backups
- Automated recovery procedures
- Monitoring and alerting

## Performance

### Optimization

- Database query optimization
- Caching strategies
- Connection pooling
- Resource monitoring

### Scaling

- Horizontal scaling support
- Load balancing configuration
- Database connection management
- Memory optimization

## Integration

### Other Services

The Claims Service integrates with:

- **Authentication Service**: User authentication and authorization
- **Database Service**: PostgreSQL for data persistence
- **Fraud Detection Service**: Fraud risk assessment
- **Payment Service**: Claim settlement processing
- **Notification Service**: Claim status notifications
- **Audit Service**: Audit trail management

### API Endpoints

See [API Documentation](docs/api.md) for complete endpoint reference.

## Troubleshooting

### Common Issues

See [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues and solutions.

### Support

For support and questions, please refer to the documentation or contact the development team.

## Contributing

### Development Guidelines

- Follow established code patterns
- Write comprehensive tests
- Update documentation
- Use meaningful commit messages

### Code Quality

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive test coverage

## License

This project is licensed under the MIT License.

## Version History

See [Release Notes](RELEASE_NOTES.md) for version history and changelog.

## Contact

For questions and support, please contact the development team.

## Related Services

- [Authentication Service](https://github.com/MedicalCoverageSystem/auth-service)
- [Database Service](https://github.com/MedicalCoverageSystem/database-service)
- [Payment Service](https://github.com/MedicalCoverageSystem/payment-service)
- [Fraud Detection Service](https://github.com/MedicalCoverageSystem/fraud-detection-service)