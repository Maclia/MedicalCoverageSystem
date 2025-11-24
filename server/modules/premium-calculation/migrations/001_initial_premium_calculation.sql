-- Enhanced Premium Calculation System Database Schema Migration
-- Version: 2.0.0
-- Date: 2025-11-24
-- Description: Adds support for risk-adjusted pricing, actuarial models, and advanced premium calculations

-- Enable UUID extension for UUID-based primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to existing premiums table for enhanced calculation tracking
ALTER TABLE premiums
ADD COLUMN IF NOT EXISTS pricing_methodology VARCHAR(50) DEFAULT 'standard' CHECK (pricing_methodology IN ('standard', 'risk-adjusted', 'hybrid', 'usage-based')),
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS risk_adjustment_factor DECIMAL(5,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS actuarial_projection DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS calculation_confidence DECIMAL(5,2) DEFAULT 95.00,
ADD COLUMN IF NOT EXISTS demographic_data JSONB,
ADD COLUMN IF NOT EXISTS geographic_adjustment DECIMAL(5,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS family_adjustment DECIMAL(5,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS inflation_adjustment DECIMAL(5,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS experience_rating DECIMAL(5,4) DEFAULT 1.0000,
ADD COLUMN IF NOT EXISTS wellness_discount DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS multi_policy_discount DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS enhanced_breakdown JSONB,
ADD COLUMN IF NOT EXISTS calculation_version VARCHAR(20) DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS optimized_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS batch_calculation_id UUID,
ADD COLUMN IF NOT EXISTS regulatory_compliance JSONB;

-- Add indexes for enhanced premium calculation performance
CREATE INDEX IF NOT EXISTS idx_premiums_pricing_methodology ON premiums(pricing_methodology);
CREATE INDEX IF NOT EXISTS idx_premiums_risk_score ON premiums(risk_score);
CREATE INDEX IF NOT EXISTS idx_premiums_calculation_confidence ON premiums(calculation_confidence);
CREATE INDEX IF NOT EXISTS idx_premiums_geographic_adjustment ON premiums(geographic_adjustment);
CREATE INDEX IF NOT EXISTS idx_premiums_batch_calculation ON premiums(batch_calculation_id);

-- Enhanced premium calculations table for detailed calculation breakdowns
CREATE TABLE IF NOT EXISTS enhanced_premium_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    premium_id INTEGER REFERENCES premiums(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    period_id INTEGER REFERENCES periods(id) ON DELETE CASCADE,
    calculation_methodology VARCHAR(50) NOT NULL CHECK (calculation_methodology IN ('standard', 'risk-adjusted', 'hybrid', 'usage-based')),

    -- Base calculation data
    base_premium DECIMAL(12,2) NOT NULL,
    member_demographics JSONB NOT NULL,
    family_composition JSONB,

    -- Risk adjustment data
    risk_adjustment_applied BOOLEAN DEFAULT FALSE,
    risk_assessment_data JSONB,
    risk_category_scores JSONB,
    risk_multiplier DECIMAL(5,4) DEFAULT 1.0000,
    risk_adjustment_amount DECIMAL(12,2) DEFAULT 0.00,

    -- Demographic adjustments
    age_band_adjustment DECIMAL(5,4) DEFAULT 1.0000,
    gender_adjustment DECIMAL(5,4) DEFAULT 1.0000,
    family_structure_adjustment DECIMAL(5,4) DEFAULT 1.0000,

    -- Geographic adjustments
    geographic_region VARCHAR(100),
    cost_index DECIMAL(5,4) DEFAULT 1.0000,
    geographic_adjustment_amount DECIMAL(12,2) DEFAULT 0.00,

    -- Benefit design adjustments
    deductible_adjustment DECIMAL(5,4) DEFAULT 1.0000,
    coinsurance_adjustment DECIMAL(5,4) DEFAULT 1.0000,
    network_adjustment DECIMAL(5,4) DEFAULT 1.0000,
    benefit_richness_adjustment DECIMAL(5,4) DEFAULT 1.0000,

    -- Healthcare inflation factors
    inflation_projection_years INTEGER DEFAULT 1,
    category_inflation_rates JSONB,
    inflation_adjustment_amount DECIMAL(12,2) DEFAULT 0.00,

    -- Experience rating
    experience_rating_applied BOOLEAN DEFAULT FALSE,
    historical_claims_data JSONB,
    loss_ratio_adjustment DECIMAL(5,4) DEFAULT 1.0000,
    experience_rating_amount DECIMAL(12,2) DEFAULT 0.00,

    -- Discounts and adjustments
    wellness_program_discount DECIMAL(5,4) DEFAULT 0.0000,
    multi_policy_discount DECIMAL(5,4) DEFAULT 0.0000,
    loyalty_discount DECIMAL(5,4) DEFAULT 0.0000,
    group_size_discount DECIMAL(5,4) DEFAULT 0.0000,
    tobacco_surcharge DECIMAL(5,4) DEFAULT 0.0000,

    -- Expense loadings
    administrative_expense_ratio DECIMAL(5,4) DEFAULT 0.1200,
    profit_margin_ratio DECIMAL(5,4) DEFAULT 0.0300,
    risk_charge_ratio DECIMAL(5,4) DEFAULT 0.0500,
    commission_ratio DECIMAL(5,4) DEFAULT 0.0400,
    reinsurance_cost_ratio DECIMAL(5,4) DEFAULT 0.0150,
    tax_ratio DECIMAL(5,4) DEFAULT 0.0200,

    -- Final calculations
    adjusted_premium DECIMAL(12,2) NOT NULL,
    total_adjustments DECIMAL(12,2) DEFAULT 0.00,

    -- Quality and compliance
    data_quality_score DECIMAL(5,2) DEFAULT 95.00,
    calculation_confidence DECIMAL(5,2) DEFAULT 95.00,
    regulatory_compliance_check BOOLEAN DEFAULT TRUE,
    compliance_notes TEXT,

    -- Metadata
    calculation_version VARCHAR(20) DEFAULT '2.0.0',
    calculation_assumptions JSONB,
    calculation_limitations JSONB,
    optimization_flags JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculated_by VARCHAR(100),
    calculation_session_id UUID
);

-- Create indexes for enhanced premium calculations
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_premium_id ON enhanced_premium_calculations(premium_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_company_id ON enhanced_premium_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_methodology ON enhanced_premium_calculations(calculation_methodology);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_risk_applied ON enhanced_premium_calculations(risk_adjustment_applied);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_confidence ON enhanced_premium_calculations(calculation_confidence);
CREATE INDEX IF NOT EXISTS idx_enhanced_calculations_session_id ON enhanced_premium_calculations(calculation_session_id);

-- Risk adjustment factors table for risk-to-premium conversion
CREATE TABLE IF NOT EXISTS risk_adjustment_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factor_name VARCHAR(100) NOT NULL,
    factor_category VARCHAR(50) NOT NULL,

    -- Risk score ranges
    min_score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,

    -- Adjustment factors
    multiplier DECIMAL(5,4) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    surcharge_percent DECIMAL(5,2) DEFAULT 0.00,

    -- Risk tier classification
    risk_tier VARCHAR(50) NOT NULL CHECK (risk_tier IN ('Preferred', 'Standard', 'Substandard', 'High-risk', 'Critical')),

    -- Business rules
    regulatory_compliant BOOLEAN DEFAULT TRUE,
    state_specific BOOLEAN DEFAULT FALSE,
    applicable_states JSONB,

    -- Quality metrics
    confidence_score DECIMAL(5,2) DEFAULT 95.00,
    data_requirements JSONB,
    validation_rules JSONB,

    -- Metadata
    effective_date DATE NOT NULL,
    expiry_date DATE,
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for risk adjustment factors
CREATE INDEX IF NOT EXISTS idx_risk_factors_category ON risk_adjustment_factors(factor_category);
CREATE INDEX IF NOT EXISTS idx_risk_factors_tier ON risk_adjustment_factors(risk_tier);
CREATE INDEX IF NOT EXISTS idx_risk_factors_score_range ON risk_adjustment_factors(min_score, max_score);
CREATE INDEX IF NOT EXISTS idx_risk_factors_effective_date ON risk_adjustment_factors(effective_date);

-- Healthcare inflation rates table for historical and projected inflation data
CREATE TABLE IF NOT EXISTS healthcare_inflation_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Time period information
    year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('historical', 'projected', 'actual')),

    -- Geographic information
    region VARCHAR(100),
    state VARCHAR(2),
    metropolitan_area VARCHAR(100),
    cost_index DECIMAL(5,4) DEFAULT 1.0000,

    -- Category-specific inflation rates
    hospital_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    physician_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    pharmacy_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    mental_health_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    preventive_care_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    emergency_care_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    dental_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    vision_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,

    -- Composite rates
    overall_inflation_rate DECIMAL(5,4) DEFAULT 0.0000,
    medical_trend_rate DECIMAL(5,4) DEFAULT 0.0000,
    utilization_trend_rate DECIMAL(5,4) DEFAULT 0.0000,

    -- Data sources and quality
    data_source VARCHAR(100) NOT NULL,
    confidence_level DECIMAL(5,2) DEFAULT 95.00,
    data_quality_score DECIMAL(5,2) DEFAULT 95.00,

    -- Metadata
    calculation_methodology VARCHAR(100),
    assumptions JSONB,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_by VARCHAR(100),
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for healthcare inflation rates
CREATE INDEX IF NOT EXISTS idx_inflation_rates_year_quarter ON healthcare_inflation_rates(year, quarter);
CREATE INDEX IF NOT EXISTS idx_inflation_rates_region ON healthcare_inflation_rates(region);
CREATE INDEX IF NOT EXISTS idx_inflation_rates_state ON healthcare_inflation_rates(state);
CREATE INDEX IF NOT EXISTS idx_inflation_rates_period_type ON healthcare_inflation_rates(period_type);

-- Actuarial rate tables for base actuarial pricing tables
CREATE TABLE IF NOT EXISTS actuarial_rate_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    table_version VARCHAR(20) DEFAULT '1.0.0',

    -- Coverage information
    coverage_type VARCHAR(50) NOT NULL,
    market_segment VARCHAR(50) NOT NULL CHECK (market_segment IN ('individual', 'small_group', 'large_group', 'medicare_advantage', 'medicaid')),
    product_type VARCHAR(50) NOT NULL,

    -- Geographic applicability
    state VARCHAR(2),
    region VARCHAR(100),
    applicable_geographies JSONB,

    -- Demographic base rates
    base_rates JSONB NOT NULL,
    age_banded_rates JSONB,
    gender_rates JSONB,

    -- Family structure rates
    family_rates JSONB,
    smoker_rates JSONB,
    health_status_rates JSONB,

    -- Adjustments and loadings
    geographic_adjustments JSONB,
    industry_adjustments JSONB,
    benefit_design_adjustments JSONB,

    -- Financial assumptions
    loss_ratio_targets JSONB,
    expense_loadings JSONB,
    profit_margin_targets JSONB,

    -- Regulatory constraints
    regulatory_constraints JSONB,
    compliance_requirements JSONB,

    -- Quality and metadata
    data_quality_score DECIMAL(5,2) DEFAULT 95.00,
    actuarial_certification JSONB,
    assumptions JSONB,
    limitations JSONB,

    -- Effective period
    effective_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'superseded')),

    -- Audit information
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    version_notes TEXT
);

-- Create indexes for actuarial rate tables
CREATE INDEX IF NOT EXISTS idx_rate_tables_coverage_type ON actuarial_rate_tables(coverage_type);
CREATE INDEX IF NOT EXISTS idx_rate_tables_market_segment ON actuarial_rate_tables(market_segment);
CREATE INDEX IF NOT EXISTS idx_rate_tables_state ON actuarial_rate_tables(state);
CREATE INDEX IF NOT EXISTS idx_rate_tables_status ON actuarial_rate_tables(status);
CREATE INDEX IF NOT EXISTS idx_rate_tables_effective_date ON actuarial_rate_tables(effective_date);

-- Premium calculation audit trail for complete audit trail of all calculations
CREATE TABLE IF NOT EXISTS premium_calculation_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Calculation reference
    calculation_id UUID NOT NULL,
    premium_id INTEGER REFERENCES premiums(id) ON DELETE SET NULL,
    enhanced_calculation_id UUID REFERENCES enhanced_premium_calculations(id) ON DELETE SET NULL,

    -- Request information
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('individual', 'group', 'quote', 'batch', 'optimization')),
    user_id VARCHAR(100),
    user_role VARCHAR(50),
    session_id VARCHAR(100),

    -- Input parameters
    input_parameters JSONB NOT NULL,
    calculation_options JSONB,

    -- Process information
    calculation_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    calculation_end_time TIMESTAMP WITH TIME ZONE,
    calculation_duration_ms INTEGER,

    -- System information
    server_name VARCHAR(100),
    application_version VARCHAR(20),
    calculation_engine_version VARCHAR(20),

    -- Results summary
    calculation_status VARCHAR(20) NOT NULL CHECK (calculation_status IN ('success', 'error', 'partial_success', 'cancelled')),
    error_code VARCHAR(50),
    error_message TEXT,
    warning_messages JSONB,

    -- Performance metrics
    memory_usage_mb DECIMAL(10,2),
    cpu_time_ms INTEGER,
    database_queries INTEGER,
    external_api_calls INTEGER,

    -- Security and compliance
    ip_address INET,
    user_agent TEXT,
    compliance_checks JSONB,
    data_access_log JSONB,

    -- Change tracking
    previous_calculation_id UUID,
    change_reason VARCHAR(200),
    change_magnitude JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    correlation_id UUID
);

-- Create indexes for premium calculation audit
CREATE INDEX IF NOT EXISTS idx_premium_audit_calculation_id ON premium_calculation_audit(calculation_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_premium_id ON premium_calculation_audit(premium_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_user_id ON premium_calculation_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_audit_request_type ON premium_calculation_audit(request_type);
CREATE INDEX IF NOT EXISTS idx_premium_audit_status ON premium_calculation_audit(calculation_status);
CREATE INDEX IF NOT EXISTS idx_premium_audit_timestamp ON premium_calculation_audit(calculation_start_time);

-- Batch calculation tracking table
CREATE TABLE IF NOT EXISTS batch_premium_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Batch information
    batch_name VARCHAR(200),
    batch_description TEXT,
    batch_type VARCHAR(50) CHECK (batch_type IN ('risk_assessment', 'premium_calculation', 'optimization', 'validation')),

    -- Scope
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    period_id INTEGER REFERENCES periods(id) ON DELETE CASCADE,
    total_members INTEGER NOT NULL,
    member_ids JSONB NOT NULL,

    -- Processing configuration
    processing_options JSONB,
    parallel_processing BOOLEAN DEFAULT FALSE,
    batch_size INTEGER DEFAULT 20,

    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'partial_success')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,

    -- Results summary
    processed_members INTEGER DEFAULT 0,
    failed_members INTEGER DEFAULT 0,
    successful_members INTEGER DEFAULT 0,
    error_summary JSONB,

    -- Performance metrics
    total_processing_time_ms INTEGER,
    average_processing_time_per_member DECIMAL(10,2),
    throughput_members_per_second DECIMAL(10,2),

    -- Aggregated results
    aggregate_premium_data JSONB,
    risk_distribution JSONB,
    cost_projections JSONB,

    -- User information
    initiated_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Create indexes for batch calculations
CREATE INDEX IF NOT EXISTS idx_batch_calculations_company_id ON batch_premium_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_batch_calculations_status ON batch_premium_calculations(status);
CREATE INDEX IF NOT EXISTS idx_batch_calculations_initiated_by ON batch_premium_calculations(initiated_by);
CREATE INDEX IF NOT EXISTS idx_batch_calculations_started_at ON batch_premium_calculations(started_at);

-- Comments and documentation
COMMENT ON TABLE premiums IS 'Enhanced premiums table with risk-adjusted pricing support';
COMMENT ON COLUMN premiums.pricing_methodology IS 'Methodology used for premium calculation (standard, risk-adjusted, hybrid, usage-based)';
COMMENT ON COLUMN premiums.risk_score IS 'Overall risk score for the member/group (0-100 scale)';
COMMENT ON COLUMN premiums.risk_adjustment_factor IS 'Multiplier applied based on risk assessment';
COMMENT ON COLUMN premiums.actuarial_projection IS 'Projected costs for future periods';

COMMENT ON TABLE enhanced_premium_calculations IS 'Detailed breakdown of enhanced premium calculations with all adjustment factors';
COMMENT ON COLUMN enhanced_premium_calculations.risk_adjustment_amount IS 'Dollar amount of risk adjustment applied to base premium';
COMMENT ON COLUMN enhanced_premium_calculations.geographic_adjustment_amount IS 'Dollar amount of geographic cost adjustment';
COMMENT ON COLUMN enhanced_premium_calculations.inflation_adjustment_amount IS 'Dollar amount of healthcare inflation adjustment';

COMMENT ON TABLE risk_adjustment_factors IS 'Risk score to premium adjustment factor conversion table';
COMMENT ON TABLE healthcare_inflation_rates IS 'Historical and projected healthcare cost inflation data';
COMMENT ON TABLE actuarial_rate_tables IS 'Base actuarial pricing tables with demographic factors';

COMMENT ON TABLE premium_calculation_audit IS 'Complete audit trail for all premium calculation activities';
COMMENT ON TABLE batch_premium_calculations IS 'Tracking table for batch premium calculation processes';

-- Create or update function to trigger audit entries
CREATE OR REPLACE FUNCTION trigger_premium_calculation_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called by application code to create audit entries
    -- The actual trigger implementation would depend on the specific requirements
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Row level security policies (if applicable)
-- ALTER TABLE premiums ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE enhanced_premium_calculations ENABLE ROW LEVEL SECURITY;

-- Default data population (sample data for demonstration)
INSERT INTO risk_adjustment_factors (factor_name, factor_category, min_score, max_score, multiplier, discount_percent, surcharge_percent, risk_tier, regulatory_compliant, effective_date) VALUES
('Low Risk Base Rate', 'base', 0, 30, 0.85, 15.00, 0.00, 'Preferred', true, '2025-01-01'),
('Standard Risk Base Rate', 'base', 30, 50, 1.00, 0.00, 0.00, 'Standard', true, '2025-01-01'),
('High Risk Base Rate', 'base', 50, 75, 1.35, 0.00, 35.00, 'Substandard', true, '2025-01-01'),
('Critical Risk Base Rate', 'base', 75, 100, 1.85, 0.00, 85.00, 'High-risk', true, '2025-01-01'),
('Chronic Disease Risk', 'category', 0, 100, 1.20, 0.00, 20.00, 'Variable', true, '2025-01-01'),
('Lifestyle Risk', 'category', 0, 100, 1.15, 0.00, 15.00, 'Variable', true, '2025-01-01'),
('Preventive Care Risk', 'category', 0, 100, 0.95, 5.00, 0.00, 'Variable', true, '2025-01-01'),
('Mental Health Risk', 'category', 0, 100, 1.10, 0.00, 10.00, 'Variable', true, '2025-01-01');

-- Insert sample healthcare inflation rates for 2021-2026
INSERT INTO healthcare_inflation_rates (year, quarter, period_type, overall_inflation_rate, hospital_inflation_rate, physician_inflation_rate, pharmacy_inflation_rate, mental_health_inflation_rate, preventive_care_inflation_rate, data_source, confidence_level) VALUES
(2021, 1, 'historical', 0.0580, 0.0620, 0.0450, 0.0820, 0.0420, 0.0280, 'CMS Medicare Advantage Data', 95.00),
(2021, 2, 'historical', 0.0580, 0.0620, 0.0450, 0.0820, 0.0420, 0.0280, 'CMS Medicare Advantage Data', 95.00),
(2021, 3, 'historical', 0.0580, 0.0620, 0.0450, 0.0820, 0.0420, 0.0280, 'CMS Medicare Advantage Data', 95.00),
(2021, 4, 'historical', 0.0580, 0.0620, 0.0450, 0.0820, 0.0420, 0.0280, 'CMS Medicare Advantage Data', 95.00),
(2022, 1, 'historical', 0.0590, 0.0630, 0.0480, 0.0880, 0.0430, 0.0300, 'CMS Medicare Advantage Data', 95.00),
(2022, 2, 'historical', 0.0590, 0.0630, 0.0480, 0.0880, 0.0430, 0.0300, 'CMS Medicare Advantage Data', 95.00),
(2022, 3, 'historical', 0.0590, 0.0630, 0.0480, 0.0880, 0.0430, 0.0300, 'CMS Medicare Advantage Data', 95.00),
(2022, 4, 'historical', 0.0590, 0.0630, 0.0480, 0.0880, 0.0430, 0.0300, 'CMS Medicare Advantage Data', 95.00),
(2023, 1, 'historical', 0.0610, 0.0635, 0.0510, 0.0950, 0.0450, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2023, 2, 'historical', 0.0610, 0.0635, 0.0510, 0.0950, 0.0450, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2023, 3, 'historical', 0.0610, 0.0635, 0.0510, 0.0950, 0.0450, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2023, 4, 'historical', 0.0610, 0.0635, 0.0510, 0.0950, 0.0450, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2024, 1, 'historical', 0.0630, 0.0640, 0.0540, 0.0980, 0.0480, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2024, 2, 'historical', 0.0630, 0.0640, 0.0540, 0.0980, 0.0480, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2024, 3, 'historical', 0.0630, 0.0640, 0.0540, 0.0980, 0.0480, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2024, 4, 'historical', 0.0630, 0.0640, 0.0540, 0.0980, 0.0480, 0.0320, 'CMS Medicare Advantage Data', 95.00),
(2025, 1, 'projected', 0.0640, 0.0640, 0.0540, 0.1010, 0.0500, 0.0320, 'CMS Medicare Advantage Projections', 85.00),
(2025, 2, 'projected', 0.0640, 0.0640, 0.0540, 0.1010, 0.0500, 0.0320, 'CMS Medicare Advantage Projections', 85.00),
(2025, 3, 'projected', 0.0640, 0.0640, 0.0540, 0.1010, 0.0500, 0.0320, 'CMS Medicare Advantage Projections', 85.00),
(2025, 4, 'projected', 0.0640, 0.0640, 0.0540, 0.1010, 0.0500, 0.0320, 'CMS Medicare Advantage Projections', 85.00);

-- Migration completion log
INSERT INTO premium_calculation_audit (
    calculation_id,
    request_type,
    user_id,
    input_parameters,
    calculation_start_time,
    calculation_end_time,
    calculation_status,
    server_name,
    application_version,
    calculation_engine_version
) VALUES (
    uuid_generate_v4(),
    'migration',
    'system',
    json_build_object('migration_version', '2.0.0', 'description', 'Enhanced premium calculation system migration'),
    NOW(),
    NOW(),
    'success',
    'database_server',
    '2.0.0',
    'enhanced_premium_v2.0.0'
);

-- Migration completion statement
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Premium Calculation migration completed successfully';
    RAISE NOTICE 'Created tables: enhanced_premium_calculations, risk_adjustment_factors, healthcare_inflation_rates, actuarial_rate_tables, premium_calculation_audit, batch_premium_calculations';
    RAISE NOTICE 'Added columns to premiums table for enhanced calculation support';
    RAISE NOTICE 'Populated reference data for risk adjustment factors and inflation rates';
    RAISE NOTICE 'Created indexes for optimal query performance';
END $$;