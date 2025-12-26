-- ==========================================
-- Medical Coverage System - Database Initialization
-- ==========================================
-- This script initializes the cluster with safe, schema-agnostic setup
-- that will not fail if application tables are not yet created.
-- Table-specific indexes and data inserts are handled by service migrations.

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

-- NOTE:
-- Index creation and data inserts that depend on application tables must be executed
-- by service-specific migrations after those tables exist. This avoids init-time failures.
