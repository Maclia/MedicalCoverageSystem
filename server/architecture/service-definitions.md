# Medical Coverage System - Microservice Architecture

## Service Boundaries and Ownership

This document defines the microservice architecture for the Medical Coverage System, outlining service boundaries, data ownership, and API contracts between services.

## Overview

The system is transitioning from a monolithic architecture to microservices to improve scalability, maintainability, and deployment independence. The following services are defined based on business domain boundaries.

## Core Services

### 1. Core Service (Authentication & User Management)

**Purpose:** Centralized authentication, authorization, and user management

**Responsibilities:**
- User authentication (JWT tokens, refresh tokens)
- User registration and profile management
- Role-based access control (RBAC)
- Password management and reset flows
- Session management
- Audit logging foundation

**Data Ownership:**
- `users` table
- `user_sessions` table
- `user_roles` table (if exists)
- `audit_logs` table (central audit repository)

**API Endpoints:**
```
POST /auth/login
POST /auth/logout
POST /auth/register
POST /auth/refresh
POST /auth/reset-password
GET  /auth/profile
PUT  /auth/profile
POST /auth/change-password
```

**Database:** `core_db`

**Dependencies:**
- PostgreSQL (user data)
- Redis (session storage)

---

### 2. Insurance Service

**Purpose:** Insurance scheme, benefit, and policy management

**Responsibilities:**
- Scheme definition and management
- Benefit plan configuration
- Premium calculation and rate management
- Coverage verification
- Policy eligibility rules
- Insurance provider management

**Data Ownership:**
- `companies` table (insurance companies)
- `schemes` table
- `benefits` table
- `premium_rates` table
- `benefit_categories` table
- `scheme_benefits` table
- `coverages` table

**API Endpoints:**
```
# Schemes
GET    /schemes
POST   /schemes
GET    /schemes/:id
PUT    /schemes/:id
DELETE /schemes/:id

# Benefits
GET    /benefits
POST   /benefits
GET    /benefits/:id
PUT    /benefits/:id
DELETE /benefits/:id

# Premium Rates
GET    /premium-rates
POST   /premium-rates
GET    /premium-rates/:id
PUT    /premium-rates/:id

# Coverage Verification
POST   /coverage/verify
GET    /coverage/check/:memberId
```

**Database:** `insurance_db`

**Dependencies:**
- Core Service (authentication)
- Notification Service (benefit notifications)

---

### 3. Hospital Service

**Purpose:** Hospital operations and patient management

**Responsibilities:**
- Patient registration and management
- Appointment scheduling
- Medical record management
- Hospital facility management
- Medical personnel management
- Pharmacy operations
- Laboratory services
- Radiology services

**Data Ownership:**
- `medical_institutions` table
- `medical_personnel` table
- `patients` table (if separate from members)
- `appointments` table
- `medical_records` table
- `pharmacy_*` tables
- `lab_*` tables
- `radiology_*` tables

**API Endpoints:**
```
# Patients
GET    /patients
POST   /patients
GET    /patients/:id
PUT    /patients/:id

# Appointments
GET    /appointments
POST   /appointments
GET    /appointments/:id
PUT    /appointments/:id
DELETE /appointments/:id

# Medical Records
GET    /medical-records/:patientId
POST   /medical-records
PUT    /medical-records/:id

# Personnel
GET    /personnel
POST   /personnel
GET    /personnel/:id
PUT    /personnel/:id
```

**Database:** `hospital_db`

**Dependencies:**
- Core Service (authentication)
- Billing Service (charge generation)

---

### 4. Billing Service

**Purpose:** Financial transactions, invoicing, and accounts receivable

**Responsibilities:**
- Invoice generation and management
- Accounts receivable tracking
- Hospital billing operations
- Service pricing and tariffs
- Payment processing coordination
- Financial reporting

**Data Ownership:**
- `invoices` table
- `accounts_receivable` table
- `billing_items` table
- `service_tariffs` table
- `payment_transactions` table
- `billing_settings` table

**API Endpoints:**
```
# Invoices
GET    /invoices
POST   /invoices
GET    /invoices/:id
PUT    /invoices/:id
DELETE /invoices/:id

# Accounts Receivable
GET    /accounts-receivable
POST   /accounts-receivable
GET    /accounts-receivable/:id
PUT    /accounts-receivable/:id

# Service Tariffs
GET    /tariffs
POST   /tariffs
GET    /tariffs/:id
PUT    /tariffs/:id
```

**Database:** `billing_db`

**Dependencies:**
- Core Service (authentication)
- Hospital Service (patient billing)
- Payment Service (payment processing)

---

### 5. Claims Service

**Purpose:** Claims processing, adjudication, and dispute management

**Responsibilities:**
- Claim submission and intake
- Claims adjudication and processing
- Claim status tracking
- Dispute management and resolution
- Claims reporting and analytics
- Reconciliation with insurance benefits

**Data Ownership:**
- `claims` table
- `claim_items` table
- `claim_statuses` table
- `claim_audit_trails` table
- `disputes` table
- `dispute_attachments` table
- `reconciliation_records` table

**API Endpoints:**
```
# Claims
GET    /claims
POST   /claims
GET    /claims/:id
PUT    /claims/:id
DELETE /claims/:id

# Claim Processing
POST   /claims/:id/submit
POST   /claims/:id/approve
POST   /claims/:id/reject
POST   /claims/:id/process

# Disputes
GET    /disputes
POST   /disputes
GET    /disputes/:id
PUT    /disputes/:id

# Reconciliation
GET    /reconciliation
POST   /reconciliation/process
GET    /reconciliation/report
```

**Database:** `claims_db`

**Dependencies:**
- Core Service (authentication)
- Insurance Service (benefit verification)
- Billing Service (invoice matching)
- Notification Service (status updates)

---

### 6. Payment Service

**Purpose:** Payment processing, commission management, and financial settlements

**Responsibilities:**
- Payment processing and gateway integration
- Commission calculation and distribution
- Premium payment processing
- Refund management
- Financial reconciliation
- Payment method management

**Data Ownership:**
- `payments` table
- `commissions` table
- `commission_payments` table
- `payment_methods` table
- `refunds` table
- `financial_settlements` table

**API Endpoints:**
```
# Payments
GET    /payments
POST   /payments
GET    /payments/:id
PUT    /payments/:id

# Commissions
GET    /commissions
POST   /commissions
GET    /commissions/:id
PUT    /commissions/:id

# Payment Methods
GET    /payment-methods
POST   /payment-methods
GET    /payment-methods/:id
PUT    /payment-methods/:id

# Refunds
GET    /refunds
POST   /refunds
GET    /refunds/:id
```

**Database:** `payment_db`

**Dependencies:**
- Core Service (authentication)
- Billing Service (invoice payments)
- Claims Service (claim payments)

---

## Supporting Services

### 7. Notification Service

**Purpose:** Centralized communication and notification management

**Responsibilities:**
- SMS notifications
- Email notifications
- Push notifications
- In-app notifications
- Notification templates
- Delivery tracking

**Data Ownership:**
- `notifications` table
- `notification_templates` table
- `notification_logs` table
- `delivery_status` table

**API Endpoints:**
```
POST /notifications/send
GET  /notifications
GET  /notifications/:id
POST /notifications/templates
GET  /notifications/templates/:id
```

**Database:** `notification_db`

**Dependencies:**
- All services (for sending notifications)

### 8. API Gateway

**Purpose:** Centralized routing, authentication, and rate limiting

**Responsibilities:**
- Request routing to appropriate services
- Authentication and authorization validation
- Rate limiting and throttling
- Request/response transformation
- API versioning
- Cross-origin resource sharing (CORS)
- Load balancing

**Data Ownership:**
- Minimal (routing configuration, rate limits)

**API Endpoints:**
- Routes all external API calls to appropriate services

**Dependencies:**
- All services (routes requests to them)

---

## Inter-Service Communication

### Synchronous Communication
- **REST APIs:** For immediate response requirements
- **GraphQL:** For complex data queries (future consideration)

### Asynchronous Communication
- **Message Queues (Redis/BullMQ):** For event-driven communication
- **Webhooks:** For external system integrations

### Service Discovery
- **Service Registry:** Central registry for service endpoints
- **Health Checks:** Regular health monitoring of all services

### Data Synchronization
- **Event Sourcing:** Critical data changes published as events
- **Read Replicas:** For read-heavy operations across services

## Data Ownership Matrix

| Service | Database | Primary Tables | Access Rights |
|---------|----------|----------------|---------------|
| Core | core_db | users, user_sessions, audit_logs | Read-only for others |
| Insurance | insurance_db | schemes, benefits, premiums | Shared read for verification |
| Hospital | hospital_db | patients, appointments, personnel | Shared read for billing/claims |
| Billing | billing_db | invoices, accounts_receivable | Shared read for payment |
| Claims | claims_db | claims, disputes, reconciliation | Shared read for reporting |
| Payment | payment_db | payments, commissions, refunds | Shared read for reconciliation |
| Notification | notification_db | notifications, templates | Write access for all services |

## Security Considerations

### Network Security
- **Service Mesh:** Mutual TLS between services
- **Network Policies:** Restrict inter-service communication
- **API Gateway:** Single entry point with security controls

### Authentication & Authorization
- **JWT Tokens:** Service-to-service authentication
- **RBAC:** Role-based access within each service
- **OAuth 2.0:** For external integrations

### Data Security
- **Encryption:** Data encrypted at rest and in transit
- **PII Protection:** Sensitive data masking in logs
- **Audit Trails:** Complete audit logging across all services

## Deployment Strategy

### Phase 1: Core Service Extraction
- Extract authentication and user management
- Implement API Gateway
- Establish service registry

### Phase 2: Business Service Extraction
- Extract Insurance Service
- Extract Hospital Service
- Implement inter-service communication

### Phase 3: Financial Service Extraction
- Extract Billing Service
- Extract Claims Service
- Extract Payment Service

### Phase 4: Supporting Services
- Extract Notification Service
- Implement advanced monitoring
- Optimize performance

## Monitoring & Observability

### Metrics
- **Application Metrics:** Custom business metrics per service
- **Infrastructure Metrics:** CPU, memory, network usage
- **API Metrics:** Response times, error rates, throughput

### Logging
- **Structured Logging:** Consistent log format across services
- **Centralized Logging:** Log aggregation and analysis
- **Correlation IDs:** Request tracing across services

### Tracing
- **Distributed Tracing:** Request flow across services
- **Performance Monitoring:** Bottleneck identification
- **Error Tracking:** Comprehensive error monitoring

This architecture provides a solid foundation for scaling the Medical Coverage System while maintaining security, reliability, and performance standards.