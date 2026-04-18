# Claims Service Development Guide

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL 14+
- Docker (optional)
- Git

## Getting Started

### 1. Clone the Repository
```bash
git clone <repository-url>
cd services/claims-service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your database configuration
```

### 4. Start Development Server
```bash
npm run dev
```

## Project Structure

```
services/claims-service/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   │   └── database.ts    # Database configuration
│   ├── middleware/        # Express middleware
│   │   └── claimValidation.ts
│   ├── models/            # Data models
│   │   └── schema.ts      # Drizzle schema
│   ├── routes/            # API routes
│   │   └── index.ts       # Claims routes
│   ├── services/          # Business logic
│   │   └── ClaimsService.ts
│   ├── utils/             # Utility functions
│   │   └── logger.ts      # Winston logger
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # Extended Request interface
│   ├── start.ts           # Application entry point
│   └── index.ts           # Main application
├── tests/                 # Test files
├── docs/                  # Documentation
├── scripts/               # Development scripts
└── ...
```

## Development Workflow

### 1. Code Changes
- Make changes in `src/` directory
- TypeScript will auto-compile in development mode
- Use VS Code for best development experience

### 2. Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx jest tests/claims.test.ts
```

### 3. Linting
```bash
# Check code style
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### 4. Building
```bash
# Build for production
npm run build

# Check build output
ls dist/
```

### 5. Running
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Database Operations

### 1. Database Connection
- Configuration in `src/config/database.ts`
- Uses PostgreSQL with Drizzle ORM
- Connection settings in .env file

### 2. Database Migrations
```bash
# Generate migration
npx drizzle-kit generate

# Run migration
npx drizzle-kit migrate
```

### 3. Database Schema
- Defined in `src/models/schema.ts`
- Uses Drizzle ORM for type-safe queries
- Supports PostgreSQL features

## API Development

### 1. Adding New Endpoints
1. Create route handler in `src/routes/`
2. Add validation middleware in `src/middleware/`
3. Implement business logic in `src/services/`
4. Update API documentation in `docs/api.md`

### 2. Request Validation
- Uses Zod schemas for validation
- Validation middleware in `src/middleware/claimValidation.ts`
- Automatic error responses for invalid requests

### 3. Error Handling
- Centralized error handling in `src/index.ts`
- Custom error responses
- Proper HTTP status codes

## Testing

### 1. Unit Tests
- Located in `tests/` directory
- Uses Jest testing framework
- Tests individual components

### 2. Integration Tests
- Tests API endpoints
- Uses Supertest for HTTP requests
- Tests database operations

### 3. Test Database
- Separate test database configuration
- Automatic cleanup between tests
- Test data fixtures

## Code Quality

### 1. TypeScript Configuration
- Strict type checking enabled
- Path aliases configured
- Source maps for debugging

### 2. ESLint Configuration
- Prettier integration
- TypeScript-specific rules
- Auto-fix on save in VS Code

### 3. Code Standards
- Consistent code formatting
- Proper error handling
- Comprehensive documentation
- Meaningful commit messages

## Development Tools

### 1. VS Code Integration
- Auto-format on save
- ESLint integration
- Debug configurations
- Task runners

### 2. Docker Support
- Development Docker configuration
- Production Docker configuration
- Docker Compose support

### 3. Monitoring
- Health check endpoint
- Structured logging
- Performance metrics

## Best Practices

### 1. Code Organization
- Keep functions small and focused
- Use meaningful variable names
- Follow consistent code style
- Add comprehensive comments

### 2. Error Handling
- Use try-catch blocks appropriately
- Return proper HTTP status codes
- Provide meaningful error messages
- Log errors appropriately

### 3. Security
- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Sanitize user inputs

### 4. Performance
- Optimize database queries
- Implement proper caching
- Monitor resource usage
- Use efficient algorithms

## Common Development Tasks

### 1. Adding New Database Fields
1. Update Drizzle schema in `src/models/schema.ts`
2. Generate migration with `npx drizzle-kit generate`
3. Run migration with `npx drizzle-kit migrate`
4. Update validation schemas
5. Update API documentation

### 2. Adding New API Endpoints
1. Create route handler in `src/routes/`
2. Add validation middleware
3. Implement business logic
4. Add tests
5. Update documentation

### 3. Debugging
1. Use VS Code debugger
2. Check logs for errors
3. Use console.log for temporary debugging
4. Test with Postman or curl

### 4. Performance Optimization
1. Monitor database queries
2. Check for N+1 query problems
3. Implement proper indexing
4. Use caching where appropriate

## Development Scripts

### 1. Available Scripts
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

### 2. Custom Scripts
```bash
# Run security audit
npm run security-audit

# Run performance tests
npm run performance-test

# Check code quality
npm run code-quality
```

## Integration with Other Services

### 1. Service Communication
- Use HTTP clients for external services
- Implement proper error handling
- Add retry logic for failed requests
- Monitor external service availability

### 2. Data Synchronization
- Use database transactions
- Implement proper error handling
- Add data validation
- Monitor data consistency

## Deployment

### 1. Local Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 2. Docker Deployment
```bash
# Build Docker image
docker build -t claims-service .

# Run Docker container
docker run -p 3005:3005 claims-service
```

### 3. Production Deployment
- Use CI/CD pipeline
- Implement proper monitoring
- Set up proper logging
- Configure environment variables

## Troubleshooting

### 1. Common Issues
- Check logs for error messages
- Verify database connectivity
- Ensure all dependencies are installed
- Check environment variables

### 2. Debugging Steps
1. Check service status
2. Review logs for errors
3. Verify configuration
4. Test database connectivity
5. Check network connectivity
6. Verify dependencies
7. Test endpoints individually
8. Check resource usage

### 3. Performance Issues
1. Monitor database queries
2. Check for memory leaks
3. Optimize code performance
4. Scale resources as needed

## Contributing

### 1. Before Contributing
- Read the code style guide
- Set up development environment
- Run existing tests
- Understand the project structure

### 2. Making Changes
1. Create feature branch
2. Make changes following code standards
3. Add tests for new functionality
4. Run linting and tests
5. Update documentation
6. Create pull request

### 3. Code Review
- Follow established patterns
- Ensure proper error handling
- Add comprehensive tests
- Update documentation
- Check performance implications

## Resources

### 1. Documentation
- API documentation in `docs/api.md`
- Development guide in `DEVELOPMENT.md`
- Troubleshooting guide in `TROUBLESHOOTING.md`

### 2. Tools
- VS Code for development
- Docker for containerization
- PostgreSQL for database
- Jest for testing

### 3. References
- Drizzle ORM documentation
- Express.js documentation
- TypeScript documentation
- PostgreSQL documentation