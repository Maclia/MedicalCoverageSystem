# Claims Service API Documentation

## Base URL
```
http://localhost:3005/api/claims
```

## Authentication
All endpoints require JWT authentication except the health check endpoint.

## Endpoints

### Health Check
```
GET /health
```
Returns service health status and version information.

**Response:**
```json
{
  "status": "ok",
  "service": "claims-service",
  "timestamp": "2026-04-18T18:26:24.000Z",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "schemaVersion": "claims"
  }
}
```

### Create Claim
```
POST /
```
Creates a new insurance claim.

**Request Body:**
```json
{
  "claimNumber": "CLM-2026-001",
  "institutionId": 1,
  "memberId": 1,
  "benefitId": 1,
  "memberName": "John Doe",
  "serviceType": "Consultation",
  "totalAmount": 1000,
  "amount": 1000,
  "description": "Medical consultation",
  "diagnosis": "General check-up",
  "diagnosisCode": "Z00.0",
  "diagnosisCodeType": "ICD-10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "claimNumber": "CLM-2026-001",
    "institutionId": 1,
    "memberId": 1,
    "benefitId": 1,
    "memberName": "John Doe",
    "serviceType": "Consultation",
    "totalAmount": 1000,
    "amount": 1000,
    "description": "Medical consultation",
    "diagnosis": "General check-up",
    "diagnosisCode": "Z00.0",
    "diagnosisCodeType": "ICD-10",
    "status": "submitted",
    "createdAt": "2026-04-18T18:26:24.000Z"
  },
  "message": "Claim created successfully"
}
```

### Get All Claims
```
GET /
```
Retrieves all claims with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by claim status
- `memberId` (optional): Filter by member ID
- `institutionId` (optional): Filter by institution ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "claimNumber": "CLM-2026-001",
      "institutionId": 1,
      "memberId": 1,
      "benefitId": 1,
      "memberName": "John Doe",
      "serviceType": "Consultation",
      "totalAmount": 1000,
      "amount": 1000,
      "description": "Medical consultation",
      "diagnosis": "General check-up",
      "diagnosisCode": "Z00.0",
      "diagnosisCodeType": "ICD-10",
      "status": "submitted",
      "createdAt": "2026-04-18T18:26:24.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### Get Claim by ID
```
GET /:claimId
```
Retrieves a specific claim by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "claimNumber": "CLM-2026-001",
    "institutionId": 1,
    "memberId": 1,
    "benefitId": 1,
    "memberName": "John Doe",
    "serviceType": "Consultation",
    "totalAmount": 1000,
    "amount": 1000,
    "description": "Medical consultation",
    "diagnosis": "General check-up",
    "diagnosisCode": "Z00.0",
    "diagnosisCodeType": "ICD-10",
    "status": "submitted",
    "createdAt": "2026-04-18T18:26:24.000Z"
  }
}
```

### Update Claim Status
```
PATCH /:claimId/status
```
Updates the status of a claim.

**Request Body:**
```json
{
  "status": "approved",
  "notes": "Approved by admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "claimNumber": "CLM-2026-001",
    "institutionId": 1,
    "memberId": 1,
    "benefitId": 1,
    "memberName": "John Doe",
    "serviceType": "Consultation",
    "totalAmount": 1000,
    "amount": 1000,
    "description": "Medical consultation",
    "diagnosis": "General check-up",
    "diagnosisCode": "Z00.0",
    "diagnosisCodeType": "ICD-10",
    "status": "approved",
    "createdAt": "2026-04-18T18:26:24.000Z",
    "reviewDate": "2026-04-18T18:26:24.000Z",
    "reviewerNotes": "Approved by admin"
  },
  "message": "Claim status updated successfully"
}
```

### Delete Claim
```
DELETE /:claimId
```
Deletes a claim.

**Response:**
```json
{
  "success": true,
  "message": "Claim deleted successfully"
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Invalid claim data",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["claimNumber"],
      "message": "claimNumber is required"
    }
  ]
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Claim not found"
}
```

### Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create claim",
  "error": "Database connection failed"
}
```

## Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP
- Exceeding limit returns 429 Too Many Requests

## Security

- JWT authentication required for all endpoints except health check
- Input validation using Zod schemas
- SQL injection prevention
- CORS configuration