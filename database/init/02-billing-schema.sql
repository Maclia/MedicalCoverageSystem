-- ==========================================
-- Billing Service - Database Schema
-- ==========================================
-- This script initializes the billing database schema

\c billing

-- Basic schema structure
-- Full schema to be defined based on billing-service Drizzle models

-- Create a basic table to initialize the database
CREATE TABLE IF NOT EXISTS billing_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER billing_config_updated_at BEFORE UPDATE ON billing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
