# Insurance Service

The Insurance Service manages insurance schemes, benefits, and coverage verification for the Medical Coverage System.

## Features

- **Scheme Management** - Create and manage insurance schemes
- **Benefit Administration** - Configure benefits and coverage rules
- **Coverage Verification** - Real-time eligibility and benefit checks
- **Business Rules Enforcement** - Age limits, waiting periods, coverage limits
- **Flexible Configuration** - Custom rules and premium calculation methods

## API Endpoints

### Schemes Management
- `GET /schemes` - List schemes with filtering and pagination
- `POST /schemes` - Create new insurance scheme
- `GET /schemes/:id` - Get scheme details
- `PUT /schemes/:id` - Update scheme
- `DELETE /schemes/:id` - Delete scheme
- `POST /schemes/:id/benefits` - Add benefit to scheme
- `DELETE /schemes/:id/benefits/:benefitId` - Remove benefit from scheme

### Benefits Management
- `GET /benefits` - List benefits with filtering
- `GET /benefits/categories` - Get benefit categories
- `GET /benefits/popular` - Get most used benefits
- `POST /benefits` - Create new benefit
- `GET /benefits/:id` - Get benefit details
- `PUT /benefits/:id` - Update benefit
- `DELETE /benefits/:id` - Delete benefit

### Coverage Verification
- `GET /coverage/verify/:memberId` - Verify coverage for specific service
- `GET /coverage/summary/:memberId` - Get member's complete coverage summary

### System
- `GET /health` - Service health check
- `GET /docs` - API documentation

## Business Logic

### Schemes
- **Age-Based Coverage**: Min/max age requirements for scheme eligibility
- **Scheme Types**: Individual, family, corporate, government plans
- **Coverage Types**: Medical, dental, vision, comprehensive plans
- **Duration Management**: Start/end dates, renewal periods
- **Premium Calculation**: Multiple calculation methods supported

### Benefits
- **Categories**: Medical, dental, vision, wellness, hospital, prescription, emergency, maternity, specialist, other
- **Coverage Rules**: Limits, waiting periods, copayments, deductibles
- **Preauthorization**: Requirements based on service type and cost
- **Documentation**: Required documents for claim submission

### Coverage Verification
- **Real-time Eligibility**: Check member's active scheme
- **Benefit Validation**: Verify specific benefit coverage
- **Limit Checking**: Annual and per-incident limits
- **Cost Calculation**: Patient responsibility vs plan payment
- **Preauthorization Status**: Check if prior approval is required

## Configuration

### Environment Variables

#### Required
- `INSURANCE_DB_URL` - PostgreSQL database connection string
- `REDIS_URL` - Redis connection for caching

#### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port (default: 3002)
- `CORE_SERVICE_URL` - Core service URL

#### Business Rules
- `MAX_BENEFIT_LIMIT` - Maximum benefit coverage amount
- `DEFAULT_SCHEME_DURATION` - Default scheme duration in days
- `PREMIUM_GRACE_PERIOD` - Premium payment grace period
- `MIN_AGE_FOR_ADULT` - Minimum age for adult classification
- `MAX_AGE_FOR_DEPENDENT` - Maximum age for dependent coverage

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
docker build -t medical-insurance-service .

# Run container
docker run -p 3002:3002 --env-file .env medical-insurance-service
```

## Database Schema

The service owns the following tables:
- `schemes` - Insurance scheme definitions
- `scheme_benefits` - Scheme-benefit relationships
- `benefits` - Benefit definitions and rules
- `premium_rates` - Premium calculation tables

### Key Tables

#### Schemes
```sql
CREATE TABLE schemes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  company_id INTEGER NOT NULL,
  scheme_type VARCHAR(50) NOT NULL,
  coverage_type VARCHAR(50) NOT NULL,
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  premium_calculation_method VARCHAR(50),
  custom_rules JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Benefits
```sql
CREATE TABLE benefits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL,
  coverage_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  standard_limit DECIMAL(15,2),
  standard_waiting_period INTEGER,
  standard_copayment DECIMAL(5,2),
  standard_deductible DECIMAL(15,2),
  coverage_percentage INTEGER,
  requires_preauthorization BOOLEAN DEFAULT false,
  documentation_required TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Integration Points

### Core Service
- **User Authentication**: Validate user tokens
- **Company Information**: Verify company existence for schemes

### Hospital Service
- **Coverage Verification**: Pre-service eligibility checks
- **Benefit Validation**: Service coverage confirmation

### Claims Service
- **Scheme Information**: Provide scheme details for claims processing
- **Benefit Rules**: Apply benefit coverage rules to claims

### Billing Service
- **Premium Calculation**: Support for billing premium calculations
- **Coverage Limits**: Enforce coverage limits for billing

## Security Considerations

### Data Protection
- **PII Handling**: Mask sensitive member information in logs
- **Audit Logging**: Complete audit trail for all scheme and benefit changes
- **Access Control**: Role-based access for scheme management

### Business Rule Enforcement
- **Age Validation**: Strict enforcement of age-based eligibility
- **Duplicate Prevention**: Prevent duplicate scheme names and benefit configurations
- **Dependency Management**: Prevent deletion of schemes/benefits with active usage

## Performance Optimization

### Caching Strategy
- **Benefit Definitions**: Cache frequently accessed benefits (30 minutes)
- **Scheme Information**: Cache scheme details (1 hour)
- **Premium Rates**: Cache rate tables (2 hours)
- **Coverage Rules**: Cache eligibility rules (15 minutes)

### Database Optimization
- **Indexed Queries**: Proper indexing on scheme_id, benefit_id, company_id
- **Connection Pooling**: Optimize database connections
- **Query Optimization**: Efficient queries for large datasets

## Monitoring

### Health Checks
- **Database Connectivity**: Verify database connection
- **Cache Connectivity**: Check Redis connection
- **Service Dependencies**: Monitor downstream service availability

### Metrics
- **Response Times**: Track API response times
- **Error Rates**: Monitor error rates by endpoint
- **Usage Patterns**: Track scheme and benefit usage statistics
- **Business Metrics**: Coverage verification success rates

## Troubleshooting

### Common Issues
1. **Database Connection** - Check INSURANCE_DB_URL configuration
2. **Cache Issues** - Verify Redis connectivity
3. **Validation Errors** - Check request payload format
4. **Business Rule Violations** - Review scheme and benefit constraints

### Debug Mode
Set `LOG_LEVEL=debug` for detailed logging of business rule enforcement.

### Performance Issues
- Check database query performance
- Verify cache hit rates
- Monitor memory usage for large result sets

## Compliance

### Healthcare Standards
- **Benefit Coverage**: Proper documentation of covered services
- **Eligibility Rules**: Clear age and condition requirements
- **Preauthorization**: Proper tracking of required approvals
- **Limit Management**: Accurate tracking of annual and per-incident limits

### Data Retention
- **Scheme History**: Maintain historical scheme information
- **Benefit Changes**: Track benefit rule changes over time
- **Coverage Records**: Store coverage verification results
- **Audit Logs**: Complete audit trail for compliance

## API Documentation

The service provides comprehensive API documentation at `/docs` with:
- Endpoint descriptions
- Request/response examples
- Validation rules
- Error code reference
- Business rule explanations