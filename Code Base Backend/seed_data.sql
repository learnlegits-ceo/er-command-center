-- ============================================================
-- SEED DATA FOR ER COMMAND CENTER
-- Demo users, departments, and sample data
-- ============================================================

-- Create default tenant
INSERT INTO tenants (id, name, code, domain, email, subscription_plan, subscription_status, max_users, max_beds, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'City General Hospital',
    'CGH',
    'citygeneral.hospital',
    'admin@citygeneral.hospital',
    'enterprise',
    'active',
    500,
    200,
    true
) ON CONFLICT (code) DO NOTHING;

-- Create departments
INSERT INTO departments (id, tenant_id, name, code, description, floor, capacity, is_active)
VALUES
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Emergency Department', 'ED', 'Emergency and Trauma Care', 'Ground', 50, true),
    ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Intensive Care Unit', 'ICU', 'Critical Care Unit', '2nd', 20, true),
    ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'General Ward', 'GW', 'General Medical Ward', '3rd', 100, true),
    ('d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Outpatient Department', 'OPD', 'Outpatient Services', 'Ground', 30, true)
ON CONFLICT DO NOTHING;

-- Create demo users with bcrypt hashed passwords
-- All passwords are hashed using bcrypt

-- Nurse user (password: nurse123)
INSERT INTO users (id, tenant_id, employee_id, email, password_hash, name, role, department_id, phone, specialization, status)
VALUES (
    '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'EMP001',
    'priya@hospital.com',
    '$2b$12$MkCt4dRkrTGOralSus.65eoyO8ZATjyBcmd.u0grW5ViIfFdW75gi',
    'Priya Sharma',
    'nurse',
    'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '+91 9876543210',
    'Emergency Care',
    'active'
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Doctor user (password: doctor123)
INSERT INTO users (id, tenant_id, employee_id, email, password_hash, name, role, department_id, phone, specialization, license_number, status)
VALUES (
    '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'EMP002',
    'ananya@hospital.com',
    '$2b$12$QnBHnLn3ag0yTHYM/DpL4OSfziHXEh5d6qx0DmEu6CORVBr6fnlc2',
    'Dr. Ananya Patel',
    'doctor',
    'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '+91 9876543211',
    'Emergency Medicine',
    'MCI-12345',
    'active'
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Admin user (password: admin123)
INSERT INTO users (id, tenant_id, employee_id, email, password_hash, name, role, department_id, phone, status)
VALUES (
    '33eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'EMP003',
    'rajesh@hospital.com',
    '$2b$12$zT.eg3dZ44fGYr239kAKxuxYScGE4dPo0LEGWKF/WHQT.Ex8Omvwm',
    'Rajesh Kumar',
    'admin',
    'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '+91 9876543212',
    'active'
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Create user settings for demo users
INSERT INTO user_settings (user_id, theme, language, email_notifications, push_notifications)
VALUES
    ('11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'light', 'en', true, true),
    ('22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'light', 'en', true, true),
    ('33eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'light', 'en', true, true)
ON CONFLICT DO NOTHING;

-- Create sample patients (using correct schema columns)
INSERT INTO patients (id, tenant_id, patient_id, name, age, gender, phone, address, blood_group, status, priority, priority_label, complaint, department_id, assigned_doctor_id, assigned_nurse_id, admitted_at)
VALUES
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00001', 'Amit Singh', 45, 'M', '+91 9123456789', '123 Main St, Mumbai', 'O+', 'admitted', 1, 'Critical', 'Chest pain and shortness of breath', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 hours'),
    ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00002', 'Meera Gupta', 32, 'F', '+91 9123456790', '456 Oak Ave, Delhi', 'A+', 'active', 2, 'Urgent', 'Severe headache for 2 days', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour'),
    ('c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00003', 'Rahul Verma', 28, 'M', '+91 9123456791', '789 Pine Rd, Bangalore', 'B+', 'active', 3, 'Moderate', 'Minor laceration on hand', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '30 minutes'),
    ('c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00004', 'Priya Nair', 55, 'F', '+91 9123456792', '321 Lake View, Chennai', 'AB+', 'active', 1, 'Critical', 'Difficulty breathing, suspected cardiac arrest', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '45 minutes'),
    ('c5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00005', 'Vikram Rao', 38, 'M', '+91 9123456793', '567 Garden St, Hyderabad', 'B-', 'active', 2, 'Urgent', 'High fever and body ache', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour 15 minutes'),
    ('c6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00006', 'Anita Sharma', 42, 'F', '+91 9123456794', '890 Hill Road, Pune', 'A-', 'pending_triage', 4, 'Low', 'Mild stomach pain', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NULL, NOW() - INTERVAL '15 minutes'),
    ('c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00007', 'Sanjay Reddy', 62, 'M', '+91 9123456795', '234 Temple St, Kolkata', 'O-', 'admitted', 2, 'Urgent', 'Diabetic emergency - low blood sugar', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 hours'),
    ('c8eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00008', 'Kavitha Menon', 29, 'F', '+91 9123456796', '456 Beach Rd, Kochi', 'B+', 'active', 3, 'Moderate', 'Sprained ankle from fall', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '50 minutes'),
    -- OPD Patients (d4)
    ('c9eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00009', 'Deepak Kumar', 35, 'M', '+91 9123456797', '123 Park Lane, Mumbai', 'A+', 'active', 4, 'Low', 'Routine health checkup', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 hours'),
    ('caeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00010', 'Sunita Devi', 48, 'F', '+91 9123456798', '456 Market Rd, Delhi', 'B+', 'active', 3, 'Moderate', 'Follow-up for diabetes management', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NOW() - INTERVAL '1 hour 30 minutes'),
    ('cbeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00011', 'Ravi Shankar', 52, 'M', '+91 9123456799', '789 Temple St, Bangalore', 'O+', 'active', 3, 'Moderate', 'Blood pressure monitoring', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '45 minutes'),
    ('cceebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00012', 'Lakshmi Iyer', 41, 'F', '+91 9123456800', '321 Lake View, Chennai', 'AB-', 'active', 4, 'Low', 'Annual physical examination', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NOW() - INTERVAL '30 minutes'),
    -- General Ward Patients (d3)
    ('cdeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00013', 'Mohan Das', 67, 'M', '+91 9123456801', '567 Garden St, Hyderabad', 'O-', 'admitted', 3, 'Moderate', 'Post-surgery recovery - knee replacement', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 days'),
    ('ceeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P00014', 'Geeta Patel', 58, 'F', '+91 9123456802', '890 Hill Road, Pune', 'A-', 'admitted', 3, 'Moderate', 'Pneumonia treatment - day 3', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Create beds (using correct schema columns)
INSERT INTO beds (id, tenant_id, department_id, bed_number, bed_type, status, floor, wing, features, current_patient_id)
VALUES
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ED-001', 'emergency', 'occupied', 'Ground', 'A', ARRAY['monitor'], 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ED-002', 'emergency', 'occupied', 'Ground', 'A', ARRAY['monitor'], 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ED-003', 'emergency', 'available', 'Ground', 'A', ARRAY['monitor'], NULL),
    ('b4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ED-004', 'emergency', 'available', 'Ground', 'B', ARRAY['monitor'], NULL),
    ('b5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ED-005', 'emergency', 'maintenance', 'Ground', 'B', ARRAY['monitor'], NULL),
    ('b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ICU-001', 'icu', 'occupied', '2nd', 'ICU', ARRAY['monitor', 'ventilator'], 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ICU-002', 'icu', 'occupied', '2nd', 'ICU', ARRAY['monitor', 'ventilator'], 'c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('b8eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ICU-003', 'icu', 'available', '2nd', 'ICU', ARRAY['monitor', 'ventilator'], NULL),
    ('b9eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ICU-004', 'icu', 'available', '2nd', 'ICU', ARRAY['monitor', 'ventilator'], NULL),
    ('ba0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'GW-001', 'general', 'available', '3rd', 'C', ARRAY[]::TEXT[], NULL),
    ('bb0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'GW-002', 'general', 'available', '3rd', 'C', ARRAY[]::TEXT[], NULL),
    ('bc0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'GW-003', 'general', 'available', '3rd', 'D', ARRAY[]::TEXT[], NULL),
    -- OPD beds (consultation rooms)
    ('bd0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OPD-001', 'general', 'available', 'Ground', 'OPD', ARRAY[]::TEXT[], NULL),
    ('be0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OPD-002', 'general', 'available', 'Ground', 'OPD', ARRAY[]::TEXT[], NULL),
    ('bf0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OPD-003', 'general', 'available', 'Ground', 'OPD', ARRAY[]::TEXT[], NULL),
    ('c00ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'OPD-004', 'general', 'available', 'Ground', 'OPD', ARRAY[]::TEXT[], NULL)
ON CONFLICT DO NOTHING;

-- Update patients with their bed assignments
UPDATE patients SET bed_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
UPDATE patients SET bed_id = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
UPDATE patients SET bed_id = 'b6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
UPDATE patients SET bed_id = 'b7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- General Ward patients bed assignments
UPDATE patients SET bed_id = 'ba0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'cdeebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
UPDATE patients SET bed_id = 'bb0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'ceeebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
-- Update GW beds to occupied
UPDATE beds SET status = 'occupied', current_patient_id = 'cdeebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'ba0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
UPDATE beds SET status = 'occupied', current_patient_id = 'ceeebc99-9c0b-4ef8-bb6d-6bb9bd380a11' WHERE id = 'bb0ebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Create patient vitals (UUIDs use hex chars only: 0-9, a-f)
INSERT INTO patient_vitals (id, patient_id, heart_rate, blood_pressure, respiratory_rate, temperature, spo2, recorded_by, recorded_at, source)
VALUES
    ('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 92, '145/95', 22, 37.2, 94, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '30 minutes', 'manual'),
    ('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 78, '120/80', 16, 37.8, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '20 minutes', 'manual'),
    ('f3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 72, '115/75', 14, 36.8, 99, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '15 minutes', 'manual'),
    ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 110, '90/60', 28, 36.5, 88, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '10 minutes', 'device'),
    ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 88, '130/85', 18, 39.2, 96, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '25 minutes', 'manual'),
    ('f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 70, '118/78', 15, 36.9, 99, NULL, NOW() - INTERVAL '5 minutes', 'manual'),
    ('f7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 65, '100/65', 14, 36.4, 97, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour', 'device'),
    ('f8eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c8eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 75, '122/82', 16, 37.0, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '40 minutes', 'manual'),
    -- OPD patient vitals
    ('f9eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c9eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 72, '120/80', 16, 36.6, 99, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour', 'manual'),
    ('faeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'caeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 78, '135/88', 17, 36.8, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour', 'manual'),
    ('fbeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cbeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 82, '148/92', 18, 36.7, 97, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '30 minutes', 'manual'),
    ('fceebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cceebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 68, '118/76', 15, 36.5, 99, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '20 minutes', 'manual'),
    -- General Ward patient vitals
    ('fdeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cdeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 74, '128/82', 16, 36.9, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 hours', 'manual'),
    ('feeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ceeebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 80, '122/78', 19, 37.4, 96, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 hours', 'manual')
ON CONFLICT DO NOTHING;

-- Create sample alerts
INSERT INTO alerts (id, tenant_id, title, message, priority, category, status, patient_id, created_at)
VALUES
    ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Critical: Low SpO2', 'Patient Priya Nair in ICU-001 has SpO2 dropped to 88%', 'critical', 'Vitals', 'unread', 'c4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '5 minutes'),
    ('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ICU Capacity Warning', 'ICU beds at 50% capacity - 2 of 4 beds occupied', 'high', 'Bed Management', 'unread', NULL, NOW() - INTERVAL '30 minutes'),
    ('e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'High Fever Alert', 'Patient Vikram Rao has temperature 39.2°C', 'high', 'Vitals', 'unread', 'c5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '25 minutes'),
    ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'New Patient Pending Triage', 'Anita Sharma waiting for triage assessment', 'medium', 'patient', 'unread', 'c6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '15 minutes'),
    ('e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lab Results Ready', 'Blood test results available for Amit Singh', 'medium', 'Lab Results', 'read', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour'),
    ('e6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Medication Due', 'Sanjay Reddy insulin dose due in 30 minutes', 'medium', 'Medication', 'unread', 'c7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '20 minutes'),
    ('e7eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Shift Change Reminder', 'Night shift begins at 8 PM', 'low', 'Staffing', 'unread', NULL, NOW() - INTERVAL '2 hours'),
    ('e8eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'System Maintenance', 'Scheduled backup tonight at 2 AM', 'low', 'System', 'acknowledged', NULL, NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

-- Output success message
SELECT 'Demo data loaded successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
