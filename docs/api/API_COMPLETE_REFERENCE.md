# API Reference & Documentation

**Version**: 1.0 | **Status**: ✅ Complete | **Last Updated**: April 2, 2026

Complete API documentation for the Medical Coverage System with quick reference guide.

---

## Table of Contents

1. [API Gateway Overview](#api-gateway-overview)
2. [Authentication & Security](#authentication--security)
3. [Quick Reference Guide](#quick-reference-guide)
4. [Detailed API Endpoints](#detailed-api-endpoints)
5. [Standard Response Formats](#standard-response-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Code Examples](#code-examples)

---

## API Gateway Overview

### Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | `https://api.medical-coverage.com` |
| **Development** | `http://localhost:5000` |

### Architecture

The Medical Coverage System uses a **microservices architecture** with 9 independent services, all communicating through a centralized API Gateway:

```
Client Request
    ↓
API Gateway (Port 5000)
    ├─ Request Routing
    ├─ Authentication
    ├─ Rate Limiting
    ├─ Logging & Tracing
    └─ Response Formatting
    ↓
Service Routing
    ├── Core Service (Port 3003)
    ├── Insurance Service (Port 3008)
    ├── Hospital Service (Port 3007)
    ├── Billing Service (Port 3002)
    ├── Claims Service (Port 3010)
    ├── Finance Service (Port 3004)
    ├── CRM Service (Port 3005)
    ├── Membership Service (Port 3006)
    └── Wellness Service (Port 3009)
```

### Gateway Features

**Health Monitoring**:
```http
GET /health                     # Gateway and service health
GET /services                   # Individual service status
GET /docs                       # API documentation summary
```

**API Documentation**:
```http
GET /api-docs                   # Interactive Swagger UI
GET /swagger.json               # OpenAPI specification (JSON)
```

---

## Authentication & Security

### JWT Bearer Token Authentication

All API endpoints (except registration and health checks) require JWT authentication:

```bash
Authorization: Bearer <jwt_token>
```

### User Types

Supported user types include:
- `insurance` - Insurance company administrators
- `institution` - Healthcare provider institutions
- `provider` - Individual healthcare providers
- `sales_admin`, `sales_manager`, `team_lead`, `sales_agent` - CRM user roles
- `broker` - Insurance broker
- `underwriter` - Underwriting specialist

### Token Endpoints

**Register User**:
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

**Login**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "userType": "insurance|institution|provider"
}

Response:
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "expiresIn": 3600,
  "user": { ... }
}
```

**Refresh Token**:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

**Logout**:
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Security Features

- **Encryption**: All API communication uses HTTPS/TLS
- **Token Expiration**: Access tokens expire in 1 hour (configurable)
- **Refresh Tokens**: Long-lived tokens for obtaining new access tokens
- **CORS**: Properly configured cross-origin resource sharing
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, CSP configured
- **Request Signing**: Optional request signature verification for high-security operations

---

## Quick Reference Guide

### Gateway Management
```http
GET  /health                    # Health check
GET  /services                  # Service status
GET  /docs                      # API documentation
GET  /api-docs                  # Swagger UI
GET  /swagger.json              # OpenAPI spec
```

### Authentication
```http
POST /api/auth/register         # Register user
POST /api/auth/login            # User login
POST /api/auth/refresh          # Refresh token
POST /api/auth/logout           # User logout
```

### Core Service (Members & Companies)
```http
GET  /api/core/profile          # Get current user
PUT  /api/core/profile          # Update profile
POST /api/core/change-password  # Change password

# Members
GET  /api/core/members          # List members
POST /api/core/members          # Create member
GET  /api/core/members/{id}     # Get member details
PUT  /api/core/members/{id}     # Update member

# Companies
GET  /api/core/companies        # List companies
POST /api/core/companies        # Create company
GET  /api/core/companies/{id}   # Get company details
PUT  /api/core/companies/{id}   # Update company

# Member Cards
GET  /api/core/cards            # List cards
POST /api/core/cards            # Issue card
GET  /api/core/cards/{id}       # Get card details
```

### Insurance Service (Schemes & Benefits)
```http
# Schemes
GET  /api/schemes               # List schemes
POST /api/schemes               # Create scheme
GET  /api/schemes/{id}          # Get scheme
PUT  /api/schemes/{id}          # Update scheme
DELETE /api/schemes/{id}        # Delete scheme

# Benefits
GET  /api/benefits              # List benefits
POST /api/benefits              # Create benefit
GET  /api/benefits/{id}         # Get benefit
PUT  /api/benefits/{id}         # Update benefit
DELETE /api/benefits/{id}       # Delete benefit
GET  /api/benefits/categories   # Get categories

# Coverage
GET  /api/coverage/verify/{memberId}  # Verify coverage
```

### Hospital Service
```http
# Patients
GET  /api/patients              # List patients
POST /api/patients              # Register patient
GET  /api/patients/{id}         # Get patient
PUT  /api/patients/{id}         # Update patient

# Appointments
GET  /api/appointments          # List appointments
POST /api/appointments          # Schedule appointment
GET  /api/appointments/{id}     # Get appointment
PUT  /api/appointments/{id}     # Update appointment

# Medical Records
GET  /api/medical-records       # List records
POST /api/medical-records       # Create record
GET  /api/medical-records/{id}  # Get record

# Personnel
GET  /api/personnel             # List personnel
GET  /api/personnel/{id}        # Get personnel details
```

### Billing Service
```http
# Invoices
GET  /api/invoices              # List invoices
POST /api/invoices              # Create invoice
GET  /api/invoices/{id}         # Get invoice
PUT  /api/invoices/{id}/status  # Update status

# Accounts Receivable
GET  /api/accounts-receivable   # AR report

# Tariffs
GET  /api/tariffs               # List tariffs
PUT  /api/tariffs/{id}          # Update tariff
```

### Claims Service
```http
# Claims
GET  /api/claims                # List claims
POST /api/claims                # Submit claim
GET  /api/claims/{id}           # Get claim
PUT  /api/claims/{id}/status    # Update status

# Disputes
GET  /api/disputes              # List disputes
POST /api/disputes              # Create dispute
PUT  /api/disputes/{id}/resolve # Resolve dispute

# Reconciliation
GET  /api/reconciliation        # Reconciliation report
```

### Finance Service
```http
# Payments
GET  /api/payments              # List payments
POST /api/payments              # Process payment
GET  /api/payments/{id}         # Get payment status
POST /api/refunds               # Process refund

# Ledger
GET  /api/ledger                # General ledger entries
```

### CRM Service
```http
# Leads
GET  /api/leads                 # List leads
POST /api/leads                 # Create lead
GET  /api/leads/{id}            # Get lead
PUT  /api/leads/{id}            # Update lead
POST /api/leads/{id}/convert    # Convert lead

# Agents
GET  /api/agents                # List agents
POST /api/agents                # Create agent
GET  /api/agents/{id}           # Get agent
GET  /api/agents/{id}/performance  # Agent stats

# Commissions
GET  /api/commissions           # List commissions
POST /api/commissions           # Create commission
GET  /api/commissions/{id}      # Get commission
```

### Membership Service
```http
# Members
GET  /api/membership/members    # List members
POST /api/membership/members    # Register member
GET  /api/membership/members/{id} # Get member
PUT  /api/membership/members/{id} # Update member

# Enrollments
GET  /api/enrollments           # List enrollments
POST /api/enrollments           # Process enrollment
GET  /api/enrollments/{id}      # Get enrollment
PUT  /api/enrollments/{id}      # Update enrollment

# Renewals
GET  /api/renewals              # List renewals
POST /api/renewals              # Process renewal
GET  /api/renewals/{id}         # Get renewal
```

### Wellness Service
```http
# Programs
GET  /api/programs              # List programs
POST /api/programs              # Create program
GET  /api/programs/{id}         # Get program
PUT  /api/programs/{id}         # Update program

# Activities
GET  /api/activities            # List activities
POST /api/activities            # Log activity
GET  /api/activities/{id}       # Get activity

# Incentives
GET  /api/incentives            # List incentives
POST /api/incentives            # Create incentive
GET  /api/incentives/{id}       # Get incentive
```

---

## Detailed API Endpoints

### Core Service Endpoints

#### User Profile Management

**Get Current User Profile**:
```http
GET /api/core/profile
Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "userType": "insurance",
  "entityId": "company-uuid",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Update User Profile**:
```http
PUT /api/core/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "firstName": "John",
  "lastName": "Doe"
}

Response: 200 OK
{
  "success": true,
  "data": { ... }
}
```

**Change Password**:
```http
POST /api/core/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}

Response: 200 OK
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### Member Management

**List Members**:
```http
GET /api/core/members?page=1&limit=10&search=john
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "member-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+254712345678",
      "nationalId": "12345678",
      "dateOfBirth": "1990-01-01",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

**Get Member Details**:
```http
GET /api/core/members/{memberId}
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+254712345678",
    "nationalId": "12345678",
    "dateOfBirth": "1990-01-01",
    "status": "active",
    "scheme": {
      "id": "scheme-uuid",
      "name": "Corporate Gold",
      "type": "Corporate",
      "status": "active"
    },
    "card": {
      "id": "card-uuid",
      "cardNumber": "1234-5678-9012-3456",
      "status": "active",
      "expiryDate": "2026-12-31"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Create Member**:
```http
POST /api/core/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+254712345679",
  "nationalId": "87654321",
  "dateOfBirth": "1992-05-15",
  "companyId": "company-uuid",
  "schemeId": "scheme-uuid"
}

Response: 201 Created
{
  "success": true,
  "data": { ... },
  "message": "Member created successfully"
}
```

#### Company Management

**List Companies**:
```http
GET /api/core/companies
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "company-uuid",
      "name": "ACME Corporation",
      "registrationNumber": "PVT/00001234",
      "email": "contact@acme.com",
      "phone": "+254712345678",
      "address": "123 Business Park, Nairobi",
      "status": "active",
      "memberCount": 250,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Create Company**:
```http
POST /api/core/companies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Tech Innovations Ltd",
  "registrationNumber": "PVT/00005678",
  "email": "hr@techinnovations.com",
  "phone": "+254712345680",
  "address": "456 Innovation Hub, Nairobi",
  "industry": "Technology",
  "numberOfEmployees": 500
}

Response: 201 Created
{
  "success": true,
  "data": { ... }
}
```

#### Member Card Management

**List Member Cards**:
```http
GET /api/core/cards?memberId=member-uuid
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "card-uuid",
      "cardNumber": "1234-5678-9012-3456",
      "memberId": "member-uuid",
      "holderName": "John Doe",
      "issueDate": "2024-01-01",
      "expiryDate": "2026-12-31",
      "status": "active",
      "cardType": "physical"
    }
  ]
}
```

**Issue Member Card**:
```http
POST /api/core/cards
Authorization: Bearer <token>
Content-Type: application/json

{
  "memberId": "member-uuid",
  "cardType": "physical",
  "deliveryAddress": "123 Main St, Nairobi"
}

Response: 201 Created
{
  "success": true,
  "data": { ... },
  "message": "Card issued successfully"
}
```

---

## Standard Response Formats

### Success Response Format

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "correlationId": "req-12345-abcde",
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    },
    "timestamp": "2024-04-02T10:30:00.000Z",
    "requestId": "uuid-v4"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "correlationId": "req-12345-abcde"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | Success | Member retrieved successfully |
| **201** | Created | New member created |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Missing or invalid token |
| **403** | Forbidden | User lacks required permissions |
| **404** | Not Found | Member not found |
| **409** | Conflict | Member email already exists |
| **422** | Unprocessable | Validation errors |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Server Error | Internal server error |
| **503** | Service Unavailable | Service temporarily down |

### Common Error Codes

| Code | Message | Resolution |
|------|---------|-----------|
| `AUTH_INVALID_TOKEN` | Invalid or expired token | Refresh token using `/api/auth/refresh` |
| `AUTH_MISSING_TOKEN` | Authorization header missing | Include `Authorization: Bearer <token>` header |
| `VALIDATION_ERROR` | Input validation failed | Review error details and correct input |
| `RESOURCE_NOT_FOUND` | Resource does not exist | Verify resource ID and existence |
| `DUPLICATE_ENTRY` | Resource already exists | Check for existing records |
| `INSUFFICIENT_PERMISSIONS` | User lacks required role | Contact administrator |
| `SERVICE_UNAVAILABLE` | Service temporarily down | Retry after a few seconds |

---

## Rate Limiting

### Limit Configuration

| Category | Limit | Window |
|----------|-------|--------|
| Standard endpoints | 100 requests | Per minute per IP |
| Authentication | 10 requests | Per minute per IP |
| User-specific | 1000 requests | Per minute per user |
| Bulk operations | 10 requests | Per minute per IP |

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704195600
```

### Handling Rate Limits

When you receive a `429` status code:

```
Retry-After: 60
```

**Best Practice**: Implement exponential backoff for retries.

---

## Code Examples

### cURL Example

**Login and Get Access Token**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "userType": "insurance"
  }'
```

**Get Member Details**:
```bash
curl http://localhost:5000/api/core/members/{memberId} \
  -H "Authorization: Bearer <access_token>"
```

### JavaScript/TypeScript Example

```typescript
// Initialize API client
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login example
async function login(email, password) {
  try {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
      userType: 'insurance'
    });
    
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response.data);
  }
}

// Get member example
async function getMember(memberId) {
  try {
    const response = await apiClient.get(`/api/core/members/${memberId}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch member:', error.response.data);
  }
}
```

### Python Example

```python
import requests
import json

# API base URL
BASE_URL = "http://localhost:5000"

# Login
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={
        "email": "user@example.com",
        "password": "password123",
        "userType": "insurance"
    }
)

if login_response.status_code == 200:
    access_token = login_response.json()['accessToken']
    
    # Get member
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    member_response = requests.get(
        f"{BASE_URL}/api/core/members/{{memberId}}",
        headers=headers
    )
    
    if member_response.status_code == 200:
        member = member_response.json()['data']
        print(f"Member: {member['firstName']} {member['lastName']}")
```

---

## Additional Resources

- **Postman Collection**: Available in `docs/MedicalCoverageSystemAPI.postman_collection.json`
- **Swagger UI**: Navigate to `/api-docs` for interactive API testing
- **OpenAPI Spec**: Available at `/swagger.json` for integration with tools
- **Architecture Guide**: See [SYSTEM_ARCHITECTURE.md](../architecture/SYSTEM_ARCHITECTURE.md)
- **Implementation Guide**: See [IMPLEMENTATION_COMPLETE.md](../implementation/IMPLEMENTATION_COMPLETE.md)

---

**API Version**: v1.0 | **Status**: Production Ready | **Last Updated**: April 2, 2026
