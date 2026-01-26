-- Create databases for each microservice expected by docker-compose
-- This script relies on psql's \gexec to execute conditional CREATE DATABASE statements.
-- It is safe during docker-entrypoint-initdb.d execution.

-- billing
SELECT 'CREATE DATABASE billing' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'billing'
)\gexec

-- finance
SELECT 'CREATE DATABASE finance' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'finance'
)\gexec

-- hospital
SELECT 'CREATE DATABASE hospital' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'hospital'
)\gexec

-- insurance
SELECT 'CREATE DATABASE insurance' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'insurance'
)\gexec

-- membership
SELECT 'CREATE DATABASE membership' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'membership'
)\gexec

-- crm
SELECT 'CREATE DATABASE crm' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'crm'
)\gexec

-- wellness
SELECT 'CREATE DATABASE wellness' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'wellness'
)\gexec
