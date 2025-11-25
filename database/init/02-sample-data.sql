-- ==========================================
-- Medical Coverage System - Sample Data
-- ==========================================
-- This script creates sample data for development and testing

-- Create sample medical institutions
INSERT INTO medical_institutions (name, type, address, contact_person, contact_email, contact_phone, is_active, created_at) VALUES
('City General Hospital', 'Hospital', '123 Main St, Nairobi, Kenya', 'Dr. Sarah Johnson', 'sarah.johnson@citygeneral.com', '+254-712-345-678', true, NOW()),
('MediCare Clinic', 'Clinic', '456 Health Ave, Mombasa, Kenya', 'Dr. Michael Chen', 'michael.chen@medicare.com', '+254-723-456-789', true, NOW()),
('Kenya Pharmacy Ltd', 'Pharmacy', '789 Medicine Rd, Kisumu, Kenya', 'Jane Wanjiru', 'jane.wanjiru@kenyapharmacy.com', '+254-734-567-890', true, NOW()),
('Dental Care Center', 'Clinic', '321 Smile Blvd, Nakuru, Kenya', 'Dr. Robert Kimani', 'robert.kimani@dentalcare.com', '+254-745-678-901', true, NOW()),
('Wellness Diagnostic Center', 'Diagnostic Center', '654 Lab Lane, Eldoret, Kenya', 'Dr. Amina Mohamed', 'amina.mohamed@wellness.com', '+254-756-789-012', true, NOW())
ON CONFLICT DO NOTHING;

-- Create provider networks
INSERT INTO provider_networks (network_name, network_tier, description, coverage_region, is_active, created_at) VALUES
('Premium National Network', 'premium', 'Top-tier hospitals and specialists nationwide', 'National', true, NOW()),
('Standard Regional Network', 'standard', 'Quality healthcare providers in major regions', 'Regional', true, NOW()),
('Basic Local Network', 'basic', 'Essential healthcare services at local level', 'Local', true, NOW()),
('Tier 1 Specialist Network', 'tier_1', 'Elite specialists and advanced care facilities', 'National', true, NOW())
ON CONFLICT DO NOTHING;

-- Assign institutions to networks
INSERT INTO provider_network_assignments (network_id, institution_id, effective_date, expiry_date, is_active, assignment_type, created_at) VALUES
(1, 1, '2024-01-01', '2025-12-31', true, 'full_coverage', NOW()),
(1, 2, '2024-01-01', '2025-12-31', true, 'selective', NOW()),
(2, 1, '2024-01-01', '2025-12-31', true, 'full_coverage', NOW()),
(2, 3, '2024-01-01', '2025-12-31', true, 'selective', NOW()),
(3, 2, '2024-01-01', '2025-12-31', true, 'full_coverage', NOW()),
(3, 4, '2024-01-01', '2025-12-31', true, 'selective', NOW()),
(4, 1, '2024-01-01', '2025-12-31', true, 'selective', NOW()),
(4, 5, '2024-01-01', '2025-12-31', true, 'full_coverage', NOW())
ON CONFLICT DO NOTHING;

-- Create sample contracts
INSERT INTO provider_contracts (
    institution_id, contract_number, contract_name, contract_type, status, reimbursement_model,
    effective_date, expiry_date, auto_renewal, renewal_term_months, termination_days,
    negotiated_discount, billing_cycle, payment_terms, contract_value, created_at
) VALUES
(1, 'PC-2024-1001', 'City General Hospital - Premium Service Agreement', 'service', 'active', 'fee_for_service',
 '2024-01-01', '2025-12-31', true, 12, 90, 5.0, 'monthly', 'NET_30', 5000000.00, NOW()),
(2, 'PC-2024-1002', 'MediCare Clinic - Standard Service Agreement', 'service', 'active', 'capitation',
 '2024-02-01', '2025-01-31', false, 12, 60, 0.0, 'monthly', 'NET_15', 1200000.00, NOW()),
(3, 'PC-2024-1003', 'Kenya Pharmacy - Network Participation', 'network', 'active', 'fee_for_service',
 '2024-01-15', '2025-12-31', true, 12, 30, 10.0, 'monthly', 'NET_30', 800000.00, NOW())
ON CONFLICT DO NOTHING;

-- Create sample medical procedures
INSERT INTO medical_procedures (
    procedure_code, procedure_name, category, description, base_cost, typical_duration,
    complexity_level, requires_preauthorization, clinical_code_system, clinical_code
) VALUES
('LAB001', 'Complete Blood Count', 'Laboratory', 'Complete blood count with differential', 1500.00, 30, 'low', false, 'ICD-10', 'Z00.0'),
('RAD001', 'Chest X-Ray', 'Radiology', 'Standard chest radiograph', 3500.00, 15, 'low', false, 'CPT', '71045'),
('SUR001', 'Appendectomy', 'Surgery', 'Laparoscopic appendectomy', 45000.00, 90, 'high', true, 'ICD-9-CM', '47.01'),
('GEN001', 'General Consultation', 'Consultation', 'General practitioner consultation', 2000.00, 20, 'low', false, 'CPT', '99213'),
('CAR001', 'Cardiology Consultation', 'Specialist', 'Cardiologist consultation and ECG', 5000.00, 45, 'medium', false, 'CPT', '99244'),
('DEN001', 'Dental Cleaning', 'Dental', 'Professional dental cleaning and polishing', 3000.00, 45, 'low', false, 'CDT', 'D1110')
ON CONFLICT DO NOTHING;

-- Create sample tariff catalog
INSERT INTO tariff_catalogs (catalog_name, description, effective_date, expiry_date, is_active, created_at) VALUES
('Standard Tariff 2024', 'Standard provider tariff rates for 2024', '2024-01-01', '2024-12-31', true, NOW()),
('Premium Tariff 2024', 'Premium tariff rates for tier 1 providers', '2024-01-01', '2024-12-31', true, NOW())
ON CONFLICT DO NOTHING;

-- Add tariff items
INSERT INTO tariff_items (catalog_id, procedure_code, agreed_rate, currency, effective_date, expiry_date, pricing_factors, created_at) VALUES
(1, 'LAB001', 1350.00, 'KES', '2024-01-01', '2024-12-31', '{"complexity_factor": 1.0, "regional_adjustment": 0.9}'::jsonb, NOW()),
(1, 'RAD001', 3150.00, 'KES', '2024-01-01', '2024-12-31', '{"complexity_factor": 1.0, "regional_adjustment": 0.9}'::jsonb, NOW()),
(1, 'GEN001', 1800.00, 'KES', '2024-01-01', '2024-12-31', '{"complexity_factor": 1.0, "regional_adjustment": 0.9}'::jsonb, NOW()),
(2, 'LAB001', 1200.00, 'KES', '2024-01-01', '2024-12-31', '{"complexity_factor": 0.8, "network_discount": 0.2}'::jsonb, NOW()),
(2, 'SUR001', 40000.00, 'KES', '2024-01-01', '2024-12-31', '{"complexity_factor": 0.85, "network_discount": 0.15}'::jsonb, NOW()),
(2, 'CAR001', 4500.00, 'KES', '2024-01-01', '2024-12-31', '{"complexity_factor": 0.9, "network_discount": 0.1}'::jsonb, NOW())
ON CONFLICT DO NOTHING;

-- Create sample users for testing
INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at) VALUES
('admin', '$2b$12$rQgV9yJzK.Ks9XHO6YA.G.QW5hjyZhmFvwLmwDxT7JThW8RqJqO7e', 'admin@medicalcoverage.com', 'System Administrator', 'admin', true, NOW()),
('provider1', '$2b$12$rQgV9yJzK.Ks9XHO6YA.G.QW5hjyZhmFvwLmwDxT7JThW8RqJqO7e', 'provider1@medicalcoverage.com', 'Dr. Sarah Johnson', 'provider', true, NOW())
ON CONFLICT DO NOTHING;

-- Create system configuration
INSERT INTO system_settings (key, value, description, category, is_public, updated_at) VALUES
('system.name', 'Medical Coverage System', 'Application name', 'general', true, NOW()),
('system.version', '2.0.0', 'Current system version', 'general', true, NOW()),
('claims.auto_approval_limit', '10000', 'Maximum claim amount for auto-approval', 'claims', false, NOW()),
('notifications.email_enabled', 'true', 'Enable email notifications', 'notifications', false, NOW()),
('security.session_timeout', '3600', 'User session timeout in seconds', 'security', false, NOW())
ON CONFLICT DO NOTHING;

-- Log data seeding completion
INSERT INTO system_logs (level, message, metadata, created_at)
VALUES (
    'INFO',
    'Sample data seeded successfully',
    '{"institutions": 5, "networks": 4, "contracts": 3, "procedures": 6, "timestamp": "' || NOW() || '"}'::jsonb,
    NOW()
) ON CONFLICT DO NOTHING;