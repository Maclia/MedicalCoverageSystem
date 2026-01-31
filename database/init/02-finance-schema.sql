-- ==========================================
-- Finance Service - Database Schema
-- ==========================================
-- This script initializes the finance database schema

\c finance

-- Basic schema structure
-- Full schema to be defined based on finance-service Drizzle models

-- Create a basic table to initialize the database
CREATE TABLE IF NOT EXISTS finance_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER finance_config_updated_at BEFORE UPDATE ON finance_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
