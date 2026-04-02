# Medical Coverage System API Quick Reference

## Base URL
```
https://api.medical-coverage.com
http://localhost:5000 (development)
```

## Authentication
```bash
Authorization: Bearer <jwt_token>
```

## API Gateway Endpoints

### Gateway Management
```http
GET  /health                    # Gateway health check
GET  /services                  # Service status overview
GET  /docs                      # API documentation summary
GET  /api-docs                  # Swagger UI documentation
GET  /swagger.json              # OpenAPI specification
```

## Service-Specific Endpoints

### Authentication & Core
```http
POST /api/auth/register          # Register new user
POST /api/auth/login             # User login
POST /api/auth/refresh           # Refresh access token
POST /api/auth/logout            # User logout
GET  /api/core/profile           # Get user profile
PUT  /api/core/profile           # Update user profile
GET  /api/core/members           # List members
POST /api/core/members           # Create member
GET  /api/core/members/{id}      # Get member details
PUT  /api/core/members/{id}      # Update member
GET  /api/core/companies         # List companies
POST /api/core/companies         # Create company
GET  /api/core/cards             # List member cards
POST /api/core/cards             # Issue member card
```

### Insurance Management
```http
GET  /api/insurance/schemes                    # List schemes
POST /api/insurance/schemes                    # Create scheme
GET  /api/insurance/schemes/{id}               # Get scheme details
PUT  /api/insurance/schemes/{id}               # Update scheme
DEL  /api/insurance/schemes/{id}               # Delete scheme
POST /api/insurance/schemes/{id}/benefits      # Add benefit to scheme

GET  /api/schemes                              # List schemes (alternative)
GET  /api/benefits                             # List benefits
POST /api/benefits                             # Create benefit
GET  /api/benefits/{id}                        # Get benefit details
PUT  /api/benefits/{id}                        # Update benefit
DEL  /api/benefits/{id}                        # Delete benefit
GET  /api/benefits/categories                  # Get benefit categories
GET  /api/coverage/verify/{memberId}           # Verify member coverage
```

### Hospital Operations
```http
GET  /api/hospital/patients                    # List patients
POST /api/hospital/patients                    # Register patient
GET  /api/hospital/patients/{id}               # Get patient details
PUT  /api/hospital/patients/{id}               # Update patient
DEL  /api/hospital/patients/{id}               # Delete patient

GET  /api/patients                             # List patients (alternative)
GET  /api/appointments                         # List appointments
POST /api/appointments                         # Schedule appointment
GET  /api/appointments/{id}                    # Get appointment details
PUT  /api/appointments/{id}                    # Update appointment
DEL  /api/appointments/{id}                    # Cancel appointment

GET  /api/medical-records                      # List medical records
POST /api/medical-records                      # Create medical record
GET  /api/medical-records/{id}                 # Get medical record
GET  /api/personnel                            # List hospital personnel
POST /api/personnel                            # Add personnel
```
POST /api/hospital/appointments                # Schedule appointment
PUT  /api/hospital/appointments/{id}           # Update appointment

GET  /api/hospital/medical-records             # Get medical records
POST /api/hospital/medical-records             # Add medical record

GET  /api/hospital/personnel                   # List hospital personnel
GET  /api/hospital/personnel/{id}              # Get personnel details
```

### Billing & Payments
```http
GET  /api/billing/invoices                     # List invoices
POST /api/billing/invoices                     # Create invoice
GET  /api/billing/invoices/{id}                # Get invoice details
PUT  /api/billing/invoices/{id}/status         # Update invoice status

GET  /api/invoices                             # List invoices (alternative)
GET  /api/accounts-receivable                  # Accounts receivable
GET  /api/tariffs                              # List service tariffs
PUT  /api/tariffs/{id}                         # Update tariff
```

### Claims Processing
```http
GET  /api/claims                               # List claims
POST /api/claims                               # Submit claim
GET  /api/claims/{id}                          # Get claim details
PUT  /api/claims/{id}/status                   # Update claim status

GET  /api/disputes                             # List disputes
POST /api/disputes                             # Create dispute
PUT  /api/disputes/{id}/resolve                # Resolve dispute
GET  /api/reconciliation                       # Reconciliation report
```

### Finance & Payments
```http
GET  /api/finance/payments                     # List payments
POST /api/finance/payments                     # Process payment
GET  /api/finance/payments/{id}                # Get payment status
POST /api/finance/refunds                      # Process refund
GET  /api/finance/ledger                       # General ledger
GET  /api/payments                             # List payments (alternative)
GET  /api/ledger                               # Ledger entries (alternative)
```

### CRM & Sales
```http
GET  /api/crm/leads                            # List leads
POST /api/crm/leads                            # Create lead
GET  /api/crm/leads/{id}                       # Get lead details
PUT  /api/crm/leads/{id}                       # Update lead
POST /api/crm/leads/{id}/convert               # Convert lead to opportunity

GET  /api/crm/agents                           # List agents
POST /api/crm/agents                           # Create agent
GET  /api/crm/agents/{id}                      # Get agent details
GET  /api/crm/agents/{id}/performance          # Agent performance

GET  /api/crm/commissions                      # List commissions
POST /api/crm/commissions                      # Create commission
GET  /api/crm/commissions/{id}                 # Get commission details

GET  /api/leads                                # List leads (alternative)
GET  /api/agents                               # List agents (alternative)
GET  /api/commissions                          # List commissions (alternative)
```

### Membership Management
```http
GET  /api/membership/members                   # List members
POST /api/membership/members                   # Register member
GET  /api/membership/members/{id}              # Get member details
PUT  /api/membership/members/{id}              # Update member

GET  /api/membership/enrollments               # List enrollments
POST /api/membership/enrollments               # Process enrollment
GET  /api/membership/enrollments/{id}          # Get enrollment details
PUT  /api/membership/enrollments/{id}          # Update enrollment

GET  /api/membership/renewals                  # List renewals
POST /api/membership/renewals                  # Process renewal
GET  /api/membership/renewals/{id}             # Get renewal details

GET  /api/enrollments                          # List enrollments (alternative)
GET  /api/renewals                             # List renewals (alternative)
```

### Wellness Programs
```http
GET  /api/wellness/programs                    # List programs
POST /api/wellness/programs                    # Create program
GET  /api/wellness/programs/{id}               # Get program details
PUT  /api/wellness/programs/{id}               # Update program

GET  /api/wellness/activities                  # List activities
POST /api/wellness/activities                  # Log activity
GET  /api/wellness/activities/{id}             # Get activity details

GET  /api/wellness/incentives                  # List incentives
POST /api/wellness/incentives                  # Create incentive
GET  /api/wellness/incentives/{id}             # Get incentive details

GET  /api/programs                             # List programs (alternative)
GET  /api/activities                           # List activities (alternative)
GET  /api/incentives                           # List incentives (alternative)
```

### Administration
```http
GET  /api/admin/health                         # System health dashboard
GET  /api/admin/metrics                        # System metrics
GET  /api/admin/logs                           # System logs
GET  /api/admin/services                       # Service management
POST /api/admin/services/{id}/restart          # Restart service
```
POST /api/wellness/programs                    # Create program
GET  /api/wellness/programs/{id}               # Get program details

GET  /api/wellness/activities                  # List activities
POST /api/wellness/activities                  # Log activity
```

## Gateway Endpoints
```http
GET  /health                                   # Health check
GET  /services                                 # Service status
GET  /docs                                     # API documentation
GET  /api/admin/services/health                # Admin service health
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "correlationId": "request-id",
  "meta": {
    "pagination": { "page": 1, "limit": 10, "total": 100 },
    "timestamp": "2025-12-21T10:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { ... },
    "correlationId": "request-id"
  }
}
```

## Common Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term
- `status`: Filter by status
- `sort`: Sort field
- `order`: Sort order (asc/desc)

## Rate Limits
- Standard: 100 requests/minute
- Auth routes: 10 requests/minute
- User routes: 1000 requests/minute

## Error Codes
- `VALIDATION_ERROR`: Invalid request data
- `AUTHENTICATION_ERROR`: Invalid credentials
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: Service down

---

*Quick Reference - See [Full API Documentation](./API_DOCUMENTATION.md) for details*</content>
<parameter name="filePath">\\wsl.localhost\Ubuntu\home\mac\MedicalCoverageSystem\docs\API_QUICK_REFERENCE.md