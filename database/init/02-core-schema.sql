-- ==========================================
-- Core Service - Database Schema
-- ==========================================
-- This script initializes the core database schema

\c core

-- Basic schema structure
-- Full schema to be defined based on core-service Drizzle models

-- Create a basic table to initialize the database
CREATE TABLE IF NOT EXISTS core_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER core_config_updated_at BEFORE UPDATE ON core_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Card Management Tables
-- ==========================================

-- Create card status enum
CREATE TYPE IF NOT EXISTS card_status AS ENUM (
  'pending', 'active', 'inactive', 'expired', 'lost', 'stolen', 'damaged', 'replaced'
);

-- Create card template enum
CREATE TYPE IF NOT EXISTS card_template AS ENUM (
  'standard', 'premium', 'corporate', 'family', 'individual'
);

-- Create card type enum
CREATE TYPE IF NOT EXISTS card_type AS ENUM (
  'digital', 'physical', 'both'
);

-- Member Cards table
CREATE TABLE IF NOT EXISTS member_cards (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL,
  card_number TEXT NOT NULL UNIQUE,
  card_type card_type NOT NULL,
  status card_status DEFAULT 'pending' NOT NULL,
  template_type card_template DEFAULT 'standard' NOT NULL,
  issue_date TIMESTAMP,
  expiry_date TIMESTAMP NOT NULL,
  activation_date TIMESTAMP,
  deactivation_date TIMESTAMP,
  physical_card_printed BOOLEAN DEFAULT false,
  physical_card_shipped BOOLEAN DEFAULT false,
  physical_card_tracking TEXT,
  digital_card_url TEXT,
  qr_code_data TEXT,
  magnetic_stripe_data TEXT,
  chip_enabled BOOLEAN DEFAULT false,
  nfc_enabled BOOLEAN DEFAULT false,
  personalization_data TEXT,
  security_pin TEXT,
  replacement_reason TEXT,
  previous_card_id INTEGER REFERENCES member_cards(id),
  delivery_method TEXT DEFAULT 'standard_mail',
  delivery_address TEXT,
  batch_id TEXT,
  audit_log TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_cards_member_id ON member_cards(member_id);
CREATE INDEX IF NOT EXISTS idx_member_cards_status ON member_cards(status);
CREATE INDEX IF NOT EXISTS idx_member_cards_card_number ON member_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_member_cards_batch_id ON member_cards(batch_id);

CREATE TRIGGER member_cards_updated_at BEFORE UPDATE ON member_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Card Templates table
CREATE TABLE IF NOT EXISTS card_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_type card_template NOT NULL,
  template_description TEXT,
  background_color TEXT DEFAULT '#ffffff',
  foreground_color TEXT DEFAULT '#000000',
  accent_color TEXT DEFAULT '#1976d2',
  font_family TEXT DEFAULT 'Arial',
  logo_url TEXT,
  background_pattern TEXT,
  card_width REAL DEFAULT 85.6,
  card_height REAL DEFAULT 53.98,
  template_html TEXT,
  template_css TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_templates_type ON card_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_card_templates_active ON card_templates(is_active);

CREATE TRIGGER card_templates_updated_at BEFORE UPDATE ON card_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Card Verification Events table
CREATE TABLE IF NOT EXISTS card_verification_events (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES member_cards(id),
  member_id INTEGER NOT NULL,
  verifier_id INTEGER,
  verification_method TEXT NOT NULL,
  verification_result TEXT NOT NULL,
  verification_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  geolocation TEXT,
  verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  provider_response_time REAL,
  fraud_risk_score REAL DEFAULT 0,
  fraud_indicators TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_verification_card_id ON card_verification_events(card_id);
CREATE INDEX IF NOT EXISTS idx_card_verification_member_id ON card_verification_events(member_id);
CREATE INDEX IF NOT EXISTS idx_card_verification_result ON card_verification_events(verification_result);
CREATE INDEX IF NOT EXISTS idx_card_verification_timestamp ON card_verification_events(verification_timestamp);

-- Card Production Batches table
CREATE TABLE IF NOT EXISTS card_production_batches (
  id SERIAL PRIMARY KEY,
  batch_id TEXT NOT NULL UNIQUE,
  batch_name TEXT NOT NULL,
  batch_type TEXT NOT NULL,
  total_cards INTEGER NOT NULL,
  processed_cards INTEGER DEFAULT 0,
  production_status TEXT DEFAULT 'pending' NOT NULL,
  print_vendor TEXT,
  production_start_date TIMESTAMP,
  completion_date TIMESTAMP,
  shipping_date TIMESTAMP,
  tracking_numbers TEXT,
  cost_per_card REAL,
  total_cost REAL,
  production_notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_card_batches_batch_id ON card_production_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_card_batches_status ON card_production_batches(production_status);

CREATE TRIGGER card_production_batches_updated_at BEFORE UPDATE ON card_production_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
