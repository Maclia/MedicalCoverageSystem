-- Create databases for each microservice expected by docker-compose
-- This script relies on psql's \gexec to execute conditional CREATE DATABASE statements.
-- It is safe during docker-entrypoint-initdb.d execution.

-- billing
SELECT 'CREATE DATABASE medical_coverage_billing' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_billing'
)\gexec

-- finance
SELECT 'CREATE DATABASE medical_coverage_finance' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_finance'
)\gexec

-- hospital
SELECT 'CREATE DATABASE medical_coverage_hospital' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_hospital'
)\gexec

-- insurance
SELECT 'CREATE DATABASE medical_coverage_insurance' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_insurance'
)\gexec

-- membership
SELECT 'CREATE DATABASE medical_coverage_membership' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_membership'
)\gexec

-- crm
SELECT 'CREATE DATABASE medical_coverage_crm' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_crm'
)\gexec

-- wellness
SELECT 'CREATE DATABASE medical_coverage_wellness' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_wellness'
)\gexec

-- api_gateway
SELECT 'CREATE DATABASE api_gateway' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'api_gateway'
)\gexec

-- core
SELECT 'CREATE DATABASE medical_coverage_core' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'medical_coverage_core'
)\gexec
