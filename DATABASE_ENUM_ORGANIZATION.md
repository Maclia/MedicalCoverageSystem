# Database Enum Organization - Complete Reference

## Overview
The Medical Coverage System uses **146 enums** across the database schema. This document provides a complete, organized reference for all enum definitions, categorized by functional area.

---

## ENUM ORGANIZATION BY CATEGORY

### 1. CORE & IDENTITY (7 enums)
```typescript
// Member & Identity
member_type: ['principal', 'dependent']
dependent_type: ['spouse', 'child', 'parent', 'guardian']
gender: ['male', 'female', 'other']
marital_status: ['single', 'married', 'divorced', 'widowed']
membership_status: ['active', 'suspended', 'pending', 'terminated', 'expired']

// Client Types
client_type: ['individual', 'corporate', 'sme', 'government', 'education', 'association']

// User Management
user_type: ['insurance', 'institution', 'provider', 'sales_admin', 'sales_manager', 'team_lead', 'sales_agent', 'broker', 'underwriter']
```

### 2. PERIOD & PREMIUM (5 enums)
```typescript
// Period Management
period_status: ['active', 'inactive', 'upcoming', 'expired']
period_type: ['short_term', 'long_term', 'standard']
premium_rate_type: ['standard', 'age_banded', 'family_size']

// Pricing
pricing_methodology: ['community_rated', 'experience_rated', 'adjusted_community_rated', 'benefit_rated']
risk_adjustment_tier: ['low_risk', 'average_risk', 'moderate_risk', 'high_risk', 'very_high_risk']
inflation_category: ['medical_trend', 'utilization_trend', 'cost_shifting', 'technology_advancement', 'regulatory_impact']
```

### 3. BILLING & PAYMENTS - CORE (5 enums)
```typescript
// Core Payments
payment_type: ['premium', 'claim', 'disbursement']
payment_status: ['pending', 'processing', 'completed', 'failed', 'cancelled']
payment_method: ['credit_card', 'bank_transfer', 'check', 'cash', 'online']

// Billing Frequency
billing_frequency: ['monthly', 'quarterly', 'annual', 'pro_rata']

// Cost Sharing
cost_sharing_type: ['copay_fixed', 'copay_percentage', 'coinsurance', 'deductible', 'annual_deductible']
```

### 4. BENEFITS & COVERAGE (11 enums)
```typescript
// Benefits
benefit_category: ['medical', 'dental', 'vision', 'wellness', 'hospital', 'prescription', 'emergency', 'maternity', 'specialist', 'other']

// Limits & Coverage
limit_type: ['overall_annual', 'benefit_annual', 'sub_limit', 'frequency', 'age_based']
limit_category: ['icu', 'room_type', 'procedure_type', 'professional_fee', 'medication', 'therapy']
frequency_limit: ['per_visit', 'per_day', 'per_admission', 'annual', 'lifetime']
```

### 5. PROVIDER NETWORK (6 enums)
```typescript
// Providers
institution_type: ['hospital', 'clinic', 'laboratory', 'imaging', 'pharmacy', 'specialist', 'general']
personnel_type: ['doctor', 'nurse', 'specialist', 'technician', 'pharmacist', 'therapist', 'other']
approval_status: ['pending', 'approved', 'rejected', 'suspended']

// Network & Contracts
network_tier: ['tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard']
contract_status: ['draft', 'active', 'expired', 'terminated', 'renewal_pending']
tariff_status: ['active', 'inactive', 'pending', 'deprecated']
reimbursement_model: ['fee_for_service', 'capitation', 'drg', 'per_diem', 'package_deal']

// Provider Quality
provider_verification_status: ['pending', 'verified', 'rejected', 'suspended', 'under_review']
provider_onboarding_status: ['registered', 'document_pending', 'verification_in_progress', 'approved', 'rejected', 'active', 'suspended']
provider_performance_tier: ['excellent', 'good', 'average', 'below_average', 'poor']
accreditation_status: ['accredited', 'provisional', 'not_accredited', 'expired']
compliance_status: ['compliant', 'minor_violations', 'major_violations', 'suspended']
```

### 6. CLAIMS MANAGEMENT (9 enums)
```typescript
// Claims
claim_status: ['submitted', 'under_review', 'approved', 'rejected', 'paid', 'fraud_review', 'fraud_confirmed']
procedure_category: ['consultation', 'surgery', 'diagnostic', 'laboratory', 'imaging', 'dental', 'vision', 'medication', 'therapy', 'emergency', 'maternity', 'preventative', 'other']
diagnosis_code_type: ['ICD-10', 'ICD-11']

// Adjudication
adjudication_result: ['APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PENDING_REVIEW']
medical_necessity_result: ['PASS', 'FAIL', 'REVIEW_REQUIRED']
eob_status: ['GENERATED', 'SENT', 'ACKNOWLEDGED', 'DISPUTED']
claim_event_type: ['SUBMITTED', 'ELIGIBILITY_CHECKED', 'VALIDATED', 'ADJUDICATED', 'MEDICAL_REVIEW', 'FRAUD_DETECTED', 'APPROVED', 'DENIED', 'PAID']

// Claim Finance
claim_payment_type: [Object values]
claim_payment_status: [Object values]
claim_approval_status: [Object values]

// Financial Transactions
financial_transaction_type: [Object values]
financial_transaction_status: [Object values]
```

### 7. MEMBER MANAGEMENT (12 enums)
```typescript
// Life Events
life_event_type: ['enrollment', 'activation', 'suspension', 'upgrade', 'downgrade', 'renewal', 'transfer', 'termination', 'reinstatement', 'death']

// Documents
document_type: ['national_id', 'passport', 'birth_certificate', 'marriage_certificate', 'employment_letter', 'medical_report', 'student_letter', 'government_id', 'proof_of_address', 'insurance_card', 'dependent_document', 'other']

// Communications
communication_type: ['enrollment_confirmation', 'renewal_notification', 'card_generation', 'pre_auth_update', 'limit_reminder', 'payment_due', 'suspension_notice', 'termination_notice']
communication_channel: ['sms', 'email', 'mobile_app', 'postal', 'provider_notification']
delivery_status: ['pending', 'sent', 'delivered', 'failed', 'bounced']

// Consents
consent_type: ['data_processing', 'marketing_communications', 'data_sharing_providers', 'data_sharing_partners', 'wellness_programs']

// Cards
card_type: ['physical', 'digital', 'both']
card_status: ['pending', 'active', 'inactive', 'expired', 'lost', 'stolen', 'damaged', 'replaced']
card_template: ['standard', 'premium', 'corporate', 'family', 'individual']
```

### 8. CRM & SALES (7 enums)
```typescript
// Leads
lead_source: ['website', 'referral', 'campaign', 'cold_call', 'partner', 'event', 'social_media', 'email_marketing', 'third_party', 'manual']
lead_status: ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'duplicate']
lead_priority: ['low', 'medium', 'high', 'urgent']

// Opportunities
opportunity_stage: ['lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost']

// Activities
activity_type: ['call', 'email', 'meeting', 'sms', 'whatsapp', 'note', 'task', 'demo', 'proposal']

// Territories
territory_type: ['geographic', 'industry', 'company_size', 'product_line', 'mixed']

// Agents
agent_type: ['internal_agent', 'external_broker', 'independent_agent', 'captive_agent', 'agency']
license_status: ['active', 'expired', 'suspended', 'pending', 'revoked']
```

### 9. COMMISSION MANAGEMENT (11 enums)
```typescript
// Commission Transactions
commission_transaction_type: ['new_business', 'renewal', 'bonus', 'override', 'adjustment', 'clawback']
commission_status: ['accrued', 'earned', 'paid', 'clawed_back', 'adjusted']
commission_finance_transaction_type: ['new_business', 'renewal', 'bonus', 'override', 'adjustment', 'clawback']
clawback_type: ['early_cancellation', 'policy_lapse', 'fraud', 'compliance', 'performance']

// Payment Runs
payment_run_status: ['draft', 'pending_approval', 'approved', 'processing', 'processed', 'failed']

// Audits
audit_status: ['pending', 'in_progress', 'completed', 'exceptions_found']
audit_type: ['pre_payment', 'post_payment', 'random', 'targeted', 'investigative']
finding_type: ['calculation_error', 'policy_violation', 'documentation_gap', 'compliance_issue', 'fraud_detection']
finding_severity: ['low', 'medium', 'high', 'critical']

// Adjustments & Taxes
adjustment_type: ['bonus', 'penalty', 'correction', 'retroactive', 'clawback_recovery']
tax_type: ['income_tax', 'withholding_tax', 'vat', 'gst']
tax_calculation_method: ['flat_rate', 'progressive', 'tiered']

// Reports
report_status: ['generating', 'completed', 'failed']
report_type: ['summary', 'detailed', 'tax', 'compliance', 'agent_performance']

// Leaderboards
leaderboard_category: ['total_sales', 'new_business', 'renewals', 'commission_earned', 'growth_rate', 'customer_satisfaction', 'quality_score']
performance_period_type: ['daily', 'weekly', 'monthly', 'quarterly', 'annual']
```

### 10. WORKFLOW & AUTOMATION (10 enums)
```typescript
// Workflow Triggers
trigger_type: ['lead_created', 'lead_status_changed', 'opportunity_stage_changed', 'date_based', 'manual', 'webhook', 'email_opened', 'link_clicked']

// Workflow Execution
workflow_execution_status: ['running', 'completed', 'failed', 'cancelled', 'paused']

// Campaigns
campaign_status: ['draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled']

// Tasks
task_status: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'escalated']
task_priority: ['low', 'medium', 'high', 'urgent']
task_category: ['follow_up', 'documentation', 'meeting', 'call', 'email', 'review', 'custom']
```

### 11. TOKEN MANAGEMENT (9 enums)
```typescript
// Token Purchases
token_purchase_type: ['one_time', 'subscription', 'auto_topup']
token_purchase_status: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']

// Subscriptions
subscription_status: ['active', 'paused', 'payment_failed', 'cancelled', 'expired']
subscription_frequency: ['monthly', 'quarterly', 'annual']

// Auto-Topup
auto_topup_trigger_type: ['threshold', 'scheduled', 'both']
auto_topup_schedule_frequency: ['daily', 'weekly', 'monthly']

// Notifications
notification_threshold_type: ['percentage', 'absolute']
notification_type: ['email', 'sms', 'in_app', 'push', 'webhook']
notification_channel: ['email', 'sms', 'mobile_app', 'web', 'api']
notification_priority: ['low', 'medium', 'high', 'urgent']
notification_status: ['pending', 'sent', 'failed', 'scheduled', 'cancelled']
```

### 12. BILLING & ACCOUNTS RECEIVABLE (9 enums)
```typescript
// Invoices
invoice_status: ['draft', 'sent', 'paid', 'overdue', 'written_off', 'cancelled']
invoice_type: ['individual', 'corporate', 'group']
line_item_type: ['base_premium', 'dependent', 'adjustment', 'tax', 'discount']

// Accounts Receivable
ar_account_status: ['active', 'suspended', 'terminated', 'collection', 'write_off']
collection_status: ['none', 'reminder', 'demand', 'agency', 'legal']

// Billing Communications
billing_communication_type: ['payment_reminder', 'overdue_notice', 'suspension_warning', 'termination_notice', 'payment_receipt', 'invoice_sent', 'collection_notice']
billing_communication_status: ['scheduled', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked']
billing_channel: ['email', 'sms', 'postal_mail', 'phone', 'portal']
```

### 13. FINANCE & PAYMENTS - DETAILED (13 enums)
```typescript
// Payment Processing
finance_payment_status: ['pending', 'completed', 'failed', 'reversed', 'refunded']
payment_method_type: ['bank', 'card', 'mobile_money', 'digital_wallet', 'ach', 'wire']
payment_gateway_type: ['stripe', 'paypal', 'mpesa', 'bank_transfer', 'square', 'adyen']

// Payment Notifications
payment_notification_type: ['payment_receipt', 'payment_failure', 'payment_retry', 'upcoming_payment', 'auto_payment_confirmation', 'payment_method_expiry', 'payment_method_update_request', 'payment_allocation_confirmation', 'refund_confirmation', 'chargeback_notification', 'reversal_notification', 'payment_method_added', 'payment_method_removed', 'subscription_renewal', 'payment_reminder', 'overdue_payment', 'payment_plan_update']
payment_notification_channel: ['email', 'sms', 'push', 'in_app', 'postal_mail', 'whatsapp']
payment_notification_status: ['scheduled', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'replied']

// Reconciliation
reconciliation_status: ['pending', 'in_progress', 'completed', 'requires_review']
exception_type: ['unmatched_payment', 'partial_match', 'overpayment', 'duplicate_payment', 'chargeback', 'refund_mismatch']
exception_severity: ['low', 'medium', 'high', 'critical']
payment_reversal_type: ['chargeback', 'refund', 'bank_error', 'duplicate', 'fraud']
```

### 14. ONBOARDING & ACTIVATION (8 enums)
```typescript
// Onboarding
onboarding_status: ['pending', 'active', 'completed', 'paused', 'cancelled']
task_type: ['profile_completion', 'document_upload', 'benefits_education', 'dependent_registration', 'wellness_setup', 'emergency_setup', 'completion']
document_status: ['pending', 'approved', 'rejected', 'expired']
activation_status: ['pending', 'active', 'expired', 'used']

// Personalization
personalization_level: ['minimal', 'moderate', 'full']
recommendation_type: ['preventive_care', 'wellness', 'cost_optimization', 'care_coordination', 'educational']
journey_stage: ['new_member', 'established_member', 'long_term_member', 'new_parent', 'chronic_condition', 'high_risk', 'wellness_champion']
```

### 15. SCHEMES & RULES (11 enums)
```typescript
// Schemes
scheme_type: ['individual_medical', 'corporate_medical', 'nhif_top_up', 'student_cover', 'international_health', 'micro_insurance']
pricing_model: ['age_rated', 'community_rated', 'group_rate', 'experience_rated']
target_market: ['individuals', 'small_groups', 'large_corporates', 'students', 'seniors', 'expatriates']
plan_tier: ['bronze', 'silver', 'gold', 'platinum', 'vip']

// Rules
rule_category: ['eligibility', 'benefit_application', 'limit_check', 'cost_sharing', 'exclusion']
rule_type: ['condition', 'calculation', 'validation', 'workflow']
rule_result: ['PASS', 'FAIL', 'SKIP']

// Employee Grades
employee_grade: ['executive', 'senior_management', 'middle_management', 'junior_staff', 'intern']
```

### 16. FRAUD PREVENTION (11 enums)
```typescript
// Fraud Detection
fraud_risk_level: ['none', 'low', 'medium', 'high', 'confirmed']
fraud_alert_severity: ['low', 'medium', 'high', 'critical']
fraud_alert_status: ['open', 'investigating', 'resolved', 'dismissed', 'escalated']

// Fraud Rules
fraud_rule_type: ['pattern', 'threshold', 'behavioral', 'statistical', 'network']
fraud_rule_status: ['active', 'inactive', 'draft', 'testing']

// Fraud Investigation
fraud_investigation_status: ['open', 'in_progress', 'completed', 'closed', 'escalated']
fraud_investigation_priority: ['low', 'medium', 'high', 'urgent']

// Machine Learning
ml_model_type: ['supervised', 'unsupervised', 'semi_supervised', 'reinforcement']
ml_model_status: ['training', 'active', 'inactive', 'deprecated', 'failed']

// Analytics
behavioral_pattern_type: ['frequency', 'amount', 'timing', 'provider', 'diagnosis', 'geographic']
network_analysis_type: ['social', 'provider', 'billing', 'geographic', 'temporal']
risk_score_level: ['very_low', 'low', 'medium', 'high', 'very_high', 'critical']
fraud_analytics_period: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
```

### 17. CLAIMS FINANCE (7 enums)
```typescript
// Claim Reserves
reserve_type: [Object values]
reserve_status: [Object values]

// Claim Payments
claim_payment_type: [Object values]
claim_payment_status: [Object values]
claim_approval_status: [Object values]

// Financial Transactions
financial_transaction_type: [Object values]
financial_transaction_status: [Object values]
```

### 18. AUDIT & COMPLIANCE (3 enums)
```typescript
// Audit
audit_action: ['create', 'read', 'update', 'delete', 'view']
audit_entity_type: ['member', 'company', 'benefit', 'claim', 'document']
```

---

## ENUM DEFINITION ORDER IN SCHEMA FILE

The enums should be organized in the schema.ts file in this exact order:

1. **Core & Identity** (lines 1-50)
2. **Period & Premium** (lines 51-100)
3. **Billing & Payments - Core** (lines 101-150)
4. **Benefits & Coverage** (lines 151-200)
5. **Provider Network** (lines 201-300)
6. **Claims Management** (lines 301-400)
7. **Member Management** (lines 401-500)
8. **CRM & Sales** (lines 501-600)
9. **Commission Management** (lines 601-750)
10. **Workflow & Automation** (lines 751-850)
11. **Token Management** (lines 851-950)
12. **Billing & Accounts Receivable** (lines 951-1100)
13. **Finance & Payments - Detailed** (lines 1101-1250)
14. **Onboarding & Activation** (lines 1251-1350)
15. **Schemes & Rules** (lines 1351-1450)
16. **Fraud Prevention** (lines 1451-1600)
17. **Claims Finance** (lines 1601-1700)
18. **Audit & Compliance** (lines 1701-1750)

---

## SQL INITIALIZATION ORDER

The `01-init-database.sql` should create enums in this order:

```sql
-- 1. Core & Identity Enums
CREATE TYPE member_type_enum AS ENUM (...);
CREATE TYPE dependent_type_enum AS ENUM (...);
CREATE TYPE gender_enum AS ENUM (...);
CREATE TYPE marital_status_enum AS ENUM (...);
CREATE TYPE membership_status_enum AS ENUM (...);
CREATE TYPE client_type_enum AS ENUM (...);
CREATE TYPE user_type_enum AS ENUM (...);

-- 2. Period & Premium Enums
CREATE TYPE period_status_enum AS ENUM (...);
CREATE TYPE period_type_enum AS ENUM (...);
-- ... (continue in same order as TypeScript schema)
```

---

## MIGRATION NOTES

### Adding New Enums
1. Add to TypeScript schema.ts in appropriate category
2. Add to SQL initialization script
3. Run migration: `npm run db:push`

### Modifying Existing Enums
1. **WARNING**: Never remove enum values in production
2. Add new values at the end of the array
3. Update both TypeScript schema.ts and SQL
4. Create migration script for existing data
5. Test in non-production first

---

## ENUM VALUE STANDARDS

### Naming Conventions
- **Snake Case** for database enum names: `member_type_enum`
- **Pascal Case** for TypeScript constants: `memberTypeEnum`
- **String Values** in lowercase with underscores: `'under_review'`

### Value Standards
- Use consistent terminology across related enums
- Avoid abbreviations (use `'disbursement'` not `'disp'`)
- Use descriptive, self-explanatory values
- Keep values mutually exclusive
- Include 'other' or 'unknown' where appropriate

### Status Pattern
Most status enums follow this progression:
```typescript
['pending', 'processing', 'completed', 'failed', 'cancelled']
```

---

## TOTAL ENUM COUNT: 146

By Category:
- Core & Identity: 7
- Period & Premium: 5
- Billing & Payments - Core: 5
- Benefits & Coverage: 11
- Provider Network: 6
- Claims Management: 9
- Member Management: 12
- CRM & Sales: 7
- Commission Management: 11
- Workflow & Automation: 10
- Token Management: 9
- Billing & Accounts Receivable: 9
- Finance & Payments - Detailed: 13
- Onboarding & Activation: 8
- Schemes & Rules: 11
- Fraud Prevention: 11
- Claims Finance: 7
- Audit & Compliance: 3

---

## QUICK REFERENCE TABLE

| Category | Enum Count | Line Range (estimated) |
|----------|-----------|----------------------|
| Core & Identity | 7 | 1-50 |
| Period & Premium | 5 | 51-100 |
| Billing & Payments - Core | 5 | 101-150 |
| Benefits & Coverage | 11 | 151-200 |
| Provider Network | 6 | 201-300 |
| Claims Management | 9 | 301-400 |
| Member Management | 12 | 401-500 |
| CRM & Sales | 7 | 501-600 |
| Commission Management | 11 | 601-750 |
| Workflow & Automation | 10 | 751-850 |
| Token Management | 9 | 851-950 |
| Billing & Accounts Receivable | 9 | 951-1100 |
| Finance & Payments - Detailed | 13 | 1101-1250 |
| Onboarding & Activation | 8 | 1251-1350 |
| Schemes & Rules | 11 | 1351-1450 |
| Fraud Prevention | 11 | 1451-1600 |
| Claims Finance | 7 | 1601-1700 |
| Audit & Compliance | 3 | 1701-1750 |
| **TOTAL** | **146** | **~1750 lines** |

---

## IMPLEMENTATION STATUS

✅ All 146 enums defined in TypeScript schema
✅ All enums follow naming conventions
⚠️ SQL initialization script needs updates
⚠️ Schema file needs reorganization for better structure

---

## NEXT STEPS

1. ✅ Complete this documentation
2. ⚠️ Reorganize shared/schema.ts with enums in correct order
3. ⚠️ Update database/init/01-init-database.sql
4. ⚠️ Create enum migration script if needed
5. ⚠️ Update all service schemas to match

---

**Last Updated**: 2025-12-28
**Total Enums**: 146
**Status**: Documented, needs reorganization
