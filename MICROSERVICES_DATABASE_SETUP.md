# Microservices Database Setup Guide

## 🏗️ **Microservices Architecture Overview**

This medical coverage system has been architected into 8 independent microservices, each with its own dedicated Neon PostgreSQL database. This design ensures scalability, maintainability, and service isolation.

### **Service Architecture Benefits:**
- **Independent Scaling**: Each service can scale based on its specific load requirements
- **Technology Flexibility**: Services can use different technologies if needed
- **Fault Isolation**: Issues in one service don't cascade to others
- **Team Autonomy**: Development teams can work independently on different services
- **Data Sovereignty**: Each service owns its data domain completely

---

## 📊 **Microservices & Databases**

### 1. **Core Service** - Member & Company Management
**Database**: `medical-coverage-core`  
**Purpose**: Central member registry, company management, and core business entities

**Key Tables:**
- `companies` - Company/employer information
- `members` - Individual member records
- `periods` - Coverage periods
- `company_periods` - Company coverage periods
- `member_documents` - Member documentation
- `onboarding_sessions` - Member onboarding workflow
- `member_cards` - Physical/digital member cards
- `card_templates` - Card design templates

### 2. **CRM Service** - Sales & Commission Management
**Database**: `medical-coverage-crm`  
**Purpose**: Sales pipeline, agent management, and commission calculations

**Key Tables:**
- `leads` - Sales leads and prospects
- `sales_opportunities` - Sales pipeline opportunities
- `agents` - Sales agents and representatives
- `commission_tiers` - Commission structure definitions
- `commission_transactions` - Commission payments and calculations
- `agent_performance` - Agent performance metrics
- `sales_teams` - Team organization and territories

### 3. **Claims Service** - Claims Processing & Adjudication
**Database**: `medical-coverage-claims`  
**Purpose**: Medical claims processing, fraud detection, and benefit adjudication

**Key Tables:**
- `claims` - Medical claims submissions
- `diagnosis_codes` - Medical diagnosis classifications
- `claim_adjudication_results` - Claims approval/denial decisions
- `medical_necessity_validations` - Clinical necessity assessments
- `fraud_detection_results` - Fraud analysis outcomes
- `explanation_of_benefits` - EOB documents for members
- `benefit_utilization` - Benefit usage tracking

### 4. **Providers Service** - Healthcare Provider Network
**Database**: `medical-coverage-providers`  
**Purpose**: Healthcare provider management, network administration, and contracts

**Key Tables:**
- `providers` - Healthcare provider organizations
- `medical_institutions` - Hospitals, clinics, and facilities
- `provider_networks` - Provider network definitions
- `provider_network_assignments` - Network membership assignments
- `provider_contracts` - Provider contract agreements
- `medical_personnel` - Individual healthcare professionals
- `provider_network_assignments` - Network participation records

### 5. **Finance Service** - Billing & Payment Processing
**Database**: `medical-coverage-finance`  
**Purpose**: Premium billing, claims payments, and financial transactions

**Key Tables:**
- `payment_transactions` - All payment processing records
- `premium_invoices` - Premium billing invoices
- `financial_accounts` - Bank and financial accounts
- `general_ledger_entries` - Accounting ledger entries
- `commission_payments` - Commission disbursements
- `financial_reports` - Financial reporting data

### 6. **Tokens Service** - Digital Wallet Management
**Database**: `medical-coverage-tokens`  
**Purpose**: Digital token wallets, subscriptions, and balance management

**Key Tables:**
- `organization_token_wallets` - Organization wallet accounts
- `token_packages` - Token package definitions
- `token_purchases` - Token purchase transactions
- `token_subscriptions` - Recurring token subscriptions
- `auto_topup_policies` - Automatic token replenishment
- `token_balance_history` - Balance change history
- `token_usage_forecasts` - Usage prediction data

### 7. **Schemes Service** - Benefits & Coverage Plans
**Database**: `medical-coverage-schemes`  
**Purpose**: Insurance scheme definitions, benefits configuration, and pricing

**Key Tables:**
- `insurance_schemes` - Insurance scheme definitions
- `scheme_benefits` - Benefit coverage details
- `scheme_networks` - Network coverage rules
- `scheme_riders` - Additional coverage options
- `scheme_pricing` - Age/gender-based pricing
- `scheme_versions` - Scheme version control
- `scheme_eligibility_rules` - Eligibility criteria

### 8. **Analytics Service** - Reporting & Business Intelligence
**Database**: `medical-coverage-analytics`  
**Purpose**: Business analytics, reporting, dashboards, and predictive insights

**Key Tables:**
- `analytics_metrics` - Metric definitions
- `metric_data` - Time-series metric data
- `reports` - Report definitions and schedules
- `report_executions` - Report run history
- `dashboards` - Dashboard configurations
- `dashboard_widgets` - Dashboard component definitions
- `alerts` - Automated alert configurations
- `alert_instances` - Alert trigger history
- `predictive_models` - ML model definitions and results

---

## 🚀 **Setup Instructions**

### **Prerequisites:**
- Neon account with PostgreSQL databases
- Node.js 18+ and npm
- Vercel account (for deployment)

### **Step 1: Create Neon Databases**

Create 8 separate databases in your Neon project:

```bash
# Create databases via Neon Console or CLI
# Database names should match exactly:
medical-coverage-core
medical-coverage-crm
medical-coverage-claims
medical-coverage-providers
medical-coverage-finance
medical-coverage-tokens
medical-coverage-schemes
medical-coverage-analytics
```

### **Step 2: Configure Environment Variables**

Update your `.env` file with the database connection strings:

```bash
# Core Service Database
CORE_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-core?sslmode=require

# CRM Service Database
CRM_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-crm?sslmode=require

# Claims Service Database
CLAIMS_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-claims?sslmode=require

# Providers Service Database
PROVIDER_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-providers?sslmode=require

# Finance Service Database
FINANCE_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-finance?sslmode=require

# Tokens Service Database
TOKEN_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-tokens?sslmode=require

# Schemes Service Database
SCHEMES_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-schemes?sslmode=require

# Analytics Service Database
ANALYTICS_DATABASE_URL=postgresql://[user]:[password]@[host]/medical-coverage-analytics?sslmode=require
```

### **Step 3: Deploy Database Schemas**

Run migrations for each service using the appropriate database URL:

```bash
# Core Service
CORE_DATABASE_URL="postgresql://..." npm run db:push

# CRM Service
CRM_DATABASE_URL="postgresql://..." npm run db:push

# Claims Service
CLAIMS_DATABASE_URL="postgresql://..." npm run db:push

# Providers Service
PROVIDER_DATABASE_URL="postgresql://..." npm run db:push

# Finance Service
FINANCE_DATABASE_URL="postgresql://..." npm run db:push

# Tokens Service
TOKEN_DATABASE_URL="postgresql://..." npm run db:push

# Schemes Service
SCHEMES_DATABASE_URL="postgresql://..." npm run db:push

# Analytics Service
ANALYTICS_DATABASE_URL="postgresql://..." npm run db:push
```

### **Step 4: Verify Setup**

Test database connections for each service:

```bash
# Test all connections
npm run test:connections

# Or test individual services
CORE_DATABASE_URL="postgresql://..." npm run test:db-connection
```

---

## 🔗 **Service Interconnections**

```
┌─────────────────┐    ┌─────────────────┐
│   Core Service  │◄──►│   CRM Service   │
│  (Members)      │    │   (Sales)       │
│                 │    │                 │
│ • Members       │    │ • Agents        │
│ • Companies     │    │ • Commissions   │
│ • Cards         │    │ • Leads         │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Claims Service  │◄──►│Provider Service │
│ (Processing)    │    │ (Networks)      │
│                 │    │                 │
│ • Claims        │    │ • Providers     │
│ • Adjudication  │    │ • Networks      │
│ • EOBs          │    │ • Contracts     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│Finance Service  │◄──►│Schemes Service │
│ (Billing)       │    │ (Benefits)      │
│                 │    │                 │
│ • Payments      │    │ • Schemes       │
│ • Invoices      │    │ • Benefits      │
│ • Ledger        │    │ • Pricing       │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Token Service   │◄──►│Analytics Service│
│ (Wallets)       │    │  (Reporting)    │
│                 │    │                 │
│ • Wallets       │    │ • Metrics       │
│ • Balances      │    │ • Reports       │
│ • Transactions  │    │ • Dashboards    │
└─────────────────┘    └─────────────────┘
```

### **Cross-Service Data Flow:**
- **Core → CRM**: Member data for sales targeting
- **Core → Claims**: Member eligibility verification
- **Providers → Claims**: Network coverage validation
- **Schemes → Claims**: Benefit coverage rules
- **Finance → All**: Payment processing and billing
- **Analytics → All**: Cross-service reporting and insights

---

## 📁 **Schema Files Structure**

All database schemas are defined in TypeScript with full type safety:

```
shared/schemas/
├── core.ts          # Member & company management
├── crm.ts           # Sales & commission management
├── claims.ts        # Claims processing & adjudication
├── providers.ts     # Healthcare provider networks
├── finance.ts       # Billing & payment processing
├── tokens.ts        # Digital wallet management
├── schemes.ts       # Benefits & coverage plans
└── analytics.ts     # Reporting & business intelligence
```

Each schema file includes:
- **Table Definitions**: Drizzle ORM table schemas
- **TypeScript Types**: Inferred types for type safety
- **Zod Validation**: Runtime data validation schemas
- **Foreign Key Relationships**: Cross-table references
- **Enums**: Domain-specific enumerated values

---

## 🔧 **Development Workflow**

### **Adding New Tables:**
1. Update the appropriate schema file in `shared/schemas/`
2. Run migrations: `npm run db:push`
3. Update TypeScript interfaces in service code
4. Test database operations

### **Modifying Existing Tables:**
1. Update schema definitions
2. Create migration scripts if needed
3. Update dependent code
4. Run tests to ensure compatibility

### **Service Communication:**
- Use REST APIs for synchronous communication
- Use message queues for asynchronous operations
- Implement circuit breakers for resilience
- Use API gateways for cross-service requests

---

## 📈 **Performance & Scaling Considerations**

### **Database Optimization:**
- **Indexing Strategy**: Primary keys, foreign keys, and frequently queried columns
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Use EXPLAIN ANALYZE for performance tuning
- **Partitioning**: Time-based partitioning for large tables

### **Service Scaling:**
- **Horizontal Scaling**: Multiple instances per service
- **Load Balancing**: Distribute requests across instances
- **Caching**: Redis for session and frequently accessed data
- **CDN**: Static asset delivery optimization

### **Monitoring:**
- **Database Metrics**: Query performance, connection counts, disk usage
- **Application Metrics**: Response times, error rates, throughput
- **Business Metrics**: Claims processing time, payment success rates
- **Health Checks**: Automated monitoring and alerting

---

## 🔒 **Security Considerations**

### **Database Security:**
- **SSL/TLS**: Encrypted connections required
- **Access Control**: Least privilege principle
- **Audit Logging**: All data changes tracked
- **Data Encryption**: Sensitive data encrypted at rest

### **Service Security:**
- **Authentication**: JWT tokens with refresh mechanisms
- **Authorization**: Role-based access control (RBAC)
- **API Security**: Rate limiting, input validation, CORS
- **Secrets Management**: Environment variables, no hardcoded secrets

---

## 🧪 **Testing Strategy**

### **Database Testing:**
- **Unit Tests**: Schema validation and constraints
- **Integration Tests**: Cross-service data flow
- **Migration Tests**: Schema changes and data integrity
- **Performance Tests**: Query optimization validation

### **Service Testing:**
- **API Tests**: Endpoint functionality and error handling
- **Load Tests**: Scalability and performance validation
- **Chaos Tests**: Fault tolerance and resilience testing

---

## 📚 **Additional Resources**

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Guide](https://orm.drizzle.team)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

---

*Last Updated: December 19, 2025*  
*Microservices Database Setup v2.0*