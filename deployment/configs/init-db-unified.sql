-- Medical Coverage System Unified Database Initialization Script
-- This script initializes both main and finance databases in a unified PostgreSQL instance

-- Main Application Database
\c ${POSTGRES_DB:-medical_coverage};

-- Main application schema and tables
CREATE SCHEMA IF NOT EXISTS medical_app;

-- Users table (shared between main and finance services)
CREATE TABLE IF NOT EXISTS medical_app.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'doctor', 'nurse', 'staff', 'user', 'finance_admin')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    profile_picture_url VARCHAR(500),
    department VARCHAR(100),
    license_number VARCHAR(100),
    specialization TEXT[]
);

-- Enable UUID extension for finance service
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Session management table (shared)
CREATE TABLE IF NOT EXISTS medical_app.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES medical_app.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Audit log table (shared)
CREATE TABLE IF NOT EXISTS medical_app.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES medical_app.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    service VARCHAR(50) DEFAULT 'main' CHECK (service IN ('main', 'finance'))
);

-- Main application tables
CREATE TABLE IF NOT EXISTS medical_app.patients (
    id SERIAL PRIMARY KEY,
    medical_record_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    blood_type VARCHAR(10),
    allergies TEXT,
    medical_history TEXT,
    insurance_provider VARCHAR(200),
    insurance_policy_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES medical_app.users(id)
);

CREATE TABLE IF NOT EXISTS medical_app.appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES medical_app.patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES medical_app.users(id) ON DELETE SET NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES medical_app.users(id)
);

CREATE TABLE IF NOT EXISTS medical_app.coverage_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    provider VARCHAR(200) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    coverage_details JSONB,
    monthly_premium DECIMAL(10,2),
    annual_limit DECIMAL(10,2),
    deductible DECIMAL(10,2),
    co_payment_percentage DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_app.patient_coverage (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES medical_app.patients(id) ON DELETE CASCADE,
    coverage_plan_id INTEGER REFERENCES medical_app.coverage_plans(id) ON DELETE CASCADE,
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    monthly_premium DECIMAL(10,2),
    coverage_limits JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES medical_app.users(id)
);

-- Create indexes for main application
CREATE INDEX IF NOT EXISTS idx_users_email ON medical_app.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON medical_app.users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON medical_app.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON medical_app.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON medical_app.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON medical_app.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_medical_record_number ON medical_app.patients(medical_record_number);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON medical_app.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON medical_app.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON medical_app.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_patient_coverage_patient_id ON medical_app.patient_coverage(patient_id);

-- Finance Database Setup
\c medical_coverage_finance;

-- Finance service schema
CREATE SCHEMA IF NOT EXISTS finance_app;

-- Finance-specific tables
CREATE TABLE IF NOT EXISTS finance_app.billing_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL, -- Reference to main app users
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_type VARCHAR(50) DEFAULT 'individual' CHECK (account_type IN ('individual', 'family', 'corporate')),
    billing_address TEXT NOT NULL,
    billing_email VARCHAR(255) NOT NULL,
    billing_phone VARCHAR(20),
    payment_method VARCHAR(50) DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'insurance')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL -- Reference to main app users
);

CREATE TABLE IF NOT EXISTS finance_app.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_account_id INTEGER REFERENCES finance_app.billing_accounts(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL, -- Reference to main app patients
    service_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'disputed')),
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL -- Reference to main app users
);

CREATE TABLE IF NOT EXISTS finance_app.invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id UUID REFERENCES finance_app.invoices(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('consultation', 'procedure', 'medication', 'lab_test', 'imaging', 'other')),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    service_date DATE NOT NULL,
    provider_id INTEGER NOT NULL, -- Reference to main app users (doctors)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_app.payments (
    id SERIAL PRIMARY KEY,
    payment_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    invoice_id UUID REFERENCES finance_app.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'insurance')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    transaction_id VARCHAR(100),
    gateway_response JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL -- Reference to main app users
);

CREATE TABLE IF NOT EXISTS finance_app.claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES finance_app.invoices(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL, -- Reference to main app patients
    insurance_provider VARCHAR(200) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    claim_type VARCHAR(50) NOT NULL CHECK (claim_type IN ('medical', 'prescription', 'procedure', 'emergency', 'preventive')),
    service_date DATE NOT NULL,
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid', 'closed')),
    claim_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2),
 deductible_applied DECIMAL(12,2) DEFAULT 0,
    coinsurance_applied DECIMAL(12,2) DEFAULT 0,
 patient_responsibility DECIMAL(12,2),
    insurance_responsibility DECIMAL(12,2),
    explanation TEXT,
    denial_reason TEXT,
    approval_date TIMESTAMP WITH TIME ZONE,
    payment_date TIMESTAMP WITH TIME ZONE,
    created_by INTEGER NOT NULL, -- Reference to main app users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_app.commissions (
    id SERIAL PRIMARY KEY,
    commission_number VARCHAR(50) UNIQUE NOT NULL,
    provider_id INTEGER NOT NULL, -- Reference to main app users (doctors/staff)
    patient_id INTEGER NOT NULL, -- Reference to main app patients
    service_id UUID NOT NULL, -- Reference to invoice_items
    service_date DATE NOT NULL,
    commission_type VARCHAR(50) NOT NULL CHECK (commission_type IN ('consultation', 'procedure', 'referral', 'bonus')),
    service_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'approved', 'paid', 'cancelled')),
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by INTEGER NOT NULL, -- Reference to main app users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_app.fee_schedules (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(20) UNIQUE NOT NULL,
    service_description TEXT NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    standard_fee DECIMAL(10,2) NOT NULL,
    insurance_fee DECIMAL(10,2),
    patient_fee DECIMAL(10,2),
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL -- Reference to main app users
);

CREATE TABLE IF NOT EXISTS finance_app.financial_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('revenue', 'expenses', 'claims', 'commissions', 'aging', 'profit_loss')),
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER NOT NULL -- Reference to main app users
);

-- Create indexes for finance tables
CREATE INDEX IF NOT EXISTS idx_billing_accounts_user_id ON finance_app.billing_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_account_number ON finance_app.billing_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_account_id ON finance_app.invoices(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON finance_app.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON finance_app.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON finance_app.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON finance_app.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_date ON finance_app.invoice_items(service_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON finance_app.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON finance_app.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON finance_app.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON finance_app.claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON finance_app.claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_insurance_provider ON finance_app.claims(insurance_provider);
CREATE INDEX IF NOT EXISTS idx_commissions_provider_id ON finance_app.commissions(provider_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON finance_app.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_service_date ON finance_app.commissions(service_date);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_service_code ON finance_app.fee_schedules(service_code);
CREATE INDEX IF NOT EXISTS idx_fee_schedules_category ON finance_app.fee_schedules(service_category);

-- Create foreign key constraints between databases using triggers and functions
\c ${POSTGRES_DB:-medical_coverage};

-- Function to check if user exists in main database
CREATE OR REPLACE FUNCTION check_user_exists(user_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM medical_app.users WHERE id = user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Function to get user email for audit purposes
CREATE OR REPLACE FUNCTION get_user_email(user_id_param INTEGER)
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN (SELECT email FROM medical_app.users WHERE id = user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to main tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON medical_app.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON medical_app.patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON medical_app.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coverage_plans_updated_at BEFORE UPDATE ON medical_app.coverage_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_coverage_updated_at BEFORE UPDATE ON medical_app.patient_coverage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create finance service user for database connections
\c medical_coverage_finance;

-- Function to check if patient exists in main database
CREATE OR REPLACE FUNCTION check_patient_exists(patient_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- This would need to be implemented using foreign data wrapper or application logic
    -- For now, return true to allow manual validation
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at columns in finance tables
CREATE OR REPLACE FUNCTION update_finance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to finance tables
CREATE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON finance_app.billing_accounts FOR EACH ROW EXECUTE FUNCTION update_finance_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON finance_app.invoices FOR EACH ROW EXECUTE FUNCTION update_finance_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON finance_app.claims FOR EACH ROW EXECUTE FUNCTION update_finance_updated_at_column();
CREATE TRIGGER update_fee_schedules_updated_at BEFORE UPDATE ON finance_app.fee_schedules FOR EACH ROW EXECUTE FUNCTION update_finance_updated_at_column();

-- Insert default fee schedules for common services
INSERT INTO finance_app.fee_schedules (service_code, service_description, service_category, standard_fee, created_by) VALUES
('CONSULT_PRIMARY', 'Primary Care Consultation', 'Consultation', 120.00, 1),
('CONSULT_SPECIALIST', 'Specialist Consultation', 'Consultation', 250.00, 1),
('LAB_BASIC', 'Basic Laboratory Tests', 'Laboratory', 85.00, 1),
('LAB_COMPREHENSIVE', 'Comprehensive Laboratory Panel', 'Laboratory', 200.00, 1),
('IMAGING_XRAY', 'X-Ray Imaging', 'Imaging', 150.00, 1),
('IMAGING_ULTRASOUND', 'Ultrasound Imaging', 'Imaging', 300.00, 1),
('IMAGING_CT', 'CT Scan Imaging', 'Imaging', 500.00, 1),
('IMAGING_MRI', 'MRI Imaging', 'Imaging', 1200.00, 1),
('PROCEDURE_MINOR', 'Minor Medical Procedure', 'Procedure', 400.00, 1),
('PROCEDURE_MAJOR', 'Major Medical Procedure', 'Procedure', 2500.00, 1),
('VACCINATION', 'Vaccination Administration', 'Preventive', 75.00, 1),
('HEALTH_SCREENING', 'Annual Health Screening', 'Preventive', 350.00, 1)
ON CONFLICT (service_code) DO NOTHING;

-- Create views for financial reporting
CREATE OR REPLACE VIEW finance_app.monthly_revenue AS
SELECT
    DATE_TRUNC('month', i.created_at) as month,
    COUNT(*) as invoice_count,
    SUM(i.total_amount) as total_revenue
FROM finance_app.invoices i
WHERE i.status = 'paid'
GROUP BY DATE_TRUNC('month', i.created_at)
ORDER BY month DESC;

CREATE OR REPLACE VIEW finance_app.claims_summary AS
SELECT
    DATE_TRUNC('month', c.submitted_date) as month,
    COUNT(*) as total_claims,
    SUM(CASE WHEN c.status = 'approved' THEN 1 ELSE 0 END) as approved_claims,
    SUM(CASE WHEN c.status = 'denied' THEN 1 ELSE 0 END) as denied_claims,
    SUM(c.claim_amount) as total_claimed,
    SUM(COALESCE(c.approved_amount, 0)) as total_approved,
    SUM(COALESCE(c.patient_responsibility, 0)) as patient_responsibility,
    SUM(COALESCE(c.insurance_responsibility, 0)) as insurance_responsibility
FROM finance_app.claims c
GROUP BY DATE_TRUNC('month', c.submitted_date)
ORDER BY month DESC;

CREATE OR REPLACE VIEW finance_app.commissions_owed AS
SELECT
    DATE_TRUNC('month', c.calculation_date) as month,
    COUNT(*) as commission_count,
    SUM(c.commission_amount) as total_commissions
FROM finance_app.commissions c
WHERE c.status = 'approved'
GROUP BY DATE_TRUNC('month', c.calculation_date)
ORDER BY month DESC;

-- Insert initial admin user if not exists (this should be moved to application seed)
\c ${POSTGRES_DB:-medical_coverage};

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM medical_app.users WHERE email = 'admin@medicalcoverage.com') THEN
        INSERT INTO medical_app.users (email, password_hash, first_name, last_name, role, is_active, email_verified, created_by)
        VALUES (
            'admin@medicalcoverage.com',
            '$2b$10$placeholder_hash_change_in_production', -- Replace with actual hash
            'System',
            'Administrator',
            'admin',
            true,
            true,
            1
        );
        RAISE NOTICE 'Default admin user created. Please change the password immediately.';
    END IF;
END
$$;