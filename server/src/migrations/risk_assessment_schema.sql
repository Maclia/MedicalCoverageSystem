-- Risk Assessment Schema for Member Engagement Hub
-- This file defines the database schema for predictive risk assessment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Risk Assessments Table
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    overall_risk_score INTEGER NOT NULL CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_assessment_due TIMESTAMP WITH TIME ZONE NOT NULL,
    trend_analysis JSONB DEFAULT '{}',
    compliance_level INTEGER NOT NULL DEFAULT 0 CHECK (compliance_level >= 0 AND compliance_level <= 100),
    action_items_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assessed_by VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (assessed_by IN ('system', 'health_coach', 'medical_provider')),
    confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Category Scores Table
CREATE TABLE risk_category_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    level VARCHAR(20) NOT NULL CHECK (level IN ('low', 'moderate', 'high', 'critical')),
    weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    trend VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
    last_evaluated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assessment_id, category)
);

-- Risk Factors Table
CREATE TABLE risk_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    value DECIMAL(10,2),
    unit VARCHAR(50),
    normal_range_min DECIMAL(10,2),
    normal_range_max DECIMAL(10,2),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'moderate' CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    impact INTEGER NOT NULL DEFAULT 50 CHECK (impact >= 0 AND impact <= 100),
    trend VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
    confidence INTEGER NOT NULL DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
    source VARCHAR(100) NOT NULL DEFAULT 'manual',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Data Points Table (for tracking factor values over time)
CREATE TABLE risk_data_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_factor_id UUID NOT NULL REFERENCES risk_factors(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    value DECIMAL(10,2),
    string_value TEXT,
    boolean_value BOOLEAN,
    source VARCHAR(100) NOT NULL,
    confidence INTEGER DEFAULT 80 CHECK (confidence >= 0 AND confidence <= 100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Recommendations Table
CREATE TABLE risk_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('lifestyle', 'medical', 'preventive', 'monitoring', 'education')),
    impact INTEGER NOT NULL CHECK (impact >= 0 AND impact <= 100),
    effort INTEGER NOT NULL CHECK (effort >= 0 AND effort <= 100),
    timeframe VARCHAR(100) NOT NULL,
    specific_actions TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
    target_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    acceptance_rate INTEGER DEFAULT 0 CHECK (acceptance_rate >= 0 AND acceptance <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Resources Table
CREATE TABLE risk_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID REFERENCES risk_recommendations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('article', 'video', 'tool', 'service', 'program', 'provider')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500),
    provider VARCHAR(255),
    cost DECIMAL(10,2),
    duration VARCHAR(100),
    effectiveness INTEGER CHECK (effectiveness >= 0 AND effectiveness <= 100),
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Alerts Table
CREATE TABLE risk_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('threshold_breach', 'rapid_decline', 'missed_target', 'new_risk_factor', 'recommendation')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    action_required BOOLEAN NOT NULL DEFAULT false,
    action_items TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN NOT NULL DEFAULT false,
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution TEXT
);

-- Risk Predictions Table
CREATE TABLE risk_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN ('disease_risk', 'complication_risk', 'lifestyle_risk', 'cost_projection')),
    target_outcome VARCHAR(255) NOT NULL,
    probability DECIMAL(5,2) NOT NULL CHECK (probability >= 0 AND probability <= 100),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    timeframe VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    factors JSONB DEFAULT '{}',
    interventions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Prediction Factors Table
CREATE TABLE prediction_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL REFERENCES risk_predictions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10,2),
    string_value TEXT,
    boolean_value BOOLEAN,
    impact INTEGER NOT NULL CHECK (impact >= 0 AND impact <= 100),
    category VARCHAR(50) NOT NULL,
    modifiable BOOLEAN NOT NULL DEFAULT true,
    current_level VARCHAR(100),
    target_level VARCHAR(100)
);

-- Risk Action Items Table
CREATE TABLE risk_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
    recommendation_id UUID REFERENCES risk_recommendations(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('assessment', 'screening', 'lifestyle_change', 'medication_review', 'follow_up')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
    assigned_to UUID REFERENCES users(id),
    completion_date TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    notes TEXT,
    risk_impact INTEGER CHECK (risk_impact >= 0 AND risk_impact <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Benchmarks Table
CREATE TABLE risk_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    population VARCHAR(100) NOT NULL,
    average DECIMAL(5,2) NOT NULL,
    p10 DECIMAL(5,2) NOT NULL,
    p25 DECIMAL(5,2) NOT NULL,
    p50 DECIMAL(5,2) NOT NULL,
    p75 DECIMAL(5,2) NOT NULL,
    p90 DECIMAL(5,2) NOT NULL,
    risk_threshold_low DECIMAL(5,2) NOT NULL,
    risk_threshold_moderate DECIMAL(5,2) NOT NULL,
    risk_threshold_high DECIMAL(5,2) NOT NULL,
    risk_threshold_critical DECIMAL(5,2) NOT NULL,
    sample_size INTEGER NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, metric, population)
);

-- Risk Assessment History Table
CREATE TABLE risk_assessment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    overall_risk_score INTEGER NOT NULL CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    category_scores JSONB DEFAULT '{}',
    major_changes TEXT[] DEFAULT '{}',
    notes TEXT,
    assessor UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Insights Table
CREATE TABLE risk_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('achievement', 'concern', 'opportunity', 'trend')),
    impact VARCHAR(20) NOT NULL CHECK (impact IN ('positive', 'negative', 'neutral')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    actionable BOOLEAN NOT NULL DEFAULT true,
    suggested_actions TEXT[] DEFAULT '{}',
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Configuration Table
CREATE TABLE risk_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
    enabled_categories TEXT[] DEFAULT '{chronic_disease,lifestyle,preventive,mental_health,environmental}',
    weights JSONB DEFAULT '{}',
    thresholds JSONB DEFAULT '{}',
    assessment_frequency VARCHAR(20) NOT NULL DEFAULT '90d',
    auto_alerts BOOLEAN NOT NULL DEFAULT true,
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intervention Plans Table
CREATE TABLE intervention_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'paused', 'cancelled')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    effectiveness INTEGER CHECK (effectiveness >= 0 AND effectiveness <= 100),
    feasibility INTEGER CHECK (feasibility >= 0 AND feasibility <= 100),
    cost DECIMAL(10,2),
    timeframe VARCHAR(100) NOT NULL,
    required_effort INTEGER CHECK (required_effort >= 0 AND required_effort <= 100),
    resources TEXT[] DEFAULT '{}',
    provider VARCHAR(255),
    start_date TIMESTAMP WITH TIME ZONE,
    target_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    outcomes JSONB DEFAULT '{}',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_risk_assessments_member_id ON risk_assessments(member_id);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_assessment_date ON risk_assessments(assessment_date);
CREATE INDEX idx_risk_assessments_next_assessment_due ON risk_assessments(next_assessment_due);

CREATE INDEX idx_risk_category_scores_assessment_id ON risk_category_scores(assessment_id);
CREATE INDEX idx_risk_category_scores_category ON risk_category_scores(category);
CREATE INDEX idx_risk_category_scores_level ON risk_category_scores(level);

CREATE INDEX idx_risk_factors_member_id ON risk_factors(member_id);
CREATE INDEX idx_risk_factors_category ON risk_factors(category);
CREATE INDEX idx_risk_factors_risk_level ON risk_factors(risk_level);
CREATE INDEX idx_risk_factors_name ON risk_factors(name);

CREATE INDEX idx_risk_data_points_risk_factor_id ON risk_data_points(risk_factor_id);
CREATE INDEX idx_risk_data_points_timestamp ON risk_data_points(timestamp);

CREATE INDEX idx_risk_recommendations_member_id ON risk_recommendations(member_id);
CREATE INDEX idx_risk_recommendations_assessment_id ON risk_recommendations(assessment_id);
CREATE INDEX idx_risk_recommendations_status ON risk_recommendations(status);
CREATE INDEX idx_risk_recommendations_priority ON risk_recommendations(priority);
CREATE INDEX idx_risk_recommendations_category ON risk_recommendations(category);

CREATE INDEX idx_risk_alerts_member_id ON risk_alerts(member_id);
CREATE INDEX idx_risk_alerts_severity ON risk_alerts(severity);
CREATE INDEX idx_risk_alerts_read ON risk_alerts(read);
CREATE INDEX idx_risk_alerts_acknowledged ON risk_alerts(acknowledged);
CREATE INDEX idx_risk_alerts_created_at ON risk_alerts(created_at);

CREATE INDEX idx_risk_predictions_member_id ON risk_predictions(member_id);
CREATE INDEX idx_risk_predictions_prediction_type ON risk_predictions(prediction_type);
CREATE INDEX idx_risk_predictions_valid_until ON risk_predictions(valid_until);

CREATE INDEX idx_risk_action_items_member_id ON risk_action_items(member_id);
CREATE INDEX idx_risk_action_items_assessment_id ON risk_action_items(assessment_id);
CREATE INDEX idx_risk_action_items_status ON risk_action_items(status);
CREATE INDEX idx_risk_action_items_due_date ON risk_action_items(due_date);

CREATE INDEX idx_risk_assessment_history_member_id ON risk_assessment_history(member_id);
CREATE INDEX idx_risk_assessment_history_assessment_date ON risk_assessment_history(assessment_date);

CREATE INDEX idx_risk_insights_member_id ON risk_insights(member_id);
CREATE INDEX idx_risk_insights_type ON risk_insights(type);
CREATE INDEX idx_risk_insights_priority ON risk_insights(priority);

CREATE INDEX idx_intervention_plans_member_id ON intervention_plans(member_id);
CREATE INDEX idx_intervention_plans_status ON intervention_plans(status);

-- Composite indexes for common queries
CREATE INDEX idx_risk_assessments_member_level_date ON risk_assessments(member_id, risk_level, assessment_date);
CREATE INDEX idx_risk_recommendations_member_status_priority ON risk_recommendations(member_id, status, priority);
CREATE INDEX idx_risk_alerts_member_severity_read ON risk_alerts(member_id, severity, read);
CREATE INDEX idx_risk_action_items_member_status_due ON risk_action_items(member_id, status, due_date);

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all relevant tables
CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_factors_updated_at BEFORE UPDATE ON risk_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_recommendations_updated_at BEFORE UPDATE ON risk_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_action_items_updated_at BEFORE UPDATE ON risk_action_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_benchmarks_updated_at BEFORE UPDATE ON risk_benchmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_configurations_updated_at BEFORE UPDATE ON risk_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_plans_updated_at BEFORE UPDATE ON intervention_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default risk benchmarks
INSERT INTO risk_benchmarks (category, metric, population, average, p10, p25, p50, p75, p90, risk_threshold_low, risk_threshold_moderate, risk_threshold_high, risk_threshold_critical, sample_size) VALUES
('Chronic Disease Risk', 'risk_score', 'general', 45.0, 15.0, 25.0, 40.0, 55.0, 70.0, 30.0, 50.0, 75.0, 90.0, 5000),
('Lifestyle Risk', 'risk_score', 'general', 38.0, 12.0, 20.0, 35.0, 48.0, 65.0, 25.0, 45.0, 70.0, 85.0, 5000),
('Preventive Care Risk', 'risk_score', 'general', 32.0, 10.0, 18.0, 30.0, 42.0, 58.0, 20.0, 40.0, 65.0, 80.0, 5000),
('Mental Health Risk', 'risk_score', 'general', 28.0, 8.0, 15.0, 25.0, 38.0, 52.0, 20.0, 35.0, 60.0, 75.0, 5000),
('Environmental Risk', 'risk_score', 'general', 22.0, 5.0, 12.0, 20.0, 30.0, 42.0, 15.0, 30.0, 50.0, 70.0, 5000),

('Chronic Disease Risk', 'risk_score', '18-35', 25.0, 8.0, 15.0, 22.0, 32.0, 45.0, 15.0, 30.0, 55.0, 75.0, 2000),
('Chronic Disease Risk', 'risk_score', '36-50', 42.0, 18.0, 28.0, 38.0, 52.0, 68.0, 25.0, 45.0, 70.0, 88.0, 2000),
('Chronic Disease Risk', 'risk_score', '51-65', 58.0, 32.0, 42.0, 55.0, 68.0, 82.0, 35.0, 55.0, 78.0, 92.0, 1500),
('Chronic Disease Risk', 'risk_score', '65+', 72.0, 48.0, 58.0, 70.0, 82.0, 92.0, 45.0, 65.0, 85.0, 95.0, 1000),

('Lifestyle Risk', 'bmi', 'general', 28.5, 22.1, 24.5, 27.8, 31.2, 35.8, 18.5, 25.0, 30.0, 35.0, 5000),
('Lifestyle Risk', 'exercise_minutes_week', 'general', 85.0, 0.0, 30.0, 75.0, 140.0, 200.0, 30.0, 75.0, 150.0, 300.0, 5000),
('Lifestyle Risk', 'sleep_hours', 'general', 7.2, 5.5, 6.2, 7.0, 8.0, 8.8, 6.0, 7.0, 8.0, 9.0, 5000);

-- Insert default risk configuration
INSERT INTO risk_configurations (member_id, enabled_categories, weights, thresholds, assessment_frequency, auto_alerts, notification_preferences) VALUES
('00000000-0000-0000-0000-000000000000',
 ARRAY['chronic_disease', 'lifestyle', 'preventive', 'mental_health', 'environmental'],
 '{"chronic_disease": 0.35, "lifestyle": 0.25, "preventive": 0.20, "mental_health": 0.15, "environmental": 0.05}',
 '{"low": 30, "moderate": 50, "high": 75, "critical": 90}',
 '90d',
 true,
 '{"email": true, "sms": false, "push": true, "frequency": "daily", "minSeverity": "warning"}'
);

-- Views for common queries
CREATE VIEW risk_member_summary AS
SELECT
    m.id as member_id,
    m.first_name,
    m.last_name,
    ra.overall_risk_score,
    ra.risk_level,
    ra.assessment_date,
    ra.next_assessment_due,
    ra.compliance_level,
    COUNT(DISTINCT CASE WHEN rr.status = 'pending' THEN rr.id END) as pending_recommendations,
    COUNT(DISTINCT CASE WHEN rai.status = 'pending' THEN rai.id END) as pending_action_items,
    COUNT(DISTINCT CASE WHEN raa.severity = 'critical' AND NOT raa.acknowledged THEN raa.id END) as critical_alerts
FROM members m
LEFT JOIN risk_assessments ra ON m.id = ra.member_id
LEFT JOIN risk_recommendations rr ON m.id = rr.member_id
LEFT JOIN risk_action_items rai ON m.id = rai.member_id
LEFT JOIN risk_alerts raa ON m.id = raa.member_id
WHERE ra.assessment_date = (
    SELECT MAX(assessment_date)
    FROM risk_assessments ra2
    WHERE ra2.member_id = m.id
)
GROUP BY m.id, ra.id;

CREATE VIEW risk_trend_analysis AS
SELECT
    member_id,
    assessment_date,
    overall_risk_score,
    risk_level,
    LAG(overall_risk_score) OVER (PARTITION BY member_id ORDER BY assessment_date) as previous_score,
    overall_risk_score - LAG(overall_risk_score) OVER (PARTITION BY member_id ORDER BY assessment_date) as score_change,
    CASE
        WHEN overall_risk_score - LAG(overall_risk_score) OVER (PARTITION BY member_id ORDER BY assessment_date) > 5 THEN 'declining'
        WHEN overall_risk_score - LAG(overall_risk_score) OVER (PARTITION BY member_id ORDER BY assessment_date) < -5 THEN 'improving'
        ELSE 'stable'
    END as trend
FROM risk_assessments
ORDER BY member_id, assessment_date;

-- Stored procedure for automatic risk assessment calculation
CREATE OR REPLACE FUNCTION calculate_member_risk_assessment(p_member_id UUID)
RETURNS UUID AS $$
DECLARE
    v_assessment_id UUID;
    v_overall_score DECIMAL;
    v_risk_level VARCHAR(20);
    v_compliance_level DECIMAL;
    v_confidence_score DECIMAL;
BEGIN
    -- Generate new assessment ID
    v_assessment_id := uuid_generate_v4();

    -- Calculate overall risk score from factors
    SELECT
        COALESCE(AVG(
            CASE
                WHEN rf.risk_level = 'critical' THEN 90
                WHEN rf.risk_level = 'high' THEN 75
                WHEN rf.risk_level = 'moderate' THEN 50
                ELSE 25
            END * (rf.impact / 100.0)
        ), 0)
    INTO v_overall_score
    FROM risk_factors rf
    WHERE rf.member_id = p_member_id;

    -- Determine risk level
    IF v_overall_score >= 90 THEN
        v_risk_level := 'critical';
    ELSIF v_overall_score >= 75 THEN
        v_risk_level := 'high';
    ELSIF v_overall_score >= 50 THEN
        v_risk_level := 'moderate';
    ELSE
        v_risk_level := 'low';
    END IF;

    -- Calculate compliance level
    SELECT
        CASE
            WHEN COUNT(*) = 0 THEN 100
            ELSE (COUNT(*) - SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)) * 100.0 / COUNT(*)
        END
    INTO v_compliance_level
    FROM risk_recommendations
    WHERE member_id = p_member_id
    AND created_at >= NOW() - INTERVAL '90 days';

    -- Calculate confidence score based on data quality
    SELECT
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE AVG(confidence)
        END
    INTO v_confidence_score
    FROM risk_factors rf
    WHERE rf.member_id = p_member_id;

    -- Insert new assessment
    INSERT INTO risk_assessments (
        id,
        member_id,
        overall_risk_score,
        risk_level,
        assessment_date,
        next_assessment_due,
        compliance_level,
        confidence_score
    ) VALUES (
        v_assessment_id,
        p_member_id,
        ROUND(v_overall_score),
        v_risk_level,
        NOW(),
        NOW() + INTERVAL '90 days',
        ROUND(v_compliance_level),
        ROUND(v_confidence_score)
    );

    -- Return the assessment ID
    RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql;