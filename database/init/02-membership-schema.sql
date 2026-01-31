-- ==========================================
-- Membership Service - Database Schema
-- ==========================================
-- This script initializes the membership database schema

\c membership

-- Create ENUMs
CREATE TYPE IF NOT EXISTS membership_status AS ENUM ('pending', 'active', 'suspended', 'terminated', 'expired');
CREATE TYPE IF NOT EXISTS member_type AS ENUM ('principal', 'dependent');
CREATE TYPE IF NOT EXISTS dependent_type AS ENUM ('spouse', 'child', 'parent');
CREATE TYPE IF NOT EXISTS gender AS ENUM ('male', 'female', 'other');
CREATE TYPE IF NOT EXISTS marital_status AS ENUM ('single', 'married', 'divorced', 'widowed');
CREATE TYPE IF NOT EXISTS document_type AS ENUM ('national_id', 'passport', 'birth_certificate', 'marriage_certificate', 'employment_letter', 'medical_report', 'student_letter', 'disability_certificate', 'income_proof', 'address_proof', 'other');
CREATE TYPE IF NOT EXISTS life_event_type AS ENUM ('enrollment', 'activation', 'suspension', 'reinstatement', 'termination', 'renewal', 'benefit_change', 'coverage_update', 'data_update');
CREATE TYPE IF NOT EXISTS communication_type AS ENUM ('enrollment_confirmation', 'suspension_notice', 'termination_notice', 'renewal_notification', 'benefit_update', 'payment_reminder', 'wellness_invite', 'policy_update', 'general_announcement', 'compliance_notice');

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  member_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  other_name VARCHAR(50),
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender,
  marital_status marital_status,
  national_id VARCHAR(50),
  passport_number VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'Kenya',
  employee_id VARCHAR(50) NOT NULL,
  member_type member_type DEFAULT 'principal',
  principal_id INTEGER REFERENCES members(id),
  dependent_type dependent_type,
  membership_status membership_status DEFAULT 'pending',
  enrollment_date DATE NOT NULL,
  activation_date DATE,
  last_suspension_date DATE,
  suspension_reason TEXT,
  termination_date DATE,
  termination_reason TEXT,
  renewal_date DATE,
  beneficiary_name VARCHAR(100),
  beneficiary_relationship VARCHAR(50),
  beneficiary_contact VARCHAR(100),
  has_disability BOOLEAN DEFAULT false,
  disability_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS member_member_id_idx ON members(member_id);
CREATE INDEX IF NOT EXISTS member_email_idx ON members(email);
CREATE INDEX IF NOT EXISTS member_company_idx ON members(company_id);
CREATE INDEX IF NOT EXISTS member_status_idx ON members(membership_status);
CREATE INDEX IF NOT EXISTS member_name_idx ON members(last_name, first_name, other_name);

-- Create member_life_events table
CREATE TABLE IF NOT EXISTS member_life_events (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_type life_event_type NOT NULL,
  event_date DATE NOT NULL,
  previous_status membership_status,
  new_status membership_status,
  reason TEXT,
  notes TEXT,
  processed_by INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS life_event_member_idx ON member_life_events(member_id);
CREATE INDEX IF NOT EXISTS life_event_date_idx ON member_life_events(event_date);
CREATE INDEX IF NOT EXISTS life_event_type_idx ON member_life_events(event_type);

-- Create member_documents table
CREATE TABLE IF NOT EXISTS member_documents (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  checksum VARCHAR(64),
  expires_at DATE,
  is_verified BOOLEAN DEFAULT false,
  verification_date DATE,
  verified_by INTEGER,
  uploaded_by INTEGER,
  tags JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS doc_member_idx ON member_documents(member_id);
CREATE INDEX IF NOT EXISTS doc_type_idx ON member_documents(document_type);
CREATE INDEX IF NOT EXISTS doc_verified_idx ON member_documents(is_verified);

-- Create member_consents table
CREATE TABLE IF NOT EXISTS member_consents (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  consent_version VARCHAR(20) NOT NULL,
  is_consented BOOLEAN NOT NULL,
  consent_date DATE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  document_id INTEGER REFERENCES member_documents(id),
  withdrawn_at DATE,
  withdrawn_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS consent_member_idx ON member_consents(member_id);
CREATE INDEX IF NOT EXISTS consent_type_idx ON member_consents(consent_type);
CREATE INDEX IF NOT EXISTS consent_consented_idx ON member_consents(is_consented);

-- Create communication_logs table
CREATE TABLE IF NOT EXISTS communication_logs (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  communication_type communication_type NOT NULL,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  template_id VARCHAR(100),
  scheduled_at TIMESTAMP,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS comm_member_idx ON communication_logs(member_id);
CREATE INDEX IF NOT EXISTS comm_type_idx ON communication_logs(communication_type);
CREATE INDEX IF NOT EXISTS comm_status_idx ON communication_logs(status);
CREATE INDEX IF NOT EXISTS comm_channel_idx ON communication_logs(channel);

-- Create dependent_rules table
CREATE TABLE IF NOT EXISTS dependent_rules (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  dependent_type dependent_type NOT NULL,
  max_age INTEGER,
  min_age INTEGER,
  max_number INTEGER,
  required_documents JSONB,
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS dependent_rules_company_idx ON dependent_rules(company_id);
CREATE INDEX IF NOT EXISTS dependent_rules_type_idx ON dependent_rules(dependent_type);
CREATE INDEX IF NOT EXISTS dependent_rules_active_idx ON dependent_rules(is_active);

-- Create member_eligibility table
CREATE TABLE IF NOT EXISTS member_eligibility (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  benefit_id INTEGER NOT NULL,
  is_eligible BOOLEAN NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  coverage_limit DECIMAL(12,2),
  remaining_limit DECIMAL(12,2),
  utilization_count INTEGER DEFAULT 0,
  last_utilization_date DATE,
  restrictions JSONB,
  conditions JSONB,
  notes TEXT,
  verified_at TIMESTAMP,
  verified_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS eligibility_member_idx ON member_eligibility(member_id);
CREATE INDEX IF NOT EXISTS eligibility_benefit_idx ON member_eligibility(benefit_id);
CREATE INDEX IF NOT EXISTS eligibility_eligible_idx ON member_eligibility(is_eligible);

-- Create triggers for updated_at
CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER member_documents_updated_at BEFORE UPDATE ON member_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER member_consents_updated_at BEFORE UPDATE ON member_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER communication_logs_updated_at BEFORE UPDATE ON communication_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER dependent_rules_updated_at BEFORE UPDATE ON dependent_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER member_eligibility_updated_at BEFORE UPDATE ON member_eligibility
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for created_at
CREATE TRIGGER members_created_at BEFORE INSERT ON members
  FOR EACH ROW EXECUTE FUNCTION set_created_at_column();
