-- ==========================================
-- Wellness Service - Database Schema
-- ==========================================
-- This script initializes the wellness database schema

\c wellness

-- Basic schema structure
-- Full schema to be defined based on wellness-service Drizzle models

-- Create a basic table to initialize the database
CREATE TABLE IF NOT EXISTS wellness_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE TRIGGER wellness_config_updated_at BEFORE UPDATE ON wellness_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
