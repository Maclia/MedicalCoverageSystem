-- Database initialization script for Medical Coverage System
-- This script runs when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types if needed
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'in_app', 'push', 'webhook');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- Create indexes for performance optimization
-- Note: These indexes will be created after tables are created by Drizzle migrations

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for soft delete with audit trail
CREATE OR REPLACE FUNCTION soft_delete_function()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    NEW.is_deleted = true;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        user_id,
        old_values,
        new_values,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(current_setting('app.current_user_id', true)::integer, 0),
        row_to_json(OLD),
        row_to_json(NEW),
        CURRENT_TIMESTAMP
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Set default configuration
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = '200';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';

-- PostgreSQL performance tuning
SELECT pg_reload_conf();

-- Create monitoring views
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries taking more than 1 second on average
ORDER BY mean_time DESC;

-- Create view for database size monitoring
CREATE OR REPLACE VIEW database_size AS
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Medical Coverage System database initialized successfully';
    RAISE NOTICE 'UUID extension enabled: %', EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');
    RAISE NOTICE 'Trigram extension enabled: %', EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm');
END $$;