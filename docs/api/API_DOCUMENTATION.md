# Medical Coverage System API Documentation

## Overview

The Medical Coverage System is built on a microservices architecture with 9 independent services, each providing RESTful APIs for specific business domains. All services communicate through a centralized API Gateway that handles authentication, rate limiting, and request routing.

## Architecture

### API Gateway
- **Base URL**: `https://api.medical-coverage.com`
- **Version**: v1
- **Authentication**: JWT Bearer Token
- **Rate Limiting**: Applied per endpoint and user type
- **Request Tracing**: X-Correlation-ID header
- **Swagger Documentation**: `http://localhost:5000/api-docs` (development)

### Service Architecture

| Service | Primary Path | Database | Purpose |
|---------|--------------|----------|---------|
| **API Gateway** | `/` | N/A | Request routing & authentication |
| **Core** | `/api/auth`, `/api/core` | `medical-coverage-core` | Authentication & user management |
| **Insurance** | `/api/insurance`, `/api/schemes`, `/api/benefits`, `/api/coverage` | `medical-coverage-insurance` | Insurance schemes & benefits |
| **Hospital** | `/api/hospital`, `/api/patients`, `/api/appointments`, `/api/medical-records`, `/api/personnel` | `medical-coverage-hospital` | Hospital operations |
| **Billing** | `/api/billing`, `/api/invoices`, `/api/accounts-receivable`, `/api/tariffs` | `medical-coverage-billing` | Financial transactions |
| **Claims** | `/api/claims`, `/api/disputes`, `/api/reconciliation` | `medical-coverage-claims` | Claims processing |
| **Finance** | `/api/finance`, `/api/payments`, `/api/ledger` | `medical-coverage-finance` | Payment processing |
| **CRM** | `/api/crm`, `/api/leads`, `/api/agents`, `/api/commissions` | `medical-coverage-crm` | Sales & agent management |
| **Membership** | `/api/membership`, `/api/enrollments`, `/api/renewals` | `medical-coverage-membership` | Member lifecycle |
| **Wellness** | `/api/wellness`, `/api/programs`, `/api/activities`, `/api/incentives` | `medical-coverage-wellness` | Wellness programs |

*Note: Each service has multiple API path prefixes. The API Gateway routes requests to the appropriate service based on these prefixes with proper authentication and rate limiting.*

## API Gateway Features

### Health Monitoring
- **Health Check**: `GET /health` - Gateway and service health status
- **Service Status**: `GET /services` - Detailed service health information
- **API Documentation**: `GET /docs` - Available endpoints summary

### Swagger Documentation
- **Interactive API Docs**: `GET /api-docs` - Complete Swagger UI documentation
- **OpenAPI JSON**: `GET /swagger.json` - Machine-readable API specification
- **Comprehensive Coverage**: All 9 microservices fully documented with examples

### Security & Performance
- **JWT Authentication**: Bearer token validation for protected routes
- **Rate Limiting**: Configurable limits per endpoint and user type
- **Circuit Breakers**: Automatic service failover protection
- **Request Tracing**: Correlation IDs for debugging
- **Audit Logging**: Comprehensive request/response logging

## Authentication

### JWT Token Authentication
All API endpoints (except health checks and registration) require JWT authentication.

```bash
Authorization: Bearer <jwt_token>
```

### User Types
- `insurance`: Admin/insurance company users
- `institution`: Hospital/medical institution users
- `provider`: Healthcare provider users
- `sales_admin`: Sales administration users
- `sales_manager`: Sales management users
- `team_lead`: Team lead users
- `sales_agent`: Sales agent users
- `broker`: Insurance broker users
- `underwriter`: Underwriting users

### Token Refresh
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

## Common Response Format

All API responses follow a standardized format:

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Optional success message",
  "correlationId": "request-tracking-id",
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    },
    "timestamp": "2025-12-21T10:00:00.000Z",
    "requestId": "uuid-v4"
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
    "details": {},
    "correlationId": "request-tracking-id"
  }
}
```

## Rate Limiting

- **Standard Rate Limit**: 100 requests per minute per IP
- **Authentication Routes**: 10 requests per minute per IP
- **User Routes**: 1000 requests per minute per user
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## API Endpoints

## 1. Core Service (Authentication & User Management)

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "userType": "insurance|institution|provider",
  "entityId": 123
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "userType": "insurance|institution|provider"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### User Management Endpoints

#### Get Current User Profile
```http
GET /api/core/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/core/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "isActive": true
}
```

#### Change Password
```http
POST /api/core/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newsecurepassword123"
}
```

## 2. Insurance Service (Schemes & Benefits)

### Scheme Management

#### List Schemes
```http
GET /api/insurance/schemes?page=1&limit=10&search=term&status=active
Authorization: Bearer <token>
```

#### Get Scheme Details
```http
GET /api/insurance/schemes/{id}
Authorization: Bearer <token>
```

#### Create Scheme
```http
POST /api/insurance/schemes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Premium Health Plan",
  "description": "Comprehensive health coverage",
  "pricingMethodology": "community_rated",
  "status": "active",
  "effectiveDate": "2025-01-01",
  "expiryDate": "2025-12-31"
}
```

#### Update Scheme
```http
PUT /api/insurance/schemes/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Premium Health Plan",
  "status": "active"
}
```

#### Delete Scheme
```http
DELETE /api/insurance/schemes/{id}
Authorization: Bearer <token>
```

#### Add Benefit to Scheme
```http
POST /api/insurance/schemes/{id}/benefits
Authorization: Bearer <token>
Content-Type: application/json

{
  "benefitId": 123,
  "coverageLimit": 10000,
  "coPayment": 0.1
}
```

### Benefit Management

#### List Benefits
```http
GET /api/insurance/benefits?page=1&limit=10&category=medical&search=term
Authorization: Bearer <token>
```

#### Get Benefit Categories
```http
GET /api/insurance/benefits/categories
Authorization: Bearer <token>
```

#### Get Popular Benefits
```http
GET /api/insurance/benefits/popular
Authorization: Bearer <token>
```

#### Create Benefit
```http
POST /api/insurance/benefits
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Annual Health Checkup",
  "description": "Comprehensive annual health screening",
  "category": "wellness",
  "coverageType": "covered",
  "defaultLimit": 500
}
```

#### Update Benefit
```http
PUT /api/insurance/benefits/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Health Checkup",
  "defaultLimit": 600
}
```

### Coverage Verification

#### Verify Member Coverage
```http
GET /api/insurance/coverage/verify/{memberId}
Authorization: Bearer <token>
```

## 3. Hospital Service (Hospital Operations)

### Patient Management

#### List Patients
```http
GET /api/hospital/patients?page=1&limit=10&search=name&status=active
Authorization: Bearer <token>
```

#### Get Patient Details
```http
GET /api/hospital/patients/{id}
Authorization: Bearer <token>
```

#### Register Patient
```http
POST /api/hospital/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1980-01-01",
  "gender": "male",
  "contactNumber": "+1234567890",
  "email": "john.doe@example.com",
  "address": "123 Main St",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "spouse",
    "contactNumber": "+1234567891"
  }
}
```

### Appointment Management

#### List Appointments
```http
GET /api/hospital/appointments?date=2025-12-21&doctorId=123&status=scheduled
Authorization: Bearer <token>
```

#### Schedule Appointment
```http
POST /api/hospital/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 456,
  "doctorId": 123,
  "appointmentDate": "2025-12-21T10:00:00Z",
  "duration": 30,
  "appointmentType": "consultation",
  "notes": "Follow-up visit"
}
```

#### Update Appointment
```http
PUT /api/hospital/appointments/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

### Medical Records

#### Get Patient Medical Records
```http
GET /api/hospital/medical-records?patientId=456&page=1&limit=10
Authorization: Bearer <token>
```

#### Add Medical Record
```http
POST /api/hospital/medical-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 456,
  "recordType": "consultation",
  "diagnosis": "Common cold",
  "treatment": "Rest and fluids",
  "prescription": "Paracetamol 500mg",
  "notes": "Patient advised to rest",
  "doctorId": 123
}
```

### Personnel Management

#### List Hospital Personnel
```http
GET /api/hospital/personnel?department=cardiology&status=active
Authorization: Bearer <token>
```

#### Get Personnel Details
```http
GET /api/hospital/personnel/{id}
Authorization: Bearer <token>
```

## 4. Billing Service (Financial Transactions)

### Invoice Management

#### List Invoices
```http
GET /api/billing/invoices?page=1&limit=10&status=pending&patientId=456
Authorization: Bearer <token>
```

#### Get Invoice Details
```http
GET /api/billing/invoices/{id}
Authorization: Bearer <token>
```

#### Create Invoice
```http
POST /api/billing/invoices
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 456,
  "items": [
    {
      "description": "Consultation",
      "quantity": 1,
      "unitPrice": 150,
      "total": 150
    }
  ],
  "dueDate": "2025-01-15",
  "notes": "Medical consultation fee"
}
```

#### Update Invoice Status
```http
PUT /api/billing/invoices/{id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "paid",
  "paymentMethod": "insurance",
  "paymentReference": "PAY-12345"
}
```

### Accounts Receivable

#### Get Accounts Receivable Summary
```http
GET /api/billing/accounts-receivable/summary
Authorization: Bearer <token>
```

#### List Outstanding Payments
```http
GET /api/billing/accounts-receivable/outstanding?page=1&limit=10
Authorization: Bearer <token>
```

### Tariff Management

#### List Service Tariffs
```http
GET /api/billing/tariffs?category=consultation&active=true
Authorization: Bearer <token>
```

#### Update Tariff
```http
PUT /api/billing/tariffs/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 175,
  "effectiveDate": "2025-01-01"
}
```

## 5. Claims Service (Claims Processing)

### Claims Management

#### List Claims
```http
GET /api/claims?page=1&limit=10&status=pending&patientId=456
Authorization: Bearer <token>
```

#### Get Claim Details
```http
GET /api/claims/{id}
Authorization: Bearer <token>
```

#### Submit Claim
```http
POST /api/claims
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 456,
  "serviceDate": "2025-12-15",
  "diagnosisCode": "J00",
  "procedureCode": "99201",
  "claimedAmount": 150,
  "serviceProvider": "Dr. Smith",
  "documents": ["receipt.pdf", "prescription.pdf"],
  "notes": "Routine consultation"
}
```

#### Update Claim Status
```http
PUT /api/claims/{id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "approvedAmount": 150,
  "reviewerNotes": "Approved as per policy"
}
```

### Disputes Management

#### List Disputes
```http
GET /api/claims/disputes?page=1&limit=10&status=open
Authorization: Bearer <token>
```

#### Create Dispute
```http
POST /api/claims/disputes
Authorization: Bearer <token>
Content-Type: application/json

{
  "claimId": 789,
  "disputeType": "coverage_denied",
  "description": "Service should be covered under policy",
  "evidence": ["policy_document.pdf", "service_receipt.pdf"]
}
```

#### Resolve Dispute
```http
PUT /api/claims/disputes/{id}/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolution": "approved",
  "resolutionNotes": "Dispute resolved in favor of patient",
  "approvedAmount": 150
}
```

### Reconciliation

#### Get Reconciliation Report
```http
GET /api/claims/reconciliation?period=2025-12&status=all
Authorization: Bearer <token>
```

## 6. Finance Service (Payment Processing)

### Payment Processing

#### Process Payment
```http
POST /api/finance/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "invoiceId": 123,
  "amount": 150,
  "paymentMethod": "credit_card",
  "cardDetails": {
    "number": "4111111111111111",
    "expiryMonth": 12,
    "expiryYear": 2025,
    "cvv": "123"
  }
}
```

#### Get Payment Status
```http
GET /api/finance/payments/{id}
Authorization: Bearer <token>
```

### Commission Management

#### List Commissions
```http
GET /api/finance/commissions?page=1&limit=10&agentId=123&period=2025-12
Authorization: Bearer <token>
```

#### Calculate Commission
```http
POST /api/finance/commissions/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentId": 123,
  "policyId": 456,
  "premiumAmount": 500,
  "commissionRate": 0.1
}
```

### Refunds

#### Process Refund
```http
POST /api/finance/refunds
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": 789,
  "amount": 50,
  "reason": "Service not rendered",
  "notes": "Patient cancelled appointment"
}
```

## 7. CRM Service (Sales & Agent Management)

### Lead Management

#### List Leads
```http
GET /api/crm/leads?page=1&limit=10&status=new&source=website
Authorization: Bearer <token>
```

#### Create Lead
```http
POST /api/crm/leads
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "company": "Tech Corp",
  "leadSource": "website",
  "interestLevel": "high",
  "notes": "Interested in premium health plan"
}
```

#### Convert Lead
```http
POST /api/crm/leads/{id}/convert
Authorization: Bearer <token>
Content-Type: application/json

{
  "convertTo": "opportunity",
  "assignedAgentId": 123
}
```

### Agent Management

#### List Agents
```http
GET /api/crm/agents?page=1&limit=10&status=active&team=premium
Authorization: Bearer <token>
```

#### Get Agent Performance
```http
GET /api/crm/agents/{id}/performance?period=2025-12
Authorization: Bearer <token>
```

## 8. Membership Service (Member Lifecycle)

### Member Management

#### List Members
```http
GET /api/membership/members?page=1&limit=10&status=active&search=name
Authorization: Bearer <token>
```

#### Get Member Details
```http
GET /api/membership/members/{id}
Authorization: Bearer <token>
```

#### Register Member
```http
POST /api/membership/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "lastName": "Doe",
  "dateOfBirth": "1980-01-01",
  "gender": "male",
  "contactNumber": "+1234567890",
  "email": "john.doe@example.com",
  "address": "123 Main St",
  "schemeId": 123,
  "effectiveDate": "2025-01-01"
}
```

### Enrollment Management

#### Process Enrollment
```http
POST /api/membership/enrollment
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberId": 456,
  "schemeId": 123,
  "enrollmentDate": "2025-01-01",
  "premiumAmount": 500,
  "paymentFrequency": "monthly"
}
```

#### Update Enrollment
```http
PUT /api/membership/enrollment/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active",
  "premiumAmount": 550
}
```

## 9. Wellness Service (Wellness Programs)

### Program Management

#### List Programs
```http
GET /api/wellness/programs?page=1&limit=10&category=fitness&status=active
Authorization: Bearer <token>
```

#### Get Program Details
```http
GET /api/wellness/programs/{id}
Authorization: Bearer <token>
```

#### Create Program
```http
POST /api/wellness/programs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Healthy Living Challenge",
  "description": "30-day wellness program",
  "category": "fitness",
  "duration": 30,
  "pointsReward": 1000,
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

### Activity Management

#### List Activities
```http
GET /api/wellness/activities?page=1&limit=10&programId=123&memberId=456
Authorization: Bearer <token>
```

#### Log Activity
```http
POST /api/wellness/activities
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberId": 456,
  "programId": 123,
  "activityType": "exercise",
  "description": "30-minute run",
  "pointsEarned": 50,
  "date": "2025-12-21"
}
```

## Gateway Endpoints

### Health Check
```http
GET /health
```

### Service Status
```http
GET /services
Authorization: Bearer <token>
```

### API Documentation
```http
GET /docs
```

### Admin Service Health (Admin Only)
```http
GET /api/admin/services/health
Authorization: Bearer <admin_token>
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `INTERNAL_ERROR` | Internal server error |

## SDKs and Libraries

### JavaScript/TypeScript Client
```javascript
import { MedicalCoverageAPI } from '@medical-coverage/sdk';

const client = new MedicalCoverageAPI({
  baseURL: 'https://api.medical-coverage.com',
  apiKey: 'your-api-key'
});

// Example usage
const schemes = await client.insurance.listSchemes();
const patient = await client.hospital.createPatient(patientData);
```

### Postman Collection
Available at: `./MedicalCoverageSystemAPI.postman_collection.json`

Import this collection into Postman to test all API endpoints with pre-configured requests and authentication.

### Quick Reference Guide
See `./API_QUICK_REFERENCE.md` for a concise endpoint reference.

### OpenAPI Specification
Available at: `https://api.medical-coverage.com/docs/openapi.yaml`

## Support

- **Documentation**: https://docs.medical-coverage.com
- **API Status**: https://status.medical-coverage.com
- **Support**: support@medical-coverage.com
- **Developer Portal**: https://developers.medical-coverage.com

---

*Last Updated: December 21, 2025*  
*API Version: v1.0*</content>
<parameter name="filePath">\\wsl.localhost\Ubuntu\home\mac\MedicalCoverageSystem\docs\API_DOCUMENTATION.md