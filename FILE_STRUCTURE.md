# Medical Coverage System - File Structure Documentation

**Last Updated**: 2025-12-01
**Version**: 3.0

---

## Table of Contents
1. [Overview](#overview)
2. [Backend Structure](#backend-structure)
3. [Frontend Structure](#frontend-structure)
4. [Database Schema](#database-schema)
5. [Shared Code](#shared-code)
6. [Configuration](#configuration)
7. [File Naming Conventions](#file-naming-conventions)
8. [Import Best Practices](#import-best-practices)

---

## Overview

The Medical Coverage System follows a modular, domain-driven architecture with clear separation between:
- **Backend** (`/server`) - Node.js/Express API server
- **Frontend** (`/client`) - React SPA with TypeScript
- **Shared** (`/shared`) - Shared types and database schema
- **Configuration** - Environment and module configurations

---

## Backend Structure

### Directory Organization

```
server/
├── api/                          # Domain-specific API routes
│   ├── crm/                     # CRM module routes (12 endpoints)
│   │   ├── leads.ts
│   │   ├── opportunities.ts
│   │   ├── activities.ts
│   │   ├── teams.ts
│   │   ├── analytics.ts
│   │   ├── agents.ts
│   │   ├── commission-tiers.ts
│   │   ├── performance-analytics.ts
│   │   ├── workflow-automation.ts
│   │   ├── task-automation.ts
│   │   ├── lead-scoring.ts
│   │   └── lead-nurturing.ts
│   ├── provider-contracts.ts
│   ├── provider-networks.ts
│   ├── provider-onboarding.ts
│   └── provider-performance.ts
│
├── config/                       # Configuration files
│   └── system-config.ts         # System-wide configuration
│
├── jobs/                         # Background job definitions
│   └── tokenJobs.ts             # Token system automation (9 jobs)
│
├── middleware/                   # Express middleware
│   ├── auth.ts                  # Authentication middleware
│   ├── documentUpload.ts        # File upload middleware
│   └── tokenPermissions.ts      # Token RBAC middleware
│
├── modules/                      # Modular finance system
│   ├── core/                    # Core module infrastructure
│   │   ├── BaseModule.ts
│   │   └── registry/
│   │       └── ModuleRegistry.ts
│   ├── billing/                 # Billing module
│   │   ├── BillingModule.ts
│   │   ├── config/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   ├── payments/                # Payments module
│   ├── commissions/             # Commissions module
│   ├── claims-financial/        # Claims financial module
│   ├── premium-calculation/     # Premium calculation engine
│   ├── documentation/           # Module documentation generator
│   ├── testing/                 # Module testing utilities
│   └── index.ts                 # Module loader
│
├── routes/                       # Main route definitions
│   ├── analytics.ts
│   ├── cardManagement.ts
│   ├── claimsProcessing.ts
│   ├── communication.ts
│   ├── corporate-members.ts
│   ├── finance.ts
│   ├── members.ts
│   ├── premiumCalculation.ts
│   ├── providerNetworks.ts
│   ├── riskAssessment.ts
│   ├── schemes.ts
│   ├── system-integration.ts
│   ├── tokens.ts                # Token system routes (27 endpoints)
│   └── wellnessIntegration.ts
│
├── services/                     # Business logic services (52 services)
│   ├── index.ts                 # ✨ Service exports (NEW)
│   │
│   ├── Token Management (8 services)
│   ├── tokenWalletService.ts
│   ├── tokenPackageService.ts
│   ├── tokenPurchaseService.ts
│   ├── tokenSubscriptionService.ts
│   ├── autoTopupService.ts
│   ├── tokenNotificationService.ts
│   ├── tokenAuditService.ts
│   └── tokenBillingIntegration.ts
│   │
│   ├── Financial Services (8 services)
│   ├── billingService.ts
│   ├── accountsReceivableService.ts
│   ├── billingNotificationService.ts
│   ├── paymentGatewayService.ts
│   ├── paymentReconciliationService.ts
│   ├── paymentNotificationService.ts
│   ├── financialCalculationService.ts
│   └── batchProcessingService.ts
│   │
│   ├── Commission Services (4 services)
│   ├── commissionService.ts
│   ├── commissionCalculationService.ts
│   ├── commissionPaymentService.ts
│   └── agentPerformanceService.ts
│   │
│   ├── Claims Services (10 services)
│   ├── claimsAdjudication.ts
│   ├── enhancedClaimsAdjudication.ts
│   ├── claimsProcessingWorkflow.ts
│   ├── claimsPaymentService.ts
│   ├── claimsAnalyticsService.ts
│   ├── claimsFinancialAnalysisService.ts
│   ├── claimReserveService.ts
│   ├── fraudDetectionEngine.ts
│   ├── medicalNecessityValidator.ts
│   └── eobGenerationService.ts
│   │
│   ├── Provider Services (6 services)
│   ├── providerNetworkService.ts
│   ├── providerPerformanceService.ts
│   ├── providerOnboardingService.ts
│   ├── contractService.ts
│   ├── providerSchemesFinalIntegration.ts
│   └── schemesProviderIntegration.ts
│   │
│   ├── Member Services (3 services)
│   ├── memberLifecycleService.ts
│   ├── schemesMemberIntegration.ts
│   └── eligibilityEngine.ts
│   │
│   ├── CRM Services (4 services)
│   ├── leadScoringService.ts
│   ├── leadNurturingService.ts
│   ├── taskAutomationService.ts
│   └── workflowAutomationService.ts
│   │
│   └── Other Services (9 services)
│       ├── premiumCalculationService.ts
│       ├── riskAssessmentService.ts
│       ├── wellnessIntegrationService.ts
│       ├── communicationService.ts
│       ├── notificationService.ts
│       ├── cardManagementService.ts
│       ├── complianceService.ts
│       └── schemesClaimsIntegration.ts
│
├── auth.ts                       # Authentication logic
├── backgroundScheduler.ts        # Job scheduler
├── db.ts                         # Database connection
├── databaseStorage.ts            # Database storage layer
├── emailService.ts               # Email service
├── index.ts                      # Main server entry point
├── routes.ts                     # Route registration (all routes)
└── storage.ts                    # Storage abstraction layer
```

### Service Organization

Services are organized by **functional domain**:

1. **Token Management** - Complete token purchasing system
2. **Financial Services** - Billing, payments, reconciliation
3. **Commission Services** - Agent commissions and performance
4. **Claims Services** - Claims processing and adjudication
5. **Provider Services** - Provider network management
6. **Member Services** - Member lifecycle and eligibility
7. **CRM Services** - Lead management and automation
8. **Other Services** - Cross-cutting concerns

**Import Pattern**:
```typescript
// Use the service index for cleaner imports
import {
  tokenPurchaseService,
  billingService,
  claimsAdjudication
} from './services';

// Instead of individual imports
import { tokenPurchaseService } from './services/tokenPurchaseService';
import { billingService } from './services/billingService';
```

---

## Frontend Structure

### Directory Organization

```
client/
├── public/                       # Static assets
├── src/
│   ├── api/                     # API client functions
│   │   ├── corporate-members.ts
│   │   ├── members.ts
│   │   ├── providers.ts
│   │   ├── schemes.ts
│   │   ├── system-integration.ts
│   │   └── tokens.ts           # Token system API client
│   │
│   ├── components/              # Reusable components
│   │   ├── admin/              # Admin components
│   │   ├── auth/               # Authentication components
│   │   ├── benefits/           # Benefits management
│   │   ├── cards/              # Card management
│   │   ├── claims/             # Claims processing
│   │   ├── communication/      # Communication center
│   │   ├── companies/          # Company management
│   │   ├── corporate/          # Corporate features
│   │   ├── crm/                # CRM components
│   │   │   ├── CRMDashboard.tsx
│   │   │   ├── CommissionTracker.tsx
│   │   │   ├── LeadDetailPanel.tsx
│   │   │   ├── SalesPipeline.tsx
│   │   │   └── WorkflowAutomationBuilder.tsx
│   │   ├── dashboard/          # Dashboard components
│   │   ├── dashboards/         # Role-specific dashboards
│   │   ├── dependents/         # Dependent management
│   │   ├── finance/            # Finance components
│   │   │   ├── FinanceDashboard.tsx
│   │   │   ├── TokenRevenueCard.tsx
│   │   │   ├── billing/
│   │   │   ├── claimsFinancial/
│   │   │   ├── commissions/
│   │   │   └── payments/
│   │   ├── layout/             # Layout components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── members/            # Member management
│   │   ├── onboarding/         # Member onboarding
│   │   ├── personalization/    # Personalization engine
│   │   ├── periods/            # Period management
│   │   ├── premiums/           # Premium management
│   │   ├── providers/          # Provider components
│   │   ├── regions/            # Region management
│   │   ├── schemes/            # Scheme management
│   │   ├── tokens/             # Token components
│   │   │   └── TokenWalletWidget.tsx
│   │   ├── ui/                 # UI primitives (shadcn/ui)
│   │   └── wellness/           # Wellness features
│   │
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx
│   │   └── FinanceContext.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── queryClient.ts
│   │   └── utils.ts
│   │
│   ├── pages/                  # Page components (35 pages)
│   │   ├── index.ts           # ✨ Page exports (NEW)
│   │   │
│   │   ├── Core Pages
│   │   ├── Dashboard.tsx
│   │   └── not-found.tsx
│   │   │
│   │   ├── Company & Member Management
│   │   ├── Companies.tsx
│   │   ├── CompanyDetail.tsx
│   │   ├── Members.tsx
│   │   ├── Dependents.tsx
│   │   └── MemberDashboard.tsx
│   │   │
│   │   ├── Financial Management
│   │   ├── Finance.tsx
│   │   ├── Premiums.tsx
│   │   └── Periods.tsx
│   │   │
│   │   ├── Benefits & Schemes
│   │   ├── Benefits.tsx
│   │   ├── SchemesManagement.tsx
│   │   └── ProviderSchemesManagement.tsx
│   │   │
│   │   ├── Claims Management
│   │   ├── Claims.tsx
│   │   ├── ClaimsManagement.tsx
│   │   └── ProviderClaimSubmission.tsx
│   │   │
│   │   ├── Provider Network
│   │   ├── ProviderNetworkManagement.tsx
│   │   ├── ProviderPortal.tsx
│   │   ├── ProviderVerification.tsx
│   │   └── ContractManagement.tsx
│   │   │
│   │   ├── Medical Panel
│   │   ├── MedicalInstitutions.tsx
│   │   ├── MedicalPersonnel.tsx
│   │   ├── PanelDocumentation.tsx
│   │   └── Regions.tsx
│   │   │
│   │   ├── Communication & Wellness
│   │   ├── Communication.tsx
│   │   ├── Wellness.tsx
│   │   └── RiskAssessment.tsx
│   │   │
│   │   ├── Token Management (5 pages)
│   │   └── tokens/
│   │       ├── TokenPurchasePage.tsx
│   │       ├── PurchaseHistoryPage.tsx
│   │       ├── BalanceHistoryPage.tsx
│   │       ├── SubscriptionManagementPage.tsx
│   │       └── TokenSettingsPage.tsx
│   │   │
│   │   └── CRM (2 pages)
│   │       └── crm/
│   │           ├── LeadManagement.tsx
│   │           └── AgentPortal.tsx
│   │
│   ├── services/               # Service layer
│   │   └── financeApi.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── finance.ts
│   │
│   ├── utils/                  # Utility functions
│   │   └── format.ts
│   │
│   ├── App.tsx                 # Main app component
│   ├── index.css               # Global styles
│   └── main.tsx                # React entry point
│
├── index.html                  # HTML template
├── package.json                # Dependencies
├── tsconfig.json              # TypeScript config
└── vite.config.ts             # Vite build config
```

### Page Organization

Pages are organized by **functional area** with subdirectories for complex domains:

- **Core** - Dashboard, 404
- **Company & Member Management** - Core insurance operations
- **Financial Management** - Finance, premiums, periods
- **Benefits & Schemes** - Benefit and scheme configuration
- **Claims Management** - Claims processing workflows
- **Provider Network** - Provider management and contracts
- **Medical Panel** - Medical institutions and personnel
- **Communication & Wellness** - Member engagement
- **Token Management** - Token purchasing system (subdirectory)
- **CRM** - Customer relationship management (subdirectory)

**Import Pattern**:
```typescript
// Use the page index for cleaner imports in App.tsx
import {
  Dashboard,
  TokenPurchasePage,
  LeadManagement
} from './pages';

// Instead of individual imports
import Dashboard from './pages/Dashboard';
import TokenPurchasePage from './pages/tokens/TokenPurchasePage';
```

---

## Database Schema

### Schema Organization

**File**: `shared/schema.ts` (4,756 lines, 292 tables/enums)

The schema is organized into logical sections with clear headers:

```typescript
// ===================
// CORE SYSTEM TABLES
// ===================
export const companies = pgTable('companies', { ... });
export const users = pgTable('users', { ... });
export const members = pgTable('members', { ... });
// ... more core tables

// ===================
// CRM MODULE TABLES
// ===================
export const leads = pgTable('leads', { ... });
export const opportunities = pgTable('opportunities', { ... });
export const activities = pgTable('activities', { ... });
// ... more CRM tables

// ============================================================================
// TOKEN MANAGEMENT SYSTEM TABLES
// ============================================================================
export const organizationTokenWallets = pgTable('organization_token_wallets', { ... });
export const tokenPurchases = pgTable('token_purchases', { ... });
export const tokenSubscriptions = pgTable('token_subscriptions', { ... });
// ... more token tables (9 total)

// ============================================================================
// FINANCE MODULE TABLES
// ============================================================================
export const invoices = pgTable('invoices', { ... });
export const payments = pgTable('payments', { ... });
// ... more finance tables

// ============================================================================
// CLAIMS PROCESSING TABLES
// ============================================================================
export const claims = pgTable('claims', { ... });
export const claimAdjudication = pgTable('claim_adjudication', { ... });
// ... more claims tables

// ============================================================================
// PROVIDER NETWORK TABLES
// ============================================================================
export const providerNetworks = pgTable('provider_networks', { ... });
export const providerContracts = pgTable('provider_contracts', { ... });
// ... more provider tables

// ========================================
// SCHEMES & BENEFITS TABLES
// ========================================
export const schemes = pgTable('schemes', { ... });
export const benefits = pgTable('benefits', { ... });
// ... more scheme tables
```

### Table Categories

1. **Core System** (~40 tables) - Companies, users, members, periods
2. **CRM Module** (~15 tables) - Leads, opportunities, activities
3. **Token Management** (9 tables) - Wallets, purchases, subscriptions
4. **Finance Module** (~30 tables) - Invoices, payments, commissions
5. **Claims Processing** (~50 tables) - Claims, adjudication, EOB
6. **Provider Network** (~25 tables) - Networks, contracts, performance
7. **Schemes & Benefits** (~40 tables) - Schemes, benefits, rules
8. **Wellness & Onboarding** (~20 tables) - Wellness programs, onboarding
9. **Card Management** (~15 tables) - Cards, production, verification
10. **Supporting Tables** (~48 tables) - Regions, documentation, analytics

### Enums Organization

Enums are defined before their corresponding tables:

```typescript
// Enums for Token System
export const tokenPurchaseTypeEnum = pgEnum('token_purchase_type', [...]);
export const tokenPurchaseStatusEnum = pgEnum('token_purchase_status', [...]);
export const subscriptionStatusEnum = pgEnum('subscription_status', [...]);

// Tables using the enums
export const tokenPurchases = pgTable('token_purchases', {
  purchaseType: tokenPurchaseTypeEnum('purchase_type'),
  status: tokenPurchaseStatusEnum('status'),
  ...
});
```

---

## Shared Code

```
shared/
├── schema.ts                    # Database schema (Drizzle ORM)
└── types.ts                     # Shared TypeScript types
```

The `shared/` directory contains code used by both frontend and backend:
- **schema.ts** - Single source of truth for database structure
- **types.ts** - Shared type definitions and interfaces

---

## Configuration

### Environment Configuration

```
.env.example                     # Environment variable template
.env                            # Local environment (gitignored)
```

### Build Configuration

```
client/
├── vite.config.ts              # Vite build configuration
├── vite.simple.config.ts       # Simplified Vite config
├── tsconfig.json               # TypeScript config (frontend)
└── tsconfig.node.json          # TypeScript config for build tools

server/
└── tsconfig.json               # TypeScript config (backend)

Root:
├── tsconfig.json               # Root TypeScript config
├── package.json                # Project dependencies
└── drizzle.config.ts           # Drizzle ORM configuration
```

---

## File Naming Conventions

### Backend Files

- **Services**: `camelCaseService.ts` (e.g., `tokenPurchaseService.ts`)
- **Routes**: `camelCase.ts` (e.g., `tokens.ts`, `cardManagement.ts`)
- **Middleware**: `camelCase.ts` (e.g., `auth.ts`, `tokenPermissions.ts`)
- **Jobs**: `camelCaseJobs.ts` (e.g., `tokenJobs.ts`)
- **Modules**: `PascalCaseModule.ts` (e.g., `BillingModule.ts`)

### Frontend Files

- **Components**: `PascalCase.tsx` (e.g., `TokenWalletWidget.tsx`)
- **Pages**: `PascalCase.tsx` (e.g., `TokenPurchasePage.tsx`)
- **Contexts**: `PascalCaseContext.tsx` (e.g., `AuthContext.tsx`)
- **Hooks**: `use-kebab-case.tsx` (e.g., `use-mobile.tsx`)
- **Utils**: `camelCase.ts` (e.g., `format.ts`, `queryClient.ts`)
- **API Clients**: `kebab-case.ts` (e.g., `tokens.ts`, `corporate-members.ts`)

### Database Files

- **Schema**: `schema.ts` (singular, lowercase)
- **Types**: `types.ts` (singular, lowercase)
- **Migrations**: Generated by Drizzle (timestamped)

---

## Import Best Practices

### Use Index Files

```typescript
// ✅ GOOD - Use index exports
import { tokenPurchaseService, billingService } from '@/services';
import { TokenPurchasePage, LeadManagement } from '@/pages';

// ❌ BAD - Direct imports everywhere
import { tokenPurchaseService } from '@/services/tokenPurchaseService';
import { billingService } from '@/services/billingService';
import TokenPurchasePage from '@/pages/tokens/TokenPurchasePage';
```

### Use Path Aliases

```typescript
// ✅ GOOD - Use @ alias
import { Button } from '@/components/ui/button';
import { tokenPurchaseService } from '@/services';

// ❌ BAD - Relative paths
import { Button } from '../../../components/ui/button';
import { tokenPurchaseService } from '../../services/tokenPurchaseService';
```

### Group Imports Logically

```typescript
// External dependencies
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Internal UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Internal services/APIs
import { tokensAPI } from '@/api/tokens';

// Local components
import { TokenWalletWidget } from '../components/TokenWalletWidget';
```

---

## Directory Statistics

### Backend
- **Services**: 52 files
- **Routes**: 27 files (including API subdirectories)
- **Middleware**: 3 files
- **Jobs**: 1 file
- **Modules**: 15+ files across 6 modules

### Frontend
- **Pages**: 35 files
- **Components**: 100+ files across 25+ subdirectories
- **API Clients**: 6 files
- **Contexts**: 2 files
- **Hooks**: 2 files

### Database
- **Tables**: 292 total (tables + enums)
- **Schema File**: 4,756 lines

---

## Maintenance Guidelines

### Adding New Features

1. **Backend Service**:
   - Create service in `server/services/`
   - Add export to `server/services/index.ts`
   - Create route in `server/routes/` or `server/api/`
   - Register route in `server/routes.ts`

2. **Frontend Page**:
   - Create page in `client/src/pages/` (or subdirectory)
   - Add export to `client/src/pages/index.ts`
   - Register route in `client/src/App.tsx`
   - Add navigation link in `client/src/components/layout/Sidebar.tsx`

3. **Database Table**:
   - Add table to appropriate section in `shared/schema.ts`
   - Add section header if starting new domain
   - Define enums before tables that use them
   - Run `npm run db:push` to migrate

### Code Organization Rules

1. **One concern per file** - Each file should have a single responsibility
2. **Group by domain** - Related files should be in the same directory
3. **Use subdirectories** - When a domain has 5+ files, create a subdirectory
4. **Export via index** - Use index files for cleaner imports
5. **Consistent naming** - Follow the conventions above
6. **Document sections** - Use comment headers in large files

---

## Related Documentation

- **TOKEN_SYSTEM_DEPLOYMENT.md** - Token system deployment guide
- **FINANCE_INTEGRATION_SUMMARY.md** - Finance integration details
- **DEPLOYMENT_CHECKLIST.md** - Production deployment checklist
- **ERROR_CHECK_SUMMARY.md** - Code quality verification

---

**File Structure Version**: 3.0
**Last Updated**: 2025-12-01
**Maintained By**: Development Team
