-- ==========================================
-- API Gateway - Database Schema
-- ==========================================
-- This script initializes the api_gateway database schema

\c api_gateway

-- Basic schema structure
-- Full schema to be defined based on api-gateway Drizzle models

-- Create a basic table to initialize the database
CREATE TABLE IF NOT EXISTS gateway_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER gateway_config_updated_at BEFORE UPDATE ON gateway_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
