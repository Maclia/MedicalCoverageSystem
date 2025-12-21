# Medical Coverage System API Quick Reference

## Base URL
```
https://api.medical-coverage.com
```

## Authentication
```bash
Authorization: Bearer <jwt_token>
```

## Common Endpoints

### Authentication
```http
POST /api/auth/register          # Register new user
POST /api/auth/login             # User login
POST /api/auth/refresh           # Refresh access token
POST /api/auth/logout            # User logout
GET  /api/core/profile           # Get user profile
PUT  /api/core/profile           # Update user profile
```

### Insurance Management
```http
GET  /api/insurance/schemes                    # List schemes
POST /api/insurance/schemes                    # Create scheme
GET  /api/insurance/schemes/{id}               # Get scheme details
PUT  /api/insurance/schemes/{id}               # Update scheme
DEL  /api/insurance/schemes/{id}               # Delete scheme
POST /api/insurance/schemes/{id}/benefits      # Add benefit to scheme

GET  /api/insurance/benefits                   # List benefits
POST /api/insurance/benefits                   # Create benefit
GET  /api/insurance/benefits/{id}              # Get benefit details
PUT  /api/insurance/benefits/{id}              # Update benefit
DEL  /api/insurance/benefits/{id}              # Delete benefit
GET  /api/insurance/benefits/categories        # Get benefit categories

GET  /api/insurance/coverage/verify/{memberId} # Verify member coverage
```

### Hospital Operations
```http
GET  /api/hospital/patients                    # List patients
POST /api/hospital/patients                    # Register patient
GET  /api/hospital/patients/{id}               # Get patient details

GET  /api/hospital/appointments                # List appointments
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

GET  /api/billing/accounts-receivable/summary  # AR summary
GET  /api/billing/accounts-receivable/outstanding # Outstanding payments

GET  /api/billing/tariffs                      # List service tariffs
PUT  /api/billing/tariffs/{id}                 # Update tariff

POST /api/finance/payments                     # Process payment
GET  /api/finance/payments/{id}                # Get payment status

POST /api/finance/refunds                      # Process refund
```

### Claims Processing
```http
GET  /api/claims                               # List claims
POST /api/claims                               # Submit claim
GET  /api/claims/{id}                          # Get claim details
PUT  /api/claims/{id}/status                   # Update claim status

GET  /api/claims/disputes                      # List disputes
POST /api/claims/disputes                      # Create dispute
PUT  /api/claims/disputes/{id}/resolve         # Resolve dispute

GET  /api/claims/reconciliation                # Reconciliation report
```

### CRM & Sales
```http
GET  /api/crm/leads                            # List leads
POST /api/crm/leads                            # Create lead
POST /api/crm/leads/{id}/convert               # Convert lead to opportunity

GET  /api/crm/agents                           # List agents
GET  /api/crm/agents/{id}/performance          # Agent performance
```

### Membership Management
```http
GET  /api/membership/members                   # List members
POST /api/membership/members                   # Register member
GET  /api/membership/members/{id}              # Get member details

POST /api/membership/enrollment                # Process enrollment
PUT  /api/membership/enrollment/{id}           # Update enrollment
```

### Wellness Programs
```http
GET  /api/wellness/programs                    # List programs
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