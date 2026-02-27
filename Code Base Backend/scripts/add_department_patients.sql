-- Add 5 patients for each department with unique data

-- OPD Patients (5 new patients)
INSERT INTO patients (id, tenant_id, patient_id, name, age, gender, phone, address, blood_group, status, priority, priority_label, complaint, department_id, assigned_doctor_id, assigned_nurse_id, admitted_at)
VALUES
    ('d1000001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P01001', 'Arjun Mehta', 34, 'M', '+91 9800000001', '101 MG Road, Mumbai', 'A+', 'active', 4, 'Low', 'Routine health checkup', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour'),
    ('d1000001-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P01002', 'Priyanka Chopra', 42, 'F', '+91 9800000002', '202 Park Street, Delhi', 'B+', 'active', 3, 'Moderate', 'Follow-up for diabetes', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NOW() - INTERVAL '2 hours'),
    ('d1000001-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P01003', 'Suresh Raina', 38, 'M', '+91 9800000003', '303 Lake View, Bangalore', 'O+', 'active', 4, 'Low', 'Annual physical examination', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '30 minutes'),
    ('d1000001-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P01004', 'Neha Sharma', 29, 'F', '+91 9800000004', '404 Green Park, Chennai', 'AB+', 'active', 3, 'Moderate', 'Persistent headache for 1 week', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '45 minutes'),
    ('d1000001-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P01005', 'Rajesh Khanna', 56, 'M', '+91 9800000005', '505 Hill Road, Pune', 'A-', 'active', 3, 'Moderate', 'Blood pressure monitoring', 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NULL, NOW() - INTERVAL '1 hour 15 minutes')
ON CONFLICT (id) DO NOTHING;

-- ICU Patients (5 patients - 2 existing + 3 new)
INSERT INTO patients (id, tenant_id, patient_id, name, age, gender, phone, address, blood_group, status, priority, priority_label, complaint, department_id, assigned_doctor_id, assigned_nurse_id, admitted_at)
VALUES
    ('d2000001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P02001', 'Ramesh Babu', 68, 'M', '+91 9800000011', '111 Temple St, Hyderabad', 'O-', 'active', 1, 'Critical', 'Severe respiratory distress', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '6 hours'),
    ('d2000001-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P02002', 'Kamala Devi', 72, 'F', '+91 9800000012', '222 River Road, Kolkata', 'B-', 'active', 1, 'Critical', 'Post cardiac surgery monitoring', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '12 hours'),
    ('d2000001-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P02003', 'Vijay Kumar', 55, 'M', '+91 9800000013', '333 Beach Rd, Kochi', 'A+', 'active', 1, 'Critical', 'Multiple organ failure - sepsis', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- General Ward Patients (5 patients)
INSERT INTO patients (id, tenant_id, patient_id, name, age, gender, phone, address, blood_group, status, priority, priority_label, complaint, department_id, assigned_doctor_id, assigned_nurse_id, admitted_at)
VALUES
    ('d3000001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P03001', 'Anil Kapoor', 58, 'M', '+91 9800000021', '111 Garden Lane, Mumbai', 'O+', 'admitted', 3, 'Moderate', 'Post appendectomy recovery - Day 2', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 days'),
    ('d3000001-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P03002', 'Madhuri Dixit', 48, 'F', '+91 9800000022', '222 Flower St, Delhi', 'A+', 'admitted', 3, 'Moderate', 'Pneumonia treatment - Day 4', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '4 days'),
    ('d3000001-0000-0000-0000-000000000003', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P03003', 'Sunil Shetty', 62, 'M', '+91 9800000023', '333 Palm Avenue, Bangalore', 'B+', 'admitted', 3, 'Moderate', 'Hip replacement recovery', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '5 days'),
    ('d3000001-0000-0000-0000-000000000004', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P03004', 'Juhi Chawla', 52, 'F', '+91 9800000024', '444 Rose Garden, Chennai', 'AB-', 'admitted', 4, 'Low', 'Observation for mild dehydration', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 day'),
    ('d3000001-0000-0000-0000-000000000005', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P03005', 'Rishi Kapoor', 67, 'M', '+91 9800000025', '555 Oak Street, Pune', 'O-', 'admitted', 3, 'Moderate', 'Diabetic foot ulcer treatment', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Emergency Department Patients (ensure 5+ patients)
INSERT INTO patients (id, tenant_id, patient_id, name, age, gender, phone, address, blood_group, status, priority, priority_label, complaint, department_id, assigned_doctor_id, assigned_nurse_id, admitted_at)
VALUES
    ('d4000001-0000-0000-0000-000000000001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P04001', 'Salman Khan', 45, 'M', '+91 9800000031', '111 Marine Drive, Mumbai', 'A+', 'active', 2, 'Urgent', 'Severe chest pain radiating to arm', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '30 minutes'),
    ('d4000001-0000-0000-0000-000000000002', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'P04002', 'Kareena Kapoor', 38, 'F', '+91 9800000032', '222 Juhu Beach, Mumbai', 'B+', 'active', 1, 'Critical', 'Allergic reaction with breathing difficulty', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '22eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- Add vitals for new OPD patients
INSERT INTO patient_vitals (id, patient_id, heart_rate, blood_pressure, respiratory_rate, temperature, spo2, recorded_by, recorded_at, source)
VALUES
    ('e1000001-0000-0000-0000-000000000001', 'd1000001-0000-0000-0000-000000000001', 72, '120/80', 16, 36.6, 99, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '30 minutes', 'manual'),
    ('e1000001-0000-0000-0000-000000000002', 'd1000001-0000-0000-0000-000000000002', 78, '135/88', 17, 36.8, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour', 'manual'),
    ('e1000001-0000-0000-0000-000000000003', 'd1000001-0000-0000-0000-000000000003', 70, '118/76', 15, 36.5, 99, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '20 minutes', 'manual'),
    ('e1000001-0000-0000-0000-000000000004', 'd1000001-0000-0000-0000-000000000004', 82, '128/84', 18, 37.1, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '35 minutes', 'manual'),
    ('e1000001-0000-0000-0000-000000000005', 'd1000001-0000-0000-0000-000000000005', 76, '142/90', 16, 36.7, 97, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '1 hour', 'manual')
ON CONFLICT (id) DO NOTHING;

-- Add vitals for new ICU patients
INSERT INTO patient_vitals (id, patient_id, heart_rate, blood_pressure, respiratory_rate, temperature, spo2, recorded_by, recorded_at, source)
VALUES
    ('e2000001-0000-0000-0000-000000000001', 'd2000001-0000-0000-0000-000000000001', 105, '85/55', 28, 38.2, 86, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '15 minutes', 'device'),
    ('e2000001-0000-0000-0000-000000000002', 'd2000001-0000-0000-0000-000000000002', 92, '95/60', 22, 37.4, 91, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '20 minutes', 'device'),
    ('e2000001-0000-0000-0000-000000000003', 'd2000001-0000-0000-0000-000000000003', 118, '78/50', 30, 39.1, 84, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '10 minutes', 'device')
ON CONFLICT (id) DO NOTHING;

-- Add vitals for new General Ward patients
INSERT INTO patient_vitals (id, patient_id, heart_rate, blood_pressure, respiratory_rate, temperature, spo2, recorded_by, recorded_at, source)
VALUES
    ('e3000001-0000-0000-0000-000000000001', 'd3000001-0000-0000-0000-000000000001', 74, '125/82', 16, 36.8, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 hours', 'manual'),
    ('e3000001-0000-0000-0000-000000000002', 'd3000001-0000-0000-0000-000000000002', 80, '118/76', 19, 37.6, 95, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '3 hours', 'manual'),
    ('e3000001-0000-0000-0000-000000000003', 'd3000001-0000-0000-0000-000000000003', 68, '130/85', 15, 36.9, 98, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '4 hours', 'manual'),
    ('e3000001-0000-0000-0000-000000000004', 'd3000001-0000-0000-0000-000000000004', 72, '115/72', 16, 36.6, 99, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '5 hours', 'manual'),
    ('e3000001-0000-0000-0000-000000000005', 'd3000001-0000-0000-0000-000000000005', 78, '138/88', 17, 37.2, 97, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '2 hours', 'manual')
ON CONFLICT (id) DO NOTHING;

-- Add vitals for new ED patients
INSERT INTO patient_vitals (id, patient_id, heart_rate, blood_pressure, respiratory_rate, temperature, spo2, recorded_by, recorded_at, source)
VALUES
    ('e4000001-0000-0000-0000-000000000001', 'd4000001-0000-0000-0000-000000000001', 98, '150/95', 22, 37.0, 95, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '20 minutes', 'manual'),
    ('e4000001-0000-0000-0000-000000000002', 'd4000001-0000-0000-0000-000000000002', 110, '90/60', 26, 37.8, 92, '11eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW() - INTERVAL '10 minutes', 'device')
ON CONFLICT (id) DO NOTHING;

SELECT 'Added patients for all departments!' as status;
