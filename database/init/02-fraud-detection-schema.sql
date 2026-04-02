-- ==========================================
-- Fraud Detection Service - Database Schema
-- ==========================================
-- This script initializes the fraud detection database schema

\c medical_coverage_fraud_detection

-- Create helper function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Risk Level Enum
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Assessment Type Enum
CREATE TYPE assessment_type AS ENUM ('CLAIM', 'ENROLLMENT', 'PROVIDER');

-- Status Enum
CREATE TYPE assessment_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPEALED', 'OVERRIDDEN');

-- ==========================================
-- Claim Fraud Assessments
-- ==========================================
CREATE TABLE IF NOT EXISTS claim_fraud_assessments (
  id UUID PRIMARY KEY,
  claim_id UUID NOT NULL,
  member_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  claim_amount DECIMAL(12, 2) NOT NULL,
  
  -- Risk Scoring
  risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  risk_level risk_level NOT NULL DEFAULT 'LOW',
  
  -- Detection Results
  anomaly_detection_score DECIMAL(5, 2),
  geolocation_score DECIMAL(5, 2),
  external_db_score DECIMAL(5, 2),
  nlp_score DECIMAL(5, 2),
  
  -- Flags
  is_anomaly BOOLEAN DEFAULT false,
  geolocation_flag BOOLEAN DEFAULT false,
  external_db_flag BOOLEAN DEFAULT false,
  nlp_flag BOOLEAN DEFAULT false,
  
  -- Assessment metadata
  assessment_status assessment_status DEFAULT 'PENDING',
  flagged_for_investigation BOOLEAN DEFAULT false,
  investigation_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessed_at TIMESTAMP
);

CREATE TRIGGER claim_fraud_assessments_updated_at BEFORE UPDATE ON claim_fraud_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_claim_fraud_assessments_claim_id ON claim_fraud_assessments(claim_id);
CREATE INDEX idx_claim_fraud_assessments_member_id ON claim_fraud_assessments(member_id);
CREATE INDEX idx_claim_fraud_assessments_provider_id ON claim_fraud_assessments(provider_id);
CREATE INDEX idx_claim_fraud_assessments_risk_level ON claim_fraud_assessments(risk_level);
CREATE INDEX idx_claim_fraud_assessments_status ON claim_fraud_assessments(assessment_status);

-- ==========================================
-- Enrollment Fraud Assessments
-- ==========================================
CREATE TABLE IF NOT EXISTS enrollment_fraud_assessments (
  id UUID PRIMARY KEY,
  enrollment_id UUID NOT NULL,
  member_id UUID NOT NULL,
  company_id UUID NOT NULL,
  coverage_amount DECIMAL(12, 2) NOT NULL,
  
  -- Risk Scoring
  risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  risk_level risk_level NOT NULL DEFAULT 'LOW',
  
  -- Detection Results
  document_verification_score DECIMAL(5, 2),
  identity_verification_score DECIMAL(5, 2),
  geolocation_score DECIMAL(5, 2),
  nlp_score DECIMAL(5, 2),
  
  -- Flags
  document_flag BOOLEAN DEFAULT false,
  identity_flag BOOLEAN DEFAULT false,
  geolocation_flag BOOLEAN DEFAULT false,
  nlp_flag BOOLEAN DEFAULT false,
  
  -- Assessment metadata
  assessment_status assessment_status DEFAULT 'PENDING',
  flagged_for_review BOOLEAN DEFAULT false,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessed_at TIMESTAMP
);

CREATE TRIGGER enrollment_fraud_assessments_updated_at BEFORE UPDATE ON enrollment_fraud_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_enrollment_fraud_assessments_enrollment_id ON enrollment_fraud_assessments(enrollment_id);
CREATE INDEX idx_enrollment_fraud_assessments_member_id ON enrollment_fraud_assessments(member_id);
CREATE INDEX idx_enrollment_fraud_assessments_company_id ON enrollment_fraud_assessments(company_id);
CREATE INDEX idx_enrollment_fraud_assessments_risk_level ON enrollment_fraud_assessments(risk_level);
CREATE INDEX idx_enrollment_fraud_assessments_status ON enrollment_fraud_assessments(assessment_status);

-- ==========================================
-- Provider Fraud Assessments
-- ==========================================
CREATE TABLE IF NOT EXISTS provider_fraud_assessments (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  provider_npi VARCHAR(20),
  
  -- Risk Scoring
  risk_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  risk_level risk_level NOT NULL DEFAULT 'LOW',
  
  -- Detection Results
  overbilling_score DECIMAL(5, 2),
  unbundling_score DECIMAL(5, 2),
  coding_error_score DECIMAL(5, 2),
  pattern_score DECIMAL(5, 2),
  
  -- Flags
  overbilling_flag BOOLEAN DEFAULT false,
  unbundling_flag BOOLEAN DEFAULT false,
  coding_error_flag BOOLEAN DEFAULT false,
  pattern_flag BOOLEAN DEFAULT false,
  
  -- Assessment metadata
  assessment_status assessment_status DEFAULT 'PENDING',
  flagged_for_audit BOOLEAN DEFAULT false,
  audit_notes TEXT,
  claims_reviewed INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessed_at TIMESTAMP
);

CREATE TRIGGER provider_fraud_assessments_updated_at BEFORE UPDATE ON provider_fraud_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_provider_fraud_assessments_provider_id ON provider_fraud_assessments(provider_id);
CREATE INDEX idx_provider_fraud_assessments_risk_level ON provider_fraud_assessments(risk_level);
CREATE INDEX idx_provider_fraud_assessments_status ON provider_fraud_assessments(assessment_status);

-- ==========================================
-- Fraud Detection Logs
-- ==========================================
CREATE TABLE IF NOT EXISTS fraud_detection_logs (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL,
  assessment_type assessment_type NOT NULL,
  
  detection_method VARCHAR(100) NOT NULL,
  detection_result JSONB,
  confidence_score DECIMAL(5, 2),
  
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  
  execution_time_ms INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_detection_logs_assessment_id ON fraud_detection_logs(assessment_id);
CREATE INDEX idx_fraud_detection_logs_assessment_type ON fraud_detection_logs(assessment_type);
CREATE INDEX idx_fraud_detection_logs_detection_method ON fraud_detection_logs(detection_method);

-- ==========================================
-- Fraud Configuration
-- ==========================================
CREATE TABLE IF NOT EXISTS fraud_detection_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER fraud_detection_config_updated_at BEFORE UPDATE ON fraud_detection_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration
INSERT INTO fraud_detection_config (key, value, description, is_active) VALUES
  ('risk_score_threshold', '50', 'Minimum risk score to flag an assessment for investigation', true),
  ('auto_decline_threshold', '75', 'Risk score threshold for automatic claim decline', true),
  ('impossible_travel_threshold_km', '900', 'Distance threshold in km for impossible travel detection', true),
  ('anomaly_detection_enabled', 'true', 'Enable anomaly detection service', true),
  ('geolocation_check_enabled', 'true', 'Enable geolocation verification', true),
  ('external_db_check_enabled', 'true', 'Enable external database checks (MIB, NICB, NDH)', true),
  ('nlp_analysis_enabled', 'true', 'Enable NLP text analysis', true),
  ('automated_flagging_enabled', 'true', 'Automatically flag cases for investigation', true)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- Fraud Investigation Queue
-- ==========================================
CREATE TABLE IF NOT EXISTS fraud_investigation_queue (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL UNIQUE,
  assessment_type assessment_type NOT NULL,
  
  priority INTEGER DEFAULT 0,
  assigned_to UUID,
  assigned_at TIMESTAMP,
  
  investigation_status VARCHAR(50) DEFAULT 'PENDING',
  investigation_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER fraud_investigation_queue_updated_at BEFORE UPDATE ON fraud_investigation_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_fraud_investigation_queue_status ON fraud_investigation_queue(investigation_status);
CREATE INDEX idx_fraud_investigation_queue_assigned_to ON fraud_investigation_queue(assigned_to);
CREATE INDEX idx_fraud_investigation_queue_priority ON fraud_investigation_queue(priority DESC);

-- ==========================================
-- Audit Trail
-- ==========================================
CREATE TABLE IF NOT EXISTS fraud_detection_audit (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor_id UUID,
  actor_role VARCHAR(50),
  
  old_values JSONB,
  new_values JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_detection_audit_assessment_id ON fraud_detection_audit(assessment_id);
CREATE INDEX idx_fraud_detection_audit_actor_id ON fraud_detection_audit(actor_id);
