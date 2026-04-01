# API Reference & Integration Guide

**Status**: 🟢 Current  
**API Version**: v1  
**Last Updated**: April 2, 2026

## 📋 Quick Navigation

- [API Gateway Overview](#api-gateway-overview)
- [Authentication](#authentication)
- [Service Endpoints](#service-endpoints)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Frontend Integration](#frontend-integration)
- [Common Use Cases](#common-use-cases)

---

## API Gateway Overview

### Base URL

| Environment | URL |
|-------------|-----|
| **Local Development** | http://localhost:3001 |
| **Docker** | http://api-gateway:3001 |
| **Production (Vercel)** | https://your-domain.com/api |

### Core Features

- **Authentication**: JWT Bearer token validation
- **Rate Limiting**: 100 requests/min per user, 1000/min global
- **Request Tracing**: X-Correlation-ID header for debugging
- **CORS**: Configured for frontend access
- **Health Monitoring**: `/health` endpoint for service status
- **API Documentation**: Swagger UI at `/api-docs`

### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2026-04-02T10:30:00Z",
  "services": {
    "core-service": "healthy",
    "insurance-service": "healthy",
    "hospital-service": "healthy",
    "billing-service": "healthy",
    "finance-service": "healthy",
    "crm-service": "healthy",
    "membership-service": "healthy",
    "wellness-service": "healthy",
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

## Authentication

### JWT Token Flow

```
1. Login Request
   POST /api/core/auth/login
   { email, password }
   ↓
2. Receive Tokens
   { accessToken, refreshToken }
   ↓
3. Use Access Token
   Authorization: Bearer {accessToken}
   ↓
4. Token Expires?
   Use refreshToken to get new accessToken
```

### Login

```bash
POST /api/core/auth/login

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (201):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Using Tokens

```bash
# All authenticated requests use Bearer token
Authorization: Bearer {accessToken}

# Example
GET /api/core/users/profile
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Refresh Token

```bash
POST /api/core/auth/refresh

Headers:
  Authorization: Bearer {refreshToken}

Response (200):
{
  "accessToken": "new_token...",
  "expiresIn": 900
}
```

### Logout

```bash
POST /api/core/auth/logout

Headers:
  Authorization: Bearer {accessToken}

Response (200):
{
  "message": "Logged out successfully"
}
```

---

## Service Endpoints

### Core Service (`/api/core`)

**Purpose**: User & Company Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | User login |
| POST | `/auth/register` | ❌ | User registration |
| POST | `/auth/refresh` | ✅ | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout user |
| GET | `/users/profile` | ✅ | Get current user |
| GET | `/users/:id` | ✅ | Get user details |
| PUT | `/users/:id` | ✅ | Update user |
| GET | `/companies` | ✅ | List companies |
| POST | `/companies` | ✅ Admin | Create company |
| GET | `/members` | ✅ | List members |
| GET | `/members/:id` | ✅ | Get member details |

### Insurance Service (`/api/insurance`)

**Purpose**: Insurance Policies & Benefits

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/schemes` | ✅ | List insurance schemes |
| GET | `/schemes/:id` | ✅ | Get scheme details |
| POST | `/schemes` | ✅ Admin | Create scheme |
| GET | `/benefits` | ✅ | List benefits |
| GET | `/coverage` | ✅ | Check coverage |
| POST | `/policies` | ✅ | Create policy |
| GET | `/policies/:id` | ✅ | Get policy details |

### Hospital Service (`/api/hospital`)

**Purpose**: Hospital Operations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/facilities` | ✅ | List hospital facilities |
| GET | `/patients` | ✅ | Patient records |
| POST | `/appointments` | ✅ | Book appointment |
| GET | `/appointments/:id` | ✅ | Get appointment |
| POST | `/medical-records` | ✅ | Add medical record |
| GET | `/personnel` | ✅ | Staff directory |

### Billing Service (`/api/billing`)

**Purpose**: Invoicing & Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/invoices` | ✅ | List invoices |
| GET | `/invoices/:id` | ✅ | Get invoice details |
| POST | `/invoices` | ✅ | Create invoice |
| POST | `/payments` | ✅ | Record payment |
| GET | `/accounts` | ✅ | Account info |

### Finance Service (`/api/finance`)

**Purpose**: Payment Processing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payments` | ✅ | List payments |
| POST | `/payments` | ✅ | Process payment |
| GET | `/payments/:id` | ✅ | Payment status |
| GET | `/ledger` | ✅ | Ledger entries |
| POST | `/reconciliation` | ✅ | Reconcile accounts |

### CRM Service (`/api/crm`)

**Purpose**: Sales & Commission Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/leads` | ✅ | List leads |
| POST | `/leads` | ✅ | Create lead |
| GET | `/agents` | ✅ | List agents |
| GET | `/commissions` | ✅ | Commission tracking |
| POST | `/commissions/distribute` | ✅ Admin | Calculate commissions |

### Membership Service (`/api/membership`)

**Purpose**: Enrollment & Renewals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/enrollments` | ✅ | List enrollments |
| POST | `/enrollments` | ✅ | New enrollment |
| GET | `/renewals` | ✅ | Pending renewals |
| POST | `/renewals/:id` | ✅ | Renew membership |
| GET | `/status` | ✅ | Member status |

### Wellness Service (`/api/wellness`)

**Purpose**: Health Programs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/programs` | ✅ | List programs |
| POST | `/programs` | ✅ Admin | Create program |
| GET | `/activities` | ✅ | Track activities |
| POST | `/activities/:id/join` | ✅ | Join activity |
| GET | `/incentives` | ✅ | View incentives |

---

## Request/Response Format

### Request Headers

```javascript
// Required headers for authenticated requests
Authorization: Bearer {accessToken}
Content-Type: application/json
X-Correlation-ID: unique-request-id (optional, for tracing)

// Example with axios
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Correlation-ID': generateUUID()
};
```

### Response Format

**Success Response (2xx)**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful",
  "timestamp": "2026-04-02T10:30:00Z"
}
```

**Paginated Response**:
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "pages": 8
  },
  "timestamp": "2026-04-02T10:30:00Z"
}
```

### Request Examples

```bash
# GET with query parameters
curl -H "Authorization: Bearer {token}" \
  'http://localhost:3001/api/core/users?page=1&limit=10'

# POST with body
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}' \
  http://localhost:3001/api/core/users

# PUT with update
curl -X PUT -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}' \
  http://localhost:3001/api/core/users/123
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-04-02T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Handling |
|------|---------|----------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, check details |
| 401 | Unauthorized | Missing/invalid token, re-login |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate/conflict error |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Service down, retry later |

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `VALIDATION_ERROR` | Input validation failed | Check error details, retry with corrected data |
| `AUTHENTICATION_ERROR` | Token invalid/expired | Refresh token or re-login |
| `AUTHORIZATION_ERROR` | Insufficient permissions | Use account with proper role |
| `RESOURCE_NOT_FOUND` | Resource doesn't exist | Check ID, verify resource exists |
| `DUPLICATE_ERROR` | Record already exists | Use different unique value |
| `SERVICE_ERROR` | Internal server error | Retry later, contact support |
| `RATE_LIMIT_ERROR` | Too many requests | Wait before retrying |

---

## Rate Limiting

### Limits

```
- Per User: 100 requests per minute
- Global: 1000 requests per minute
- Burst: 10 requests per second
```

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1712065800
```

### Handling Rate Limits

```typescript
// When you get 429 response
const resetTime = parseInt(headers['x-ratelimit-reset']) * 1000;
const waitTime = resetTime - Date.now();
console.log(`Rate limited. Retry after ${waitTime}ms`);

// Exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Frontend Integration

### API Client Setup

**File**: `client/src/lib/api.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token and retry
      const newToken = await refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Using the API Client in Components

```typescript
// React component example
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export function UserProfile() {
  // GET request
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api.get('/api/core/users/profile')
  });

  // POST request
  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/api/core/users/${user.id}`, data),
    onSuccess: () => {
      // Handle success
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => updateMutation.mutate({ name: 'New Name' })}>
        Update Profile
      </button>
    </div>
  );
}
```

---

## Common Use Cases

### User Registration & Login

```typescript
// 1. Register
const register = async (email, password) => {
  return api.post('/api/core/auth/register', { email, password });
};

// 2. Login
const login = async (email, password) => {
  const response = await api.post('/api/core/auth/login', { email, password });
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);
  return response.data;
};

// 3. Get user profile
const getProfile = async () => {
  return api.get('/api/core/users/profile');
};
```

### Fetching Member Data

```typescript
// Get all members with pagination
const getMembers = async (page = 1, limit = 20) => {
  return api.get('/api/core/members', {
    params: { page, limit }
  });
};

// Get single member
const getMember = async (id) => {
  return api.get(`/api/core/members/${id}`);
};

// Create new member
const createMember = async (memberData) => {
  return api.post('/api/core/members', memberData);
};
```

### Processing Payments

```typescript
// Create payment
const createPayment = async (billId, amount) => {
  return api.post('/api/billing/payments', {
    billId,
    amount,
    methodType: 'card'
  });
};

// Get payment status
const checkPaymentStatus = async (paymentId) => {
  return api.get(`/api/billing/payments/${paymentId}`);
};
```

### Filing Claims

```typescript
// Submit claim
const submitClaim = async (claimData) => {
  return api.post('/api/insurance/claims', claimData);
};

// Track claim status
const getClaimStatus = async (claimId) => {
  return api.get(`/api/insurance/claims/${claimId}`);
};

// Get claim history
const getClaimHistory = async (memberId) => {
  return api.get(`/api/insurance/claims`, {
    params: { memberId }
  });
};
```

---

## WebSocket Support (Optional)

```typescript
// Real-time notifications
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

const socket = new WebSocket(WS_URL);

socket.addEventListener('open', () => {
  // Send auth token
  socket.send(JSON.stringify({
    type: 'authenticate',
    token: localStorage.getItem('accessToken')
  }));
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'notification') {
    // Handle real-time notification
  }
});
```

---

## API Documentation

### Swagger UI

Access the interactive Swagger documentation:

```
http://localhost:3001/api-docs
```

Features:
- ✅ Try out API endpoints
- ✅ View request/response schemas
- ✅ Download OpenAPI JSON
- ✅ Authentication handling

### OpenAPI Specification

```bash
# Get OpenAPI JSON
curl http://localhost:3001/swagger.json

# Download for use in other tools
curl http://localhost:3001/swagger.json > openapi.json
```

---

## Monitoring & Debugging

### Request Tracing

```typescript
// Add correlation ID to track requests
import { v4 as uuid } from 'uuid';

const config = {
  headers: {
    'X-Correlation-ID': uuid()
  }
};

api.get('/api/core/users', config);
```

### Check Service Status

```bash
# All services
curl http://localhost:3001/health

# Individual service logs
docker-compose logs api-gateway
docker-compose logs core-service
```

---

## Rate Limits & Performance

- **Response time**: <500ms average
- **Concurrent users**: 10,000+
- **Max request size**: 10MB
- **Connection timeout**: 30s
- **Idle timeout**: 60s

---

**For detailed service documentation, see `services/{service-name}/README.md`**
