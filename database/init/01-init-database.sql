-- ==========================================
-- Medical Coverage System - Database Initialization
-- ==========================================
-- This script initializes the database with basic setup
-- and any required extensions

-- Set timezone
SET timezone = 'UTC';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create custom types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_tier_enum') THEN
        CREATE TYPE network_tier_enum AS ENUM ('tier_1', 'tier_2', 'tier_3', 'premium', 'basic', 'standard');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status_enum') THEN
        CREATE TYPE contract_status_enum AS ENUM ('draft', 'pending_approval', 'active', 'expired', 'terminated', 'suspended', 'renewal_pending');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tariff_status_enum') THEN
        CREATE TYPE tariff_status_enum AS ENUM ('draft', 'active', 'expired', 'suspended');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reimbursement_model_enum') THEN
        CREATE TYPE reimbursement_model_enum AS ENUM ('fee_for_service', 'capitation', 'bundled_payments', 'episode_based', 'value_based');
    END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_medical_institutions_name ON medical_institutions USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medical_institutions_type ON medical_institutions(type);
CREATE INDEX IF NOT EXISTS idx_medical_institutions_is_active ON medical_institutions(is_active);

CREATE INDEX IF NOT EXISTS idx_provider_contracts_status ON provider_contracts(status);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_institution_id ON provider_contracts(institution_id);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_expiry_date ON provider_contracts(expiry_date);

CREATE INDEX IF NOT EXISTS idx_provider_networks_network_tier ON provider_networks(network_tier);
CREATE INDEX IF NOT EXISTS idx_provider_networks_is_active ON provider_networks(is_active);

CREATE INDEX IF NOT EXISTS idx_provider_network_assignments_network_id ON provider_network_assignments(network_id);
CREATE INDEX IF NOT EXISTS idx_provider_network_assignments_institution_id ON provider_network_assignments(institution_id);
CREATE INDEX IF NOT EXISTS idx_provider_network_assignments_is_active ON provider_network_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_document_type ON contract_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_contract_documents_is_active ON contract_documents(is_active);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract_id ON contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_signer_type ON contract_signatures(signer_type);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_verification_status ON contract_signatures(verification_status);

CREATE INDEX IF NOT EXISTS idx_tariff_catalogs_is_active ON tariff_catalogs(is_active);
CREATE INDEX IF NOT EXISTS idx_tariff_items_catalog_id ON tariff_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_tariff_items_procedure_code ON tariff_items(procedure_code);

-- Create trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger function for created_at if not set
CREATE OR REPLACE FUNCTION set_created_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log initialization completion
INSERT INTO system_logs (level, message, metadata, created_at)
VALUES (
    'INFO',
    'Database initialized successfully',
    '{"extensions": ["uuid-ossp", "pg_trgm", "btree_gin", "btree_gist"], "timestamp": "' || NOW() || '"}'::jsonb,
    NOW()
) ON CONFLICT DO NOTHING;