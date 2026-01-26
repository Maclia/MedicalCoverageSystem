-- ==========================================
-- Medical Coverage System - Database Initialization
-- ==========================================
-- This script initializes all database enums in the correct order
-- Enums are organized by functional category for clarity

-- Set timezone
SET timezone = 'UTC';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- 1. CORE & IDENTITY ENUMS (7 enums)
-- ============================================================================

-- Member types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
        CREATE TYPE member_type AS ENUM ('principal', 'dependent');
    END IF;
END $$;

-- Dependent types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dependent_type') THEN
        CREATE TYPE dependent_type AS ENUM ('spouse', 'child', 'parent', 'guardian');
    END IF;
END $$;

-- Gender
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
        CREATE TYPE gender AS ENUM ('male', 'female', 'other');
    END IF;
END $$;

-- Marital status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marital_status') THEN
        CREATE TYPE marital_status AS ENUM ('single', 'married', 'divorced', 'widowed');
    END IF;
END $$;

-- Membership status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
        CREATE TYPE membership_status AS ENUM ('active', 'suspended', 'pending', 'terminated', 'expired');
    END IF;
END $$;

-- Client type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_type') THEN
        CREATE TYPE client_type AS ENUM ('individual', 'corporate', 'sme', 'government', 'education', 'association');
    END IF;
END $$;

-- User type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
        CREATE TYPE user_type AS ENUM ('insurance', 'institution', 'provider', 'sales_admin', 'sales_manager', 'team_lead', 'sales_agent', 'broker', 'underwriter');
    END IF;
END $$;

-- ============================================================================
-- 2. PERIOD & PREMIUM ENUMS (5 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_status') THEN
        CREATE TYPE period_status AS ENUM ('active', 'inactive', 'upcoming', 'expired');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_type') THEN
        CREATE TYPE period_type AS ENUM ('short_term', 'long_term', 'standard');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'premium_rate_type') THEN
        CREATE TYPE premium_rate_type AS ENUM ('standard', 'age_banded', 'family_size');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_methodology') THEN
        CREATE TYPE pricing_methodology AS ENUM ('community_rated', 'experience_rated', 'adjusted_community_rated', 'benefit_rated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_adjustment_tier') THEN
        CREATE TYPE risk_adjustment_tier AS ENUM ('low_risk', 'average_risk', 'moderate_risk', 'high_risk', 'very_high_risk');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inflation_category') THEN
        CREATE TYPE inflation_category AS ENUM ('medical_trend', 'utilization_trend', 'cost_shifting', 'technology_advancement', 'regulatory_impact');
    END IF;
END $$;

-- ============================================================================
-- 3. BILLING & PAYMENTS - CORE ENUMS (5 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE payment_type AS ENUM ('premium', 'claim', 'disbursement');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'check', 'cash', 'online');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_frequency') THEN
        CREATE TYPE billing_frequency AS ENUM ('monthly', 'quarterly', 'annual', 'pro_rata');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cost_sharing_type') THEN
        CREATE TYPE cost_sharing_type AS ENUM ('copay_fixed', 'copay_percentage', 'coinsurance', 'deductible', 'annual_deductible');
    END IF;
END $$;

-- ============================================================================
-- 4. BENEFITS & COVERAGE ENUMS (11 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'benefit_category') THEN
        CREATE TYPE benefit_category AS ENUM ('medical', 'dental', 'vision', 'wellness', 'hospital', 'prescription', 'emergency', 'maternity', 'specialist', 'other');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_tier') THEN
        CREATE TYPE network_tier AS ENUM ('tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE contract_status AS ENUM ('draft', 'active', 'expired', 'terminated', 'renewal_pending');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tariff_status') THEN
        CREATE TYPE tariff_status AS ENUM ('active', 'inactive', 'pending', 'deprecated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reimbursement_model') THEN
        CREATE TYPE reimbursement_model AS ENUM ('fee_for_service', 'capitation', 'drg', 'per_diem', 'package_deal');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'limit_type') THEN
        CREATE TYPE limit_type AS ENUM ('overall_annual', 'benefit_annual', 'sub_limit', 'frequency', 'age_based');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'limit_category') THEN
        CREATE TYPE limit_category AS ENUM ('icu', 'room_type', 'procedure_type', 'professional_fee', 'medication', 'therapy');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'frequency_limit') THEN
        CREATE TYPE frequency_limit AS ENUM ('per_visit', 'per_day', 'per_admission', 'annual', 'lifetime');
    END IF;
END $$;

-- ============================================================================
-- 5. PROVIDER NETWORK ENUMS (6 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_type') THEN
        CREATE TYPE institution_type AS ENUM ('hospital', 'clinic', 'laboratory', 'imaging', 'pharmacy', 'specialist', 'general');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'personnel_type') THEN
        CREATE TYPE personnel_type AS ENUM ('doctor', 'nurse', 'specialist', 'technician', 'pharmacist', 'therapist', 'other');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_verification_status') THEN
        CREATE TYPE provider_verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended', 'under_review');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_onboarding_status') THEN
        CREATE TYPE provider_onboarding_status AS ENUM ('registered', 'document_pending', 'verification_in_progress', 'approved', 'rejected', 'active', 'suspended');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_performance_tier') THEN
        CREATE TYPE provider_performance_tier AS ENUM ('excellent', 'good', 'average', 'below_average', 'poor');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accreditation_status') THEN
        CREATE TYPE accreditation_status AS ENUM ('accredited', 'provisional', 'not_accredited', 'expired');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_status') THEN
        CREATE TYPE compliance_status AS ENUM ('compliant', 'minor_violations', 'major_violations', 'suspended');
    END IF;
END $$;

-- ============================================================================
-- 6. CLAIMS MANAGEMENT ENUMS (9 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
        CREATE TYPE claim_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'paid', 'fraud_review', 'fraud_confirmed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'procedure_category') THEN
        CREATE TYPE procedure_category AS ENUM ('consultation', 'surgery', 'diagnostic', 'laboratory', 'imaging', 'dental', 'vision', 'medication', 'therapy', 'emergency', 'maternity', 'preventative', 'other');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'diagnosis_code_type') THEN
        CREATE TYPE diagnosis_code_type AS ENUM ('ICD-10', 'ICD-11');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adjudication_result') THEN
        CREATE TYPE adjudication_result AS ENUM ('APPROVED', 'PARTIALLY_APPROVED', 'DENIED', 'PENDING_REVIEW');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_necessity_result') THEN
        CREATE TYPE medical_necessity_result AS ENUM ('PASS', 'FAIL', 'REVIEW_REQUIRED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'eob_status') THEN
        CREATE TYPE eob_status AS ENUM ('GENERATED', 'SENT', 'ACKNOWLEDGED', 'DISPUTED');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_event_type') THEN
        CREATE TYPE claim_event_type AS ENUM ('SUBMITTED', 'ELIGIBILITY_CHECKED', 'VALIDATED', 'ADJUDICATED', 'MEDICAL_REVIEW', 'FRAUD_DETECTED', 'APPROVED', 'DENIED', 'PAID');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fraud_risk_level') THEN
        CREATE TYPE fraud_risk_level AS ENUM ('none', 'low', 'medium', 'high', 'confirmed');
    END IF;
END $$;

-- ============================================================================
-- 7. MEMBER MANAGEMENT ENUMS (12 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'life_event_type') THEN
        CREATE TYPE life_event_type AS ENUM ('enrollment', 'activation', 'suspension', 'upgrade', 'downgrade', 'renewal', 'transfer', 'termination', 'reinstatement', 'death');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM ('national_id', 'passport', 'birth_certificate', 'marriage_certificate', 'employment_letter', 'medical_report', 'student_letter', 'government_id', 'proof_of_address', 'insurance_card', 'dependent_document', 'other');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
        CREATE TYPE communication_type AS ENUM ('enrollment_confirmation', 'renewal_notification', 'card_generation', 'pre_auth_update', 'limit_reminder', 'payment_due', 'suspension_notice', 'termination_notice');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_channel') THEN
        CREATE TYPE communication_channel AS ENUM ('sms', 'email', 'mobile_app', 'postal', 'provider_notification');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
        CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_type') THEN
        CREATE TYPE consent_type AS ENUM ('data_processing', 'marketing_communications', 'data_sharing_providers', 'data_sharing_partners', 'wellness_programs');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_type') THEN
        CREATE TYPE card_type AS ENUM ('physical', 'digital', 'both');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status') THEN
        CREATE TYPE card_status AS ENUM ('pending', 'active', 'inactive', 'expired', 'lost', 'stolen', 'damaged', 'replaced');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_template') THEN
        CREATE TYPE card_template AS ENUM ('standard', 'premium', 'corporate', 'family', 'individual');
    END IF;
END $$;

-- ============================================================================
-- 8. CRM & SALES ENUMS (7 enums)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
        CREATE TYPE lead_source AS ENUM ('website', 'referral', 'campaign', 'cold_call', 'partner', 'event', 'social_media', 'email_marketing', 'third_party', 'manual');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'duplicate');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority') THEN
        CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_stage') THEN
        CREATE TYPE opportunity_stage AS ENUM ('lead', 'qualified', 'quotation', 'underwriting', 'issuance', 'closed_won', 'closed_lost');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'sms', 'whatsapp', 'note', 'task', 'demo', 'proposal');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'territory_type') THEN
        CREATE TYPE territory_type AS ENUM ('geographic', 'industry', 'company_size', 'product_line', 'mixed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type') THEN
        CREATE TYPE agent_type AS ENUM ('internal_agent', 'external_broker', 'independent_agent', 'captive_agent', 'agency');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
        CREATE TYPE license_status AS ENUM ('active', 'expired', 'suspended', 'pending', 'revoked');
    END IF;
END $$;

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger function to set created_at if not provided
CREATE OR REPLACE FUNCTION set_created_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This script creates all 146 enum types in the correct order.
-- Additional enums will be added here as the schema expands.
-- Table creation is handled by Drizzle ORM migrations.
-- ============================================================================
