-- Schemes & Benefits Module Migration Script
-- This migration creates the complete database schema for the Schemes & Benefits module

-- Enums for Schemes & Benefits Module
CREATE TYPE scheme_type_enum AS ENUM (
    'individual', 'family', 'corporate', 'senior', 'student', 'group', 'government'
);

CREATE TYPE pricing_model_enum AS ENUM (
    'age_rated', 'community_rated', 'group_rate', 'experience_rated', 'tiered_rate', 'custom'
);

CREATE TYPE cost_sharing_type_enum AS ENUM (
    'deductible', 'copay', 'coinsurance', 'out_of_pocket_max', 'annual_limit'
);

CREATE TYPE limit_type_enum AS ENUM (
    'annual', 'lifetime', 'per_claim', 'per_year', 'per_month', 'frequency', 'age_based'
);

CREATE TYPE benefit_category_enum AS ENUM (
    'hospitalization', 'outpatient', 'dental', 'vision', 'maternity', 'mental_health',
    'prescription', 'wellness', 'emergency', 'diagnostic', 'preventive', 'rehabilitation'
);

CREATE TYPE plan_tier_enum AS ENUM (
    'bronze', 'silver', 'gold', 'platinum', 'diamond', 'custom'
);

CREATE TYPE network_access_level_enum AS ENUM (
    'tier_1_only', 'full_network', 'premium_network', 'hybrid'
);

CREATE TYPE coverage_area_enum AS ENUM (
    'national', 'regional', 'metro_only', 'international', 'custom'
);

CREATE TYPE rider_type_enum AS ENUM (
    'enhanced_coverage', 'reduced_wait', 'additional_benefits', 'wellness', 'critical_illness'
);

CREATE TYPE rule_condition_type_enum AS ENUM (
    'age_based', 'gender_based', 'medical_history', 'employment_status', 'location_based', 'custom'
);

CREATE TYPE rule_action_type_enum AS ENUM (
    'approve', 'deny', 'review', 'additional_info', 'refer_specialist', 'rate_adjustment'
);

CREATE TYPE compliance_requirement_enum AS ENUM (
    'documentation', 'pre_authorization', 'medical_necessity', 'network_provider', 'time_limit'
);

-- Main Schemes Table
CREATE TABLE schemes (
    id SERIAL PRIMARY KEY,
    scheme_code VARCHAR(50) UNIQUE NOT NULL,
    scheme_name VARCHAR(200) NOT NULL,
    scheme_description TEXT,
    scheme_type scheme_type_enum NOT NULL,
    pricing_model pricing_model_enum NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    effective_date DATE NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheme Versions Table
CREATE TABLE scheme_versions (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    version_name VARCHAR(200),
    version_description TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    effective_date DATE NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, version_number)
);

-- Plan Tiers Table
CREATE TABLE plan_tiers (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    tier_name plan_tier_enum NOT NULL,
    tier_display_name VARCHAR(100) NOT NULL,
    tier_description TEXT,
    network_access_level network_access_level_enum NOT NULL,
    coverage_area coverage_area_enum NOT NULL,
    base_premium_multiplier DECIMAL(5,3) NOT NULL DEFAULT 1.000,
    coverage_limits JSONB,
    exclusions TEXT[],
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Benefits Table
CREATE TABLE enhanced_benefits (
    id SERIAL PRIMARY KEY,
    benefit_code VARCHAR(50) UNIQUE NOT NULL,
    benefit_name VARCHAR(200) NOT NULL,
    benefit_description TEXT,
    benefit_category benefit_category_enum NOT NULL,
    coverage_type VARCHAR(50) NOT NULL,
    default_limit_amount DECIMAL(15,2),
    default_limit_type limit_type_enum NOT NULL,
    default_waiting_period INTEGER DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheme Benefit Mappings Table
CREATE TABLE scheme_benefit_mappings (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    plan_tier_id INTEGER REFERENCES plan_tiers(id) ON DELETE CASCADE,
    benefit_id INTEGER REFERENCES enhanced_benefits(id) ON DELETE CASCADE,
    coverage_percentage DECIMAL(5,2) NOT NULL,
    limit_amount DECIMAL(15,2),
    limit_type limit_type_enum NOT NULL,
    waiting_period INTEGER DEFAULT 0,
    pre_authorization_required BOOLEAN DEFAULT false,
    medical_necessity_required BOOLEAN DEFAULT false,
    custom_rules JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, plan_tier_id, benefit_id)
);

-- Cost Sharing Rules Table
CREATE TABLE cost_sharing_rules (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    plan_tier_id INTEGER REFERENCES plan_tiers(id) ON DELETE CASCADE,
    cost_sharing_type cost_sharing_type_enum NOT NULL,
    cost_sharing_amount DECIMAL(15,2),
    cost_sharing_percentage DECIMAL(5,2),
    minimum_amount DECIMAL(15,2),
    maximum_amount DECIMAL(15,2),
    applies_to_benefit_category benefit_category_enum,
    income_based_slabs JSONB,
    family_size_impact JSONB,
    custom_conditions JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefit Limits Table
CREATE TABLE benefit_limits (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    plan_tier_id INTEGER REFERENCES plan_tiers(id) ON DELETE CASCADE,
    benefit_id INTEGER REFERENCES enhanced_benefits(id) ON DELETE CASCADE,
    limit_type limit_type_enum NOT NULL,
    limit_amount DECIMAL(15,2) NOT NULL,
    limit_period VARCHAR(50),
    age_based_limits JSONB,
    frequency_limits JSONB,
    conditions JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, plan_tier_id, benefit_id, limit_type)
);

-- Corporate Scheme Configurations Table
CREATE TABLE corporate_scheme_configs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    custom_scheme_name VARCHAR(200),
    custom_terms_conditions TEXT,
    premium_contribution_percentage DECIMAL(5,2),
    employee_grade_based_premiums JSONB,
    special_coverage_rules JSONB,
    bulk_enrollment_discount DECIMAL(5,2),
    custom_reporting_requirements JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Grade Benefits Table
CREATE TABLE employee_grade_benefits (
    id SERIAL PRIMARY KEY,
    corporate_config_id INTEGER REFERENCES corporate_scheme_configs(id) ON DELETE CASCADE,
    employee_grade VARCHAR(50) NOT NULL,
    plan_tier_id INTEGER REFERENCES plan_tiers(id) ON DELETE CASCADE,
    benefit_inclusions JSONB,
    benefit_exclusions JSONB,
    premium_multiplier DECIMAL(5,3),
    additional_covers JSONB,
    special_privileges JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(corporate_config_id, employee_grade)
);

-- Dependent Coverage Rules Table
CREATE TABLE dependent_coverage_rules (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    plan_tier_id INTEGER REFERENCES plan_tiers(id) ON DELETE CASCADE,
    dependent_type VARCHAR(50) NOT NULL,
    max_age_limit INTEGER,
    coverage_percentage DECIMAL(5,2),
    premium_impact DECIMAL(5,3),
    medical_examination_required BOOLEAN DEFAULT false,
    waiting_period INTEGER DEFAULT 0,
    special_conditions JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, plan_tier_id, dependent_type)
);

-- Benefit Riders Table
CREATE TABLE benefit_riders (
    id SERIAL PRIMARY KEY,
    rider_code VARCHAR(50) UNIQUE NOT NULL,
    rider_name VARCHAR(200) NOT NULL,
    rider_description TEXT,
    rider_type rider_type_enum NOT NULL,
    applicable_scheme_types scheme_type_enum[],
    premium_impact_percentage DECIMAL(5,2),
    additional_coverage JSONB,
    eligibility_criteria JSONB,
    waiting_period INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member Rider Selections Table
CREATE TABLE member_rider_selections (
    id SERIAL PRIMARY KEY,
    member_id INTEGER,
    rider_id INTEGER REFERENCES benefit_riders(id) ON DELETE CASCADE,
    selection_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    premium_amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benefit Rules Table
CREATE TABLE benefit_rules (
    id SERIAL PRIMARY KEY,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    plan_tier_id INTEGER REFERENCES plan_tiers(id) ON DELETE CASCADE,
    benefit_id INTEGER REFERENCES enhanced_benefits(id) ON DELETE CASCADE,
    rule_name VARCHAR(200) NOT NULL,
    rule_description TEXT,
    condition_type rule_condition_type_enum NOT NULL,
    condition_parameters JSONB NOT NULL,
    action_type rule_action_type_enum NOT NULL,
    action_parameters JSONB NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rule Execution Logs Table
CREATE TABLE rule_execution_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES benefit_rules(id) ON DELETE CASCADE,
    member_id INTEGER,
    claim_id INTEGER,
    execution_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    condition_evaluation JSONB,
    action_taken VARCHAR(100),
    result JSONB,
    execution_time_ms INTEGER,
    notes TEXT
);

-- Provider Networks Table (Enhanced)
CREATE TABLE provider_networks (
    id SERIAL PRIMARY KEY,
    network_name VARCHAR(200) NOT NULL,
    network_type plan_tier_enum NOT NULL,
    network_description TEXT,
    coverage_geography JSONB,
    network_tiers JSONB,
    discount_structure JSONB,
    quality_standards JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider Network Assignments Table
CREATE TABLE provider_network_assignments (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    network_id INTEGER REFERENCES provider_networks(id) ON DELETE CASCADE,
    tier_level plan_tier_enum NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    specializations TEXT[],
    effective_date DATE NOT NULL,
    expiry_date DATE,
    contract_terms JSONB,
    performance_metrics JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, network_id, tier_level)
);

-- Provider Contracts Table
CREATE TABLE provider_contracts (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    network_assignment_id INTEGER REFERENCES provider_network_assignments(id) ON DELETE CASCADE,
    contract_type VARCHAR(50) NOT NULL,
    pricing_model VARCHAR(50) NOT NULL,
    negotiated_rates JSONB NOT NULL,
    service_codes JSONB,
    quality_metrics JSONB,
    compliance_requirements compliance_requirement_enum[],
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    renewal_terms JSONB,
    termination_clauses JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider Onboarding Applications Table
CREATE TABLE provider_onboarding_applications (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    application_data JSONB NOT NULL,
    required_documents JSONB,
    review_status VARCHAR(50) DEFAULT 'pending',
    review_comments TEXT,
    reviewer_id INTEGER,
    approval_date TIMESTAMP,
    contract_offered JSONB,
    onboarding_stage VARCHAR(50) DEFAULT 'initial_application',
    compliance_checklist JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider Performance Metrics Table
CREATE TABLE provider_performance_metrics (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    measurement_period_start DATE NOT NULL,
    measurement_period_end DATE NOT NULL,
    claims_processed INTEGER DEFAULT 0,
    average_processing_time_hours DECIMAL(8,2) DEFAULT 0,
    denial_rate DECIMAL(5,4) DEFAULT 0,
    patient_satisfaction_score DECIMAL(5,2) DEFAULT 0,
    cost_efficiency_score DECIMAL(5,2) DEFAULT 0,
    quality_compliance_score DECIMAL(5,2) DEFAULT 0,
    network_utilization_rate DECIMAL(5,4) DEFAULT 0,
    referral_rate DECIMAL(5,4) DEFAULT 0,
    readmission_rate DECIMAL(5,4) DEFAULT 0,
    custom_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, scheme_id, measurement_period_start, measurement_period_end)
);

-- Provider Quality Scores Table
CREATE TABLE provider_quality_scores (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    assessment_date DATE NOT NULL,
    overall_quality_score DECIMAL(5,2) NOT NULL,
    clinical_quality_score DECIMAL(5,2),
    patient_experience_score DECIMAL(5,2),
    access_score DECIMAL(5,2),
    efficiency_score DECIMAL(5,2),
    compliance_score DECIMAL(5,2),
    innovation_score DECIMAL(5,2),
    cost_effectiveness_score DECIMAL(5,2),
    peer_review_score DECIMAL(5,2),
    accreditation_status JSONB,
    quality_initiatives JSONB,
    improvement_areas JSONB,
    assessor_id INTEGER,
    next_assessment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, assessment_date)
);

-- Provider Compliance Monitoring Table
CREATE TABLE provider_compliance_monitoring (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    compliance_type VARCHAR(100) NOT NULL,
    compliance_requirement TEXT NOT NULL,
    compliance_status VARCHAR(50) DEFAULT 'pending',
    last_check_date TIMESTAMP,
    next_check_date TIMESTAMP,
    compliance_score DECIMAL(5,2),
    violations_count INTEGER DEFAULT 0,
    corrective_actions_required TEXT[],
    corrective_actions_taken JSONB,
    monitoring_frequency VARCHAR(50) DEFAULT 'monthly',
    compliance_officer_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, compliance_type)
);

-- Provider Financial Performance Table
CREATE TABLE provider_financial_performance (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    scheme_id INTEGER REFERENCES schemes(id) ON DELETE CASCADE,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    total_claims_value DECIMAL(15,2) DEFAULT 0,
    negotiated_savings DECIMAL(15,2) DEFAULT 0,
    allowed_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    denial_amount DECIMAL(15,2) DEFAULT 0,
    appeal_success_rate DECIMAL(5,4) DEFAULT 0,
    average_claim_amount DECIMAL(15,2) DEFAULT 0,
    cost_per_member DECIMAL(15,2) DEFAULT 0,
    revenue_per_procedure JSONB,
    profit_margin DECIMAL(5,4) DEFAULT 0,
    market_share_percentage DECIMAL(5,4) DEFAULT 0,
    financial_ratios JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, scheme_id, reporting_period_start, reporting_period_end)
);

-- Create indexes for better performance
CREATE INDEX idx_schemes_type_status ON schemes(scheme_type, status);
CREATE INDEX idx_schemes_effective_date ON schemes(effective_date);
CREATE INDEX idx_scheme_versions_scheme_id ON scheme_versions(scheme_id);
CREATE INDEX idx_plan_tiers_scheme_id ON plan_tiers(scheme_id);
CREATE INDEX idx_enhanced_benefits_category ON enhanced_benefits(benefit_category);
CREATE INDEX idx_scheme_benefit_mappings_scheme_benefit ON scheme_benefit_mappings(scheme_id, benefit_id);
CREATE INDEX idx_cost_sharing_rules_scheme_tier ON cost_sharing_rules(scheme_id, plan_tier_id);
CREATE INDEX idx_benefit_limits_scheme_benefit ON benefit_limits(scheme_id, benefit_id);
CREATE INDEX idx_corporate_scheme_configs_company ON corporate_scheme_configs(company_id);
CREATE INDEX idx_employee_grade_benefits_config ON employee_grade_benefits(corporate_config_id);
CREATE INDEX idx_benefit_rules_scheme_priority ON benefit_rules(scheme_id, priority);
CREATE INDEX idx_rule_execution_logs_rule_timestamp ON rule_execution_logs(rule_id, execution_timestamp);
CREATE INDEX idx_provider_network_assignments_provider ON provider_network_assignments(provider_id);
CREATE INDEX idx_provider_contracts_provider_scheme ON provider_contracts(provider_id, scheme_id);
CREATE INDEX idx_provider_performance_metrics_period ON provider_performance_metrics(measurement_period_start, measurement_period_end);
CREATE INDEX idx_provider_quality_scores_date ON provider_quality_scores(assessment_date);
CREATE INDEX idx_provider_compliance_monitoring_status ON provider_compliance_monitoring(compliance_status);

-- Insert default data
INSERT INTO enhanced_benefits (benefit_code, benefit_name, benefit_description, benefit_category, coverage_type, default_limit_amount, default_limit_type) VALUES
('HOSP_BASIC', 'Basic Hospitalization', 'Inpatient hospital care and accommodation', 'hospitalization', 'inpatient', 500000.00, 'annual'),
('HOSP_ICU', 'ICU Care', 'Intensive Care Unit treatment and monitoring', 'hospitalization', 'inpatient', 200000.00, 'annual'),
('SURG_BASIC', 'Basic Surgical Procedures', 'Essential surgical interventions', 'hospitalization', 'surgical', 100000.00, 'annual'),
('OUTPATIENT', 'Outpatient Consultations', 'Doctor visits and outpatient services', 'outpatient', 'outpatient', 20000.00, 'annual'),
('DENTAL_BASIC', 'Basic Dental Care', 'Routine dental examinations and treatments', 'dental', 'dental', 15000.00, 'annual'),
('VISION_BASIC', 'Vision Care', 'Eye examinations and corrective lenses', 'vision', 'vision', 10000.00, 'annual'),
('MATERNITY', 'Maternity Care', 'Pregnancy and childbirth care', 'maternity', 'maternity', 75000.00, 'annual'),
('PRESCRIPTION', 'Prescription Drugs', 'Covered medications and pharmaceuticals', 'prescription', 'pharmacy', 25000.00, 'annual'),
('WELLNESS', 'Preventive Wellness', 'Health checkups and preventive care', 'wellness', 'wellness', 10000.00, 'annual'),
('EMERGENCY', 'Emergency Care', 'Emergency medical treatment', 'emergency', 'emergency', 100000.00, 'annual');

INSERT INTO benefit_riders (rider_code, rider_name, rider_description, rider_type, applicable_scheme_types, premium_impact_percentage) VALUES
('WELLNESS_PLUS', 'Enhanced Wellness', 'Extended wellness benefits including gym membership', 'wellness', ARRAY['individual', 'family', 'corporate'], 10.00),
('CRITICAL_ILLNESS', 'Critical Illness Cover', 'Coverage for critical illnesses like cancer, heart disease', 'critical_illness', ARRAY['individual', 'family', 'corporate'], 25.00),
('REDUCED_WAIT', 'Reduced Waiting Period', 'Eliminates waiting periods for major benefits', 'reduced_wait', ARRAY['individual', 'family', 'corporate'], 15.00),
('INTERNATIONAL', 'International Coverage', 'Extends coverage to international treatment', 'enhanced_coverage', ARRAY['individual', 'family', 'corporate'], 30.00);

COMMIT;