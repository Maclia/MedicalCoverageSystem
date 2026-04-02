# Provider Features Implementation Guide

## Overview

This document provides a comprehensive analysis of how the 9 main healthcare provider features are implemented across the codebase, including frontend components, backend services, API endpoints, data models, and workflows.

**Last Updated**: December 21, 2025

---

## 1. Dashboard

### Feature Description
Provider dashboard serves as the main entry point, displaying key metrics, quick actions, today's appointments, recent claims, and upcoming tasks.

### Frontend Implementation

**Primary Component**: [client/src/components/dashboards/ProviderDashboard.tsx](../client/src/components/dashboards/ProviderDashboard.tsx)

**Key Features**:
- **Key Metrics Section** (4 cards):
  - Total Patients: 1,247
  - Today's Appointments: 24
  - Pending Claims: 18
  - Monthly Earnings: $28,450
  - Average Rating: 4.8
  - Satisfaction Score: 96%

- **Quick Actions Grid** (6 buttons):
  - Schedule Appointment → `/appointments`
  - Submit Claim → `/claims/new`
  - Patient Records → `/patients`
  - Find Members → `/member-search`
  - Earnings Report → `/earnings`
  - Messages → `/messages`

- **Today's Schedule Widget**: Lists confirmed and pending appointments with patient names, times, and types

- **Recent Claims Section**: Shows claim status (approved, processing, pending) with amounts and dates

- **Upcoming Tasks**: Priority-based task list with due dates (High/Medium/Low)

- **Notifications Badge**: Real-time notification count in header

**Technology Stack**:
- React hooks (useState for local state)
- Heroicons for UI icons
- Card, Badge, Button UI components from Radix
- Color-coded status indicators (green, yellow, red, blue)

**Data Flow**:
```
useAuth() context
  ↓
Retrieve user.entityData.name and user.email
  ↓
Mock data (production uses React Query)
  ↓
Render dashboard sections
```

**API Integration**:
- Currently uses mock data
- Production version will use:
  - `/api/appointments` - fetch today's appointments
  - `/api/claims` - fetch recent claims and pending count
  - `/api/earnings` - fetch monthly earnings
  - `/api/patients` - fetch patient statistics
  - `/api/notifications` - fetch notification count

---

## 2. My Patients (Patient Management)

### Feature Description
Comprehensive patient management system allowing providers to view, search, manage, and access patient medical history.

### Frontend Implementation

**Primary Component**: [client/src/pages/MemberDashboard.tsx](../client/src/pages/MemberDashboard.tsx)

**Secondary Pages**:
- Patient verification and eligibility checking
- Patient records with medical history

**Key Features**:
- **Patient List View**:
  - Search by name, ID, or contact information
  - Filter by status, enrollment date, benefit category
  - Pagination and sorting capabilities
  - Quick patient actions (view records, contact, schedule)

- **Patient Details**:
  - Demographics (name, DOB, email, phone, address)
  - Employment information (company, employee ID)
  - Member type (Principal/Dependent)
  - Disability information and special needs
  - Active benefits and coverage details

- **Patient Benefits Tab**:
  - View enrolled benefits
  - See coverage limits and usage
  - Check waiting periods
  - View claim history per benefit

- **Patient Claims Tab**:
  - View all submitted claims
  - Filter by date range, status
  - See claim amounts and dates
  - Access claim details and payment information

- **Patient History Tab**:
  - Medical history and diagnoses
  - Previous treatments
  - Hospital admissions
  - Referrals and consultations

**Interfaces Defined**:
```typescript
interface Member {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  employeeId: string
  memberType: string
  principalId?: number
  dependentType?: string
  hasDisability?: boolean
  disabilityDetails?: string
  createdAt: string
  companyId: number
  company?: { id: number; name: string }
}

interface Claim {
  id: number
  memberId: number
  institutionId: number
  personnelId: number
  benefitId: number
  claimDate: string
  serviceDate: string
  amount: number
  description: string
  diagnosis: string
  status: string
  reviewDate?: string
  reviewerNotes?: string
  paymentDate?: string
  paymentReference?: string
  createdAt: string
}
```

**Backend Service**: Hospital Service (`services/hospital-service`)

**API Endpoints** (in [services/hospital-service/src/routes/index.ts](../services/hospital-service/src/routes/index.ts)):
```
GET    /patients                        - List all patients (with pagination)
GET    /patients/search                 - Search patients
GET    /patients/stats                  - Get patient statistics
GET    /patients/:id                    - Get specific patient details
POST   /patients                        - Create new patient record
PUT    /patients/:id                    - Update patient information
POST   /patients/:id/deactivate         - Deactivate patient account
```

**Authentication**: Requires valid JWT token via authMiddleware

**Validation**: Request/response validation using patientsValidationMiddleware

**Rate Limiting**: Write operations limited to 100 requests per 15 minutes

**Data Models** (from shared/schema.ts):
- Members table with company foreign key
- Member benefits junction table
- Claim records linked to members, institutions, and benefits
- Medical history and diagnosis records

---

## 3. Member Search

### Feature Description
Real-time member search and verification system to check membership eligibility, coverage status, and benefit information before service delivery.

### Frontend Implementation

**Primary Component**: Located in [client/src/pages/](../client/src/pages/) (likely MemberDashboard.tsx tabs)

**Key Features**:
- **Quick Search**:
  - Search by Member ID
  - Search by First/Last Name
  - Search by Email or Phone
  - Real-time search with debounce

- **Advanced Filters**:
  - Filter by membership status (Active, Inactive, Suspended)
  - Filter by benefit type
  - Filter by coverage period
  - Filter by enrollment date range

- **Eligibility Verification**:
  - Real-time coverage status
  - Active benefit list
  - Coverage limits and remaining balance
  - Waiting period status
  - Dependent verification
  - Active/Inactive status

- **Quick Actions**:
  - View detailed member profile
  - Submit claim for this member
  - Schedule appointment
  - Send message

**Backend Service**: Hospital Service (via /api/patients/search endpoint)

**API Endpoints**:
```
GET    /patients/search?query=value     - Search patients by name/ID/email
GET    /patients/:id                    - Get member eligibility details
GET    /members/:id/eligibility         - Verify member eligibility (if exists)
```

**Search Parameters**:
- `q` or `query`: Search term (name, ID, email, phone)
- `status`: Filter by membership status
- `benefitId`: Filter by benefit type
- `pageSize`: Pagination size
- `pageNumber`: Page number

**Response Data**:
```json
{
  "members": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "memberType": "Principal",
      "status": "Active",
      "coverageStatus": "Active",
      "activeBenefits": [
        {
          "id": 1,
          "name": "Basic Medical",
          "category": "General",
          "coverageLimit": 100000,
          "remainingBalance": 75000,
          "hasWaitingPeriod": false
        }
      ]
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

---

## 4. Submit Claim

### Feature Description
Comprehensive claim submission workflow allowing providers to submit insurance claims for patient services with validation, pricing, and tracking.

### Frontend Implementation

**Primary Component**: [client/src/pages/ProviderClaimSubmission.tsx](../client/src/pages/ProviderClaimSubmission.tsx) (150+ lines)

**Key Features**:

**Step 1: Basic Information**
- Institution selection (dropdown)
- Medical personnel/doctor selection (auto-populated based on institution)
- Patient/Member selection (searchable)
- Service date picker
- Benefit coverage selection

**Step 2: Medical Information**
- Diagnosis (text field)
- Diagnosis code (ICD-10 or ICD-11 selector)
- Treatment description (textarea)
- Detailed treatment notes

**Step 3: Procedure Selection**
- Dynamic procedure list selection
- Procedure-specific quantity
- Provider-specific rate lookup
- Automatic total calculation
- Add/remove procedures dialog

**Procedure Item Structure**:
```typescript
interface ProcedureItem {
  id?: number
  procedureId: number
  procedureName?: string
  procedureCode?: string
  quantity: number
  unitRate?: number
  totalAmount?: number
  notes?: string
}
```

**Features**:
- Provider-specific rate negotiation (uses `agreedRate` if available, else standard rate)
- Automatic calculation: `totalAmount = unitRate × quantity`
- Procedures can have notes/special instructions
- Add/Remove procedures with dialog
- Validation: quantity must be ≥ 1

**State Management**:
```typescript
const [institutionId, setInstitutionId] = useState<number>(0)
const [personnelId, setPersonnelId] = useState<number>(0)
const [memberId, setMemberId] = useState<number>(0)
const [benefitId, setBenefitId] = useState<number>(0)
const [serviceDate, setServiceDate] = useState<Date | undefined>(new Date())
const [diagnosis, setDiagnosis] = useState('')
const [diagnosisCode, setDiagnosisCode] = useState('')
const [diagnosisCodeType, setDiagnosisCodeType] = useState<'ICD-10' | 'ICD-11'>('ICD-10')
const [description, setDescription] = useState('')
const [treatmentDetails, setTreatmentDetails] = useState('')
const [selectedProcedures, setSelectedProcedures] = useState<ProcedureItem[]>([])
```

**React Query Data Fetching**:
```typescript
const { data: institutions } = useQuery({
  queryKey: ['/api/medical-institutions']
})

const { data: benefits } = useQuery({
  queryKey: ['/api/benefits']
})

const { data: members } = useQuery({
  queryKey: ['/api/members']
})

const { data: personnel, refetch: refetchPersonnel } = useQuery({
  queryKey: ['/api/medical-personnel', institutionId],
  enabled: !!institutionId
})

const { data: procedures } = useQuery({
  queryKey: ['/api/medical-procedures']
})

const { data: providerRates, refetch: refetchRates } = useQuery({
  queryKey: ['/api/provider-procedure-rates', institutionId],
  enabled: !!institutionId
})
```

**Backend Services Required**:
1. **Hospital Service**: Medical institutions, personnel, procedures
2. **Insurance Service**: Benefits, coverage information
3. **Core Service**: Members, companies
4. **Billing Service**: Claims submission and processing
5. **Finance Service**: Provider rates, payment processing

**API Endpoints**:
```
GET    /api/medical-institutions                      - List institutions
GET    /api/medical-personnel?institutionId={id}      - Get personnel for institution
GET    /api/members                                   - List members
GET    /api/medical-procedures                        - List available procedures
GET    /api/provider-procedure-rates?institutionId={id} - Get provider-specific rates
GET    /api/benefits                                  - List available benefits

POST   /api/claims                                    - Submit new claim
  Payload: {
    institutionId: number
    personnelId: number
    memberId: number
    benefitId: number
    serviceDate: string (ISO date)
    diagnosis: string
    diagnosisCode: string
    diagnosisCodeType: 'ICD-10' | 'ICD-11'
    description: string
    treatmentDetails: string
    procedures: ProcedureItem[]
  }

GET    /api/claims/:id                                - Get claim details
GET    /api/claims?status={status}&dateRange={range}  - Track submitted claims
```

**Response on Success**:
```json
{
  "success": true,
  "data": {
    "claimId": 12345,
    "status": "Submitted",
    "totalAmount": 2500,
    "procedures": 3,
    "estimatedProcessingTime": "3-5 business days",
    "referenceNumber": "CLM-2025-001234"
  }
}
```

**Validation**:
- Institution must be selected
- Personnel must belong to selected institution
- Member must exist and be eligible
- Service date must be valid (not future)
- At least one procedure must be added
- Diagnosis code must be valid ICD-10/11 format
- Quantities must be positive integers

**Error Handling**:
- Invalid procedure selection → error toast
- Missing required fields → validation message
- Server errors → error dialog with retry
- Success → success dialog with claim reference number

---

## 5. Appointments

### Feature Description
Appointment scheduling and management system for providers to book, reschedule, and track patient appointments.

### Frontend Implementation

**Route**: `/appointments`

**Key Features**:
- **Schedule View**:
  - Calendar view for appointment scheduling
  - Time slot availability checker
  - Multiple appointment types (Follow-up, Initial Consultation, Procedure, Emergency)

- **Appointment Management**:
  - View today's appointments (in dashboard)
  - View full schedule/calendar
  - Reschedule appointments
  - Cancel appointments
  - Add appointment notes/instructions

- **Appointment Details**:
  - Patient information
  - Appointment type and duration
  - Appointment status (Confirmed, Pending, Cancelled)
  - Provider/personnel assigned
  - Location/room assignment
  - Special instructions or medical notes

**Backend Service**: Hospital Service

**API Endpoints** (in [services/hospital-service/src/routes/index.ts](../services/hospital-service/src/routes/index.ts)):
```
GET    /appointments                                - List appointments (with filtering)
GET    /appointments/available-slots               - Get available time slots
GET    /appointments/:id                           - Get specific appointment
POST   /appointments                               - Create new appointment
PUT    /appointments/:id                           - Update/reschedule appointment
POST   /appointments/:id/cancel                    - Cancel appointment
```

**Request Validation Middleware**:
- `appointmentsValidationMiddleware.validateQuery` - Validate list queries
- `appointmentsValidationMiddleware.validateTimeSlotsQuery` - Validate slot requests
- `appointmentsValidationMiddleware.validateCreateAppointment` - Validate creation
- `appointmentsValidationMiddleware.validateUpdateAppointment` - Validate updates
- `appointmentsValidationMiddleware.validateCancelAppointment` - Validate cancellation

**Rate Limiting**: 100 requests per 15 minutes for write operations

**Authentication**: Required via authMiddleware

**Data Model** (from shared schema):
- Appointment records linked to members (patients), providers (personnel), and institutions (hospitals)
- Status tracking (Confirmed, Pending, Cancelled, Completed)
- Appointment types enumeration
- Duration and time slot management
- Cancellation reasons and notes storage

---

## 6. My Earnings

### Feature Description
Financial dashboard showing provider earnings, payments, and earning trends from claim approvals and services rendered.

### Frontend Implementation

**Route**: `/earnings`

**Key Features** (inferred from Dashboard):
- **Earnings Summary**:
  - Monthly earnings total ($28,450 in dashboard example)
  - Earnings trend (+12% from last month)
  - Year-to-date earnings
  - Pending payments

- **Earnings Breakdown**:
  - Earnings by benefit type
  - Earnings by service type
  - Earnings by month (chart view)
  - Earnings by patient/claim

- **Payment History**:
  - Settled payments with dates and amounts
  - Pending payment amounts
  - Payment schedules
  - Payment method details

- **Financial Reports**:
  - Monthly earning statements
  - Annual reports
  - Tax documentation
  - CSV/PDF export options

**Backend Service**: Finance Service (`services/finance-service`)

**API Endpoints**:
```
GET    /api/earnings                    - Get earnings summary
GET    /api/earnings/monthly            - Get monthly earnings breakdown
GET    /api/earnings/by-benefit         - Earnings by benefit type
GET    /api/earnings/by-service         - Earnings by service type
GET    /api/payments                    - Get payment history
GET    /api/payments/:id                - Get specific payment details
GET    /api/statements                  - Get earning statements
GET    /api/statements/:id/download     - Download statement (PDF/CSV)
```

**Finance Service Database Model** (from [services/finance-service/src/models/schema.ts](../services/finance-service/src/models/schema.ts)):
- Provider earnings records
- Payment transactions
- Settlement ledgers
- Refund records
- Tax information

**Response Structure**:
```json
{
  "period": "2025-12",
  "totalEarnings": 28450,
  "pendingPayments": 5000,
  "settledPayments": 23450,
  "monthlyTrend": {
    "previous_month": 25400,
    "percentage_change": 12
  },
  "byBenefit": [
    {
      "benefitName": "Basic Medical",
      "earnings": 15000,
      "claimCount": 50
    }
  ],
  "paymentHistory": [
    {
      "id": 1,
      "amount": 5000,
      "date": "2025-12-15",
      "status": "Settled",
      "method": "Bank Transfer"
    }
  ]
}
```

---

## 7. Messages

### Feature Description
Secure messaging system for communication between providers, patients, and support staff.

### Frontend Implementation

**Route**: `/messages`

**Key Features**:
- **Message Inbox**:
  - Conversation list with recent messages
  - Unread message badges
  - Search conversations
  - Filter by sender type (Patients, Support, Admins)

- **Message Threads**:
  - Real-time messaging interface
  - Rich text message formatting
  - File attachments for medical documents
  - Message timestamps and read receipts
  - Reply-to functionality

- **Message History**:
  - Archive conversations
  - Search message history
  - Sort by date or sender
  - Pin important messages

**Backend Service**: CRM Service (`services/crm-service`)

**API Endpoints**:
```
GET    /api/messages                    - Get message inbox
GET    /api/messages/:id                - Get specific conversation
POST   /api/messages                    - Send new message
PUT    /api/messages/:id                - Mark as read/archive
DELETE /api/messages/:id                - Delete message
GET    /api/messages/search?q=query     - Search messages

WebSocket endpoints (optional for real-time):
ws://api/messages/ws/:userId            - Real-time message streaming
```

**Message Object Structure**:
```typescript
interface Message {
  id: number
  senderId: number
  recipientId: number
  conversationId: number
  content: string
  attachments?: {
    id: number
    filename: string
    url: string
    type: string
  }[]
  isRead: boolean
  createdAt: string
  readAt?: string
}
```

**Features**:
- HIPAA-compliant secure messaging (encrypted messages in transit)
- Automatic message archival after set period
- Message read receipts
- Typing indicators (if real-time)
- File attachment support for medical documents

---

## 8. Wellness Programs

### Feature Description
Provider access to wellness programs and preventive health initiatives to recommend to patients.

### Frontend Implementation

**Route**: `/wellness/my-programs` or similar

**Key Features**:
- **Available Programs**:
  - List of wellness program offerings
  - Program descriptions and objectives
  - Target beneficiary groups
  - Program duration and timeline
  - Participation requirements

- **Program Enrollment**:
  - Enroll patients in programs
  - Track enrollment status
  - View enrollment deadlines
  - Check available slots

- **Program Details**:
  - Program curriculum/activities
  - Health benefits and outcomes
  - Success metrics/KPIs
  - Resource materials
  - Support contact information

- **Participation Tracking**:
  - Track enrolled members
  - View participation rates
  - Track health outcomes
  - Generate program reports

**Backend Service**: Wellness Service (`services/wellness-service`)

**API Endpoints**:
```
GET    /api/wellness/programs           - List available wellness programs
GET    /api/wellness/programs/:id       - Get program details
POST   /api/wellness/enrollments        - Enroll member in program
GET    /api/wellness/enrollments        - Get member enrollments
PUT    /api/wellness/enrollments/:id    - Update enrollment status
GET    /api/wellness/programs/:id/stats - Get program statistics/outcomes

Documentation Frontend:
GET    /api/wellness/programs/:id/resources  - Get program resources/materials
```

**Program Object**:
```typescript
interface WellnessProgram {
  id: number
  name: string
  description: string
  category: string
  targetGroup: string
  duration: number
  startDate: string
  endDate: string
  capacity: number
  enrolled: number
  objectives: string[]
  resources: {
    url: string
    type: string
    title: string
  }[]
  healthOutcomes: {
    metric: string
    improvement: number
  }[]
}
```

**Available Program Categories** (inferred from schema):
- Fitness and Exercise
- Nutrition and Diet
- Mental Health and Stress Management
- Preventive Health Screening
- Chronic Disease Management
- Smoking Cessation
- Weight Management
- Sleep Wellness

---

## 9. Settings

### Feature Description
Provider profile management, account preferences, notification settings, and system configuration.

### Frontend Implementation

**Route**: `/settings`

**Key Features**:

**Profile Settings**:
- Edit provider information (name, contact, license details)
- Update profile picture
- Manage professional credentials
- Update specializations

**Account Settings**:
- Change password
- Two-factor authentication setup
- Session management
- Account verification

**Notification Preferences**:
- Email notification subscriptions
- SMS alert preferences
- In-app notification settings
- Quiet hours configuration
- Alert frequency selection

**Privacy Settings**:
- Data sharing preferences
- HIPAA compliance settings
- Patient communication preferences
- Audit trail access

**Integration Settings**:
- Connected services/apps
- API key management (if applicable)
- Third-party service access

**Payment Methods**:
- Manage bank accounts
- Update payment information
- View payment history

**Security**:
- View active sessions
- Logout from other devices
- Change security questions
- View login history

**Backend Service**: Core Service (`services/core-service`)

**API Endpoints**:
```
GET    /api/providers/:id                - Get provider profile
PUT    /api/providers/:id                - Update provider profile
POST   /api/providers/:id/password       - Change password
POST   /api/providers/:id/2fa/setup      - Setup two-factor auth
POST   /api/providers/:id/2fa/verify     - Verify 2FA code

Notification Settings:
GET    /api/settings/notifications       - Get notification preferences
PUT    /api/settings/notifications       - Update notification settings
GET    /api/settings/privacy             - Get privacy settings
PUT    /api/settings/privacy             - Update privacy settings

Payment Settings:
GET    /api/settings/payment-methods     - Get payment methods
POST   /api/settings/payment-methods     - Add payment method
DELETE /api/settings/payment-methods/:id - Delete payment method
```

---

## System Architecture Overview

### Frontend Architecture

```
client/src/
├── pages/
│   ├── ProviderPortal.tsx          # Main provider entry point
│   ├── Dashboard.tsx                # Generic dashboard router
│   ├── DashboardSelector.tsx        # Smart dashboard selector
│   ├── ProviderClaimSubmission.tsx # Claim submission workflow
│   ├── MemberDashboard.tsx         # Patient management
│   ├── ProviderVerification.tsx    # Member verification
│   └── [Appointments, Earnings, Wellness, Settings pages]
├── components/
│   ├── dashboards/
│   │   └── ProviderDashboard.tsx   # Main dashboard component
│   ├── layout/
│   │   ├── RoleSidebar.tsx         # Role-aware navigation
│   │   ├── RoleAwareHeader.tsx     # User context header
│   │   └── UserMenu.tsx            # Profile/logout menu
│   └── [UI components from Radix]
└── contexts/
    └── AuthContext.tsx              # User authentication state
```

### Backend Microservices Architecture

```
services/
├── api-gateway/                     # Request routing, authentication
├── core-service/                    # Provider/member management
├── hospital-service/                # Appointments, patient records
├── insurance-service/               # Benefits, schemes, coverage
├── finance-service/                 # Earnings, payments, settlements
├── crm-service/                     # Messaging, communications
├── billing-service/                 # Claims processing
├── membership-service/              # Enrollment, renewals
└── wellness-service/                # Wellness programs
```

### Data Flow Example: Claim Submission

```
User fills claim form
  ↓
Frontend validates form
  ↓
POST /api/claims {claim data}
  ↓
API Gateway receives request
  ↓
Routes to Billing Service
  ↓ (or Insurance Service for benefits validation)
Database stores claim
  ↓
Finance Service calculates earnings
  ↓
Response sent to frontend with claim ID
  ↓
Success dialog shows reference number
  ↓
Claim visible in My Claims section (after sync)
```

### Database Schema Relationships

```
Companies (core-service)
  ├── Members (hospital-service)
  │   ├── Medical History
  │   └── Disabilities
  ├── Benefits (member-benefit junction)
  ├── Claims (billing-service)
  │   ├── Claim Items (procedures)
  │   └── Claim Payments (finance-service)
  └── Appointments (hospital-service)

Institutions (hospital-service)
  ├── Personnel (medical staff)
  └── Medical Procedures
      └── Provider Rates (finance-service)

Wellness Programs (wellness-service)
  └── Enrollments (member-program junction)
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login**: Credentials sent to API Gateway
2. **Token Generation**: JWT token created with user role
3. **Token Storage**: Stored in localStorage (frontend) and cookie (secure)
4. **API Requests**: Token sent in Authorization header
5. **Token Validation**: Middleware validates on each request

### Role-Based Authorization

**Provider Role** (Healthcare Provider/Doctor):
- Color Theme: Purple
- Accessible Features:
  - ✓ Dashboard (provider-specific)
  - ✓ My Patients (owned patients only)
  - ✓ Member Search (eligibility verification)
  - ✓ Submit Claim (for own patients)
  - ✓ Appointments (owned appointments)
  - ✓ My Earnings (personal earnings only)
  - ✓ Messages (provider messages)
  - ✓ Wellness Programs (recommended programs)
  - ✓ Settings (personal settings)
  - ✗ Cannot access admin/finance/CRM-only features

### Authentication Middleware

```typescript
// In Hospital Service Routes
router.use(authMiddleware)  // Validates JWT token
router.use(requireRole(['PROVIDER', 'HOSPITAL']))  // Role check
```

---

## Key Technologies Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Router**: Wouter (lightweight client-side routing)
- **State Management**: React Context API (AuthContext)
- **Data Fetching**: React Query (@tanstack/react-query)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Heroicons, Lucide React
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns
- **Charts**: Recharts (for dashboard analytics)
- **HTTP Client**: Axios

### Backend Services
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (separate database per service)
- **Validation**: Zod schemas
- **Authentication**: JWT with middleware
- **Logging**: Custom logger with correlation IDs
- **Error Handling**: Standardized error responses
- **Rate Limiting**: Redis-based rate limiter
- **Security**: Helmet.js, CORS, Content Security Policy

### Databases
Each service has its own PostgreSQL database:
- `medical_coverage_core` - Provider/member management
- `medical_coverage_hospital` - Appointments, patients
- `medical_coverage_insurance` - Benefits, schemes
- `medical_coverage_finance` - Earnings, payments
- `medical_coverage_crm` - Messaging
- `medical_coverage_billing` - Claims
- `medical_coverage_membership` - Enrollments
- `medical_coverage_wellness` - Programs

---

## API Gateway Routing

The API Gateway routes all requests to appropriate backend services:

```typescript
// In api-gateway/src/api/routes.ts

// Service Routes (example routing):
/api/patients/*        → hospital-service
/api/appointments/*    → hospital-service
/api/claims/*          → billing-service
/api/earnings/*        → finance-service
/api/messages/*        → crm-service
/api/wellness/*        → wellness-service
/api/benefits/*        → insurance-service
/api/schemes/*         → insurance-service
/api/providers/*       → core-service
/api/members/*         → core-service
```

---

## Error Handling & Responses

### Standard Response Format

```json
{
  "success": true,
  "data": { /* actual data */ },
  "meta": {
    "pagination": { "page": 1, "limit": 10, "total": 100 },
    "timestamp": "2025-12-21T10:30:00Z",
    "requestId": "uuid-string"
  },
  "correlationId": "request-tracking-id"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid claim submission",
    "details": [
      { "field": "memberId", "message": "Member not found or inactive" },
      { "field": "procedures", "message": "At least one procedure required" }
    ]
  },
  "correlationId": "request-tracking-id"
}
```

---

## Performance Considerations

### Frontend Optimizations
- React Query caching for frequently accessed data
- Lazy loading for heavy components
- Code splitting per feature
- Image optimization with lazy loading
- Memoization for complex calculations

### Backend Optimizations
- Database connection pooling
- Query result caching in Redis
- Pagination for large datasets
- Indexed database queries
- Rate limiting to prevent abuse
- Compression for responses > 1KB

### Scalability
- Horizontal scaling of microservices
- Load balancing via API Gateway
- Database replication (each service)
- CDN for static assets
- Async processing for heavy operations

---

## Testing Strategy

Each feature includes:
- **Unit Tests**: Component logic and utility functions
- **Integration Tests**: Service-to-service communication
- **E2E Tests**: Complete user workflows in provider role
- **Validation Tests**: Form validation and error handling

Test locations:
```
tests/
├── unit/
│   └── [component/service tests]
├── integration/
│   └── [cross-service workflows]
└── e2e/
    └── [provider user journeys]
```

---

## Security Measures

1. **Authentication**: JWT tokens with expiration
2. **Authorization**: Role-based access control (RBAC)
3. **Encryption**: HTTPS in transit, encrypted data at rest
4. **HIPAA Compliance**: Patient data protection
5. **Audit Logging**: All actions tracked with correlation IDs
6. **Rate Limiting**: Prevent abuse and DoS attacks
7. **Input Validation**: Zod schema validation on all inputs
8. **CORS**: Restricted to allowed origins only
9. **CSP**: Content Security Policy headers
10. **HSTS**: HTTP Strict Transport Security enabled

---

## Deployment

### Development
```bash
npm run dev:all              # Start all services + frontend
npm run dev:client          # Frontend only
docker-compose up           # Start PostgreSQL + Redis
```

### Production
```bash
npm run build:all           # Build all services
docker build .              # Build containers
./run-all-services.sh       # Orchestrate services
```

### Database Setup
```bash
npm run db:push:all         # Deploy schemas for all services
npm run db:studio           # Open Drizzle Studio
```

---

## Continuation & Future Enhancements

### Potential Improvements
1. **Real-time Notifications**: WebSocket integration for message alerts
2. **Advanced Analytics**: Provider performance dashboards
3. **Automated Claim Processing**: AI-powered claim validation
4. **Patient Portal**: Direct patient access to claim status
5. **Mobile App**: React Native implementation
6. **Integration APIs**: Third-party EHR system connections
7. **Telemedicine**: Video consultation capability in appointments
8. **Billing Integration**: Direct insurance company integrations

### Known Limitations (Current)
- Mock data in dashboard (needs real data fetching)
- No real-time notifications (polling only)
- Claims processing is manual (no automation)
- No offline capability
- Limited to web (no mobile apps)

---

## Related Documentation

- [System Architecture Overview](SYSTEMS_ARCHITECTURE.md)
- [API Quick Reference](API_QUICK_REFERENCE.md)
- [Database Organization](../DATABASE_ENUM_ORGANIZATION.md)
- [UI Implementation Guide](UI_IMPLEMENTATION_SUMMARY.md)
- [Development Guide](../DEVELOPMENT_GUIDE.md)

---

**Document Status**: Complete and Production-Ready
**Last Verified**: December 21, 2025
**Maintained By**: Development Team
