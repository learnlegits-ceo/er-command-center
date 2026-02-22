-- ============================================================
-- HEALTHCARE ER COMMAND CENTER - POSTGRESQL DATABASE SCHEMA
-- Multi-Tenant AI Application
-- Architecture: Vercel + API Gateway + Lambda + Groq LLM + MCP
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TENANTS (Multi-tenancy support)
-- ============================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_users INTEGER DEFAULT 50,
    max_beds INTEGER DEFAULT 100,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_code ON tenants(code);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- ============================================================
-- 2. DEPARTMENTS
-- ============================================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    floor VARCHAR(20),
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE INDEX idx_departments_code ON departments(tenant_id, code);

-- ============================================================
-- 3. USERS (Staff members - Nurses, Doctors, Admins)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('nurse', 'doctor', 'admin', 'technician', 'receptionist')),
    department_id UUID REFERENCES departments(id),
    phone VARCHAR(20),
    avatar_url TEXT,
    specialization VARCHAR(100),
    license_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'on_leave')),
    last_active_at TIMESTAMP WITH TIME ZONE,
    joined_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(tenant_id, role);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_status ON users(tenant_id, status);

-- ============================================================
-- 4. USER SETTINGS
-- ============================================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT true,
    alert_sound BOOLEAN DEFAULT true,
    critical_alerts_only BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- ============================================================
-- 5. TWO FACTOR AUTHENTICATION
-- ============================================================
CREATE TABLE user_two_factor_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    secret_key VARCHAR(255),
    backup_codes TEXT[],
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE INDEX idx_2fa_user ON user_two_factor_auth(user_id);

-- ============================================================
-- 6. USER SESSIONS & TOKENS
-- ============================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at);

-- ============================================================
-- 7. PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255),
    reset_token_hash VARCHAR(255),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_email ON password_reset_tokens(email);

-- ============================================================
-- 8. PATIENTS
-- ============================================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('M', 'F', 'Other')),
    phone VARCHAR(20),
    emergency_contact VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_relation VARCHAR(50),
    address TEXT,
    blood_group VARCHAR(5),
    photo_url TEXT,

    -- Chief Complaint & History
    complaint TEXT,
    history TEXT,

    -- Status & Priority (from AI Triage)
    status VARCHAR(30) DEFAULT 'pending_triage' CHECK (status IN (
        'pending_triage', 'active', 'admitted', 'discharged',
        'transferred', 'deceased', 'left_ama'
    )),
    priority INTEGER CHECK (priority BETWEEN 1 AND 5),
    priority_label VARCHAR(20),
    priority_color VARCHAR(20),

    -- Location
    department_id UUID REFERENCES departments(id),
    bed_id UUID,

    -- Assigned Staff
    assigned_doctor_id UUID REFERENCES users(id),
    assigned_nurse_id UUID REFERENCES users(id),

    -- Police Case
    is_police_case BOOLEAN DEFAULT false,
    police_case_type VARCHAR(50),

    -- Admission & Discharge
    admitted_at TIMESTAMP WITH TIME ZONE,
    admitted_by UUID REFERENCES users(id),
    discharged_at TIMESTAMP WITH TIME ZONE,
    discharged_by UUID REFERENCES users(id),
    discharge_notes TEXT,
    follow_up_date DATE,

    -- FHIR Integration
    fhir_resource_id VARCHAR(100),
    external_mrn VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, patient_id)
);

CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_patients_patient_id ON patients(tenant_id, patient_id);
CREATE INDEX idx_patients_status ON patients(tenant_id, status);
CREATE INDEX idx_patients_priority ON patients(tenant_id, priority);
CREATE INDEX idx_patients_department ON patients(department_id);
CREATE INDEX idx_patients_doctor ON patients(assigned_doctor_id);
CREATE INDEX idx_patients_nurse ON patients(assigned_nurse_id);
CREATE INDEX idx_patients_admitted ON patients(tenant_id, admitted_at);
CREATE INDEX idx_patients_police_case ON patients(tenant_id, is_police_case);

-- ============================================================
-- 9. PATIENT ALLERGIES
-- ============================================================
CREATE TABLE patient_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    reaction TEXT,
    notes TEXT,
    reported_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_allergies_patient ON patient_allergies(patient_id);

-- ============================================================
-- 10. PATIENT VITALS
-- ============================================================
CREATE TABLE patient_vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    -- Vital Signs
    heart_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    blood_pressure VARCHAR(10),
    spo2 DECIMAL(5,2),
    temperature DECIMAL(5,2),
    respiratory_rate INTEGER,
    blood_glucose DECIMAL(6,2),
    pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),

    -- Additional
    notes TEXT,
    is_critical BOOLEAN DEFAULT false,
    alert_generated BOOLEAN DEFAULT false,

    -- Source (manual or OCR via Groq Vision)
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'ocr', 'device', 'import')),
    ocr_confidence JSONB,
    raw_ocr_text TEXT,

    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX idx_vitals_recorded ON patient_vitals(patient_id, recorded_at DESC);
CREATE INDEX idx_vitals_critical ON patient_vitals(patient_id, is_critical);

-- ============================================================
-- 11. AI TRIAGE RESULTS (Groq LLM)
-- ============================================================
CREATE TABLE ai_triage_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,

    -- Input Data sent to Groq
    input_complaint TEXT NOT NULL,
    input_vitals JSONB,
    input_age INTEGER,
    input_gender VARCHAR(10),
    input_history TEXT,

    -- Groq LLM Output
    priority INTEGER CHECK (priority BETWEEN 1 AND 5),
    priority_label VARCHAR(20),
    priority_color VARCHAR(20),
    confidence DECIMAL(4,3),
    reasoning TEXT,
    recommendations TEXT[],
    suggested_department VARCHAR(100),
    estimated_wait_time VARCHAR(50),

    -- Groq API Metadata
    groq_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
    groq_request_id VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    processing_time_ms INTEGER,
    temperature DECIMAL(3,2),

    -- Status
    is_applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES users(id),
    override_priority INTEGER,
    override_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_triage_tenant ON ai_triage_results(tenant_id);
CREATE INDEX idx_triage_patient ON ai_triage_results(patient_id);
CREATE INDEX idx_triage_created ON ai_triage_results(tenant_id, created_at DESC);
CREATE INDEX idx_triage_priority ON ai_triage_results(priority);

-- ============================================================
-- 12. PATIENT NOTES
-- ============================================================
CREATE TABLE patient_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('nurse', 'doctor', 'admin', 'system', 'discharge')),
    content TEXT NOT NULL,
    is_confidential BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notes_patient ON patient_notes(patient_id);
CREATE INDEX idx_notes_type ON patient_notes(patient_id, note_type);
CREATE INDEX idx_notes_created ON patient_notes(patient_id, created_at DESC);

-- ============================================================
-- 13. PRESCRIPTIONS (MCP provides medication suggestions)
-- ============================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    -- Medication info (populated via MCP medication lookup)
    medication_name VARCHAR(255) NOT NULL,
    medication_code VARCHAR(50),
    medication_form VARCHAR(50),
    generic_name VARCHAR(255),

    -- Dosage details
    dosage VARCHAR(100) NOT NULL,
    dosage_unit VARCHAR(20),
    frequency VARCHAR(100) NOT NULL,
    route VARCHAR(50),
    duration VARCHAR(100),
    quantity INTEGER,
    refills INTEGER DEFAULT 0,

    -- Instructions
    instructions TEXT,
    special_instructions TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued', 'on_hold')),
    start_date DATE,
    end_date DATE,

    -- MCP Metadata (medication lookup)
    mcp_source VARCHAR(50),
    mcp_drug_id VARCHAR(100),
    drug_interactions JSONB,
    contraindications TEXT[],

    -- Prescriber info
    prescribed_by UUID NOT NULL REFERENCES users(id),
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Discontinuation
    discontinued_by UUID REFERENCES users(id),
    discontinued_at TIMESTAMP WITH TIME ZONE,
    discontinue_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(patient_id, status);
CREATE INDEX idx_prescriptions_prescribed_by ON prescriptions(prescribed_by);
CREATE INDEX idx_prescriptions_medication ON prescriptions(medication_name);

-- ============================================================
-- 14. BEDS
-- ============================================================
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bed_number VARCHAR(20) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id),
    bed_type VARCHAR(30) CHECK (bed_type IN ('icu', 'general', 'isolation', 'pediatric', 'maternity', 'emergency')),
    floor VARCHAR(20),
    wing VARCHAR(20),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN (
        'available', 'occupied', 'maintenance', 'cleaning', 'reserved'
    )),
    features TEXT[],
    current_patient_id UUID REFERENCES patients(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, bed_number)
);

CREATE INDEX idx_beds_tenant ON beds(tenant_id);
CREATE INDEX idx_beds_department ON beds(department_id);
CREATE INDEX idx_beds_status ON beds(tenant_id, status);
CREATE INDEX idx_beds_type ON beds(tenant_id, bed_type);
CREATE INDEX idx_beds_patient ON beds(current_patient_id);

-- Add foreign key from patients to beds
ALTER TABLE patients ADD CONSTRAINT fk_patients_bed FOREIGN KEY (bed_id) REFERENCES beds(id);

-- ============================================================
-- 15. BED ASSIGNMENT HISTORY
-- ============================================================
CREATE TABLE bed_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    released_at TIMESTAMP WITH TIME ZONE,
    released_by UUID REFERENCES users(id),
    release_reason VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bed_assignments_bed ON bed_assignments(bed_id);
CREATE INDEX idx_bed_assignments_patient ON bed_assignments(patient_id);
CREATE INDEX idx_bed_assignments_active ON bed_assignments(bed_id, released_at) WHERE released_at IS NULL;

-- ============================================================
-- 16. ALERTS
-- ============================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low', 'info')),
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN (
        'unread', 'read', 'acknowledged', 'resolved', 'dismissed'
    )),

    -- Target
    for_roles TEXT[],
    for_user_ids UUID[],
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB,
    triggered_by VARCHAR(50),
    threshold_info JSONB,

    -- Action tracking
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledge_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution TEXT,

    -- Forwarding
    forwarded_to_roles TEXT[],
    forwarded_at TIMESTAMP WITH TIME ZONE,
    forwarded_by UUID REFERENCES users(id),
    forward_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_status ON alerts(tenant_id, status);
CREATE INDEX idx_alerts_priority ON alerts(tenant_id, priority);
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_created ON alerts(tenant_id, created_at DESC);
CREATE INDEX idx_alerts_unread ON alerts(tenant_id, status) WHERE status = 'unread';

-- ============================================================
-- 17. ALERT HISTORY
-- ============================================================
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_history_alert ON alert_history(alert_id);

-- ============================================================
-- 18. POLICE CASES (MLC - Medico-Legal Cases)
-- ============================================================
CREATE TABLE police_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    case_number VARCHAR(50),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    alert_id UUID REFERENCES alerts(id),

    -- Case Details
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
        'road_accident', 'assault', 'domestic_violence', 'burn',
        'poisoning', 'suicide_attempt', 'unknown_identity', 'other'
    )),
    case_type_label VARCHAR(100),
    description TEXT,
    complaint TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'police_notified', 'police_contacted', 'under_investigation', 'resolved', 'closed'
    )),

    -- Reporting
    reported_by UUID NOT NULL REFERENCES users(id),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Police Contact
    police_contacted BOOLEAN DEFAULT false,
    police_contacted_at TIMESTAMP WITH TIME ZONE,
    police_contacted_by UUID REFERENCES users(id),
    police_station VARCHAR(255),
    officer_name VARCHAR(255),
    officer_phone VARCHAR(20),
    fir_number VARCHAR(100),

    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, case_number)
);

CREATE INDEX idx_police_cases_tenant ON police_cases(tenant_id);
CREATE INDEX idx_police_cases_patient ON police_cases(patient_id);
CREATE INDEX idx_police_cases_status ON police_cases(tenant_id, status);

-- ============================================================
-- 19. NOTIFICATIONS (SMS/Push/Email via Trigger.dev)
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Notification details
    type VARCHAR(30) NOT NULL CHECK (type IN ('push', 'email', 'sms', 'in_app')),
    channel VARCHAR(30),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,

    -- Target (phone for SMS, email for email, etc.)
    recipient VARCHAR(255),

    -- Trigger.dev Integration
    trigger_job_id VARCHAR(100),
    trigger_run_id VARCHAR(100),

    -- Status
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'queued', 'sent', 'delivered', 'read', 'failed'
    )),

    -- Timestamps
    queued_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,

    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(tenant_id, type);

-- ============================================================
-- 20. FILE UPLOADS
-- ============================================================
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN (
        'avatar', 'patient_photo', 'document', 'vitals_image', 'other'
    )),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    mime_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_uploads_tenant ON file_uploads(tenant_id);
CREATE INDEX idx_uploads_entity ON file_uploads(entity_type, entity_id);

-- ============================================================
-- 21. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    lambda_request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(tenant_id, created_at DESC);

-- ============================================================
-- 22. GROQ API CONFIGURATIONS (Per Tenant)
-- ============================================================
CREATE TABLE groq_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    default_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
    triage_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
    ocr_model VARCHAR(100) DEFAULT 'llama-3.2-90b-vision-preview',
    max_tokens INTEGER DEFAULT 1024,
    temperature DECIMAL(3,2) DEFAULT 0.3,
    triage_prompt_template TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id)
);

CREATE INDEX idx_groq_config_tenant ON groq_configurations(tenant_id);

-- ============================================================
-- 23. MCP TOOL CONFIGURATIONS (Medication Lookup)
-- ============================================================
CREATE TABLE mcp_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    tool_type VARCHAR(50) NOT NULL CHECK (tool_type IN (
        'medication_lookup', 'drug_interaction', 'dosage_calculator', 'other'
    )),
    endpoint_url TEXT,
    api_key_encrypted TEXT,
    config_params JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, tool_name)
);

CREATE INDEX idx_mcp_config_tenant ON mcp_configurations(tenant_id);
CREATE INDEX idx_mcp_config_type ON mcp_configurations(tenant_id, tool_type);

-- ============================================================
-- 24. FHIR INTEGRATION LOGS
-- ============================================================
CREATE TABLE fhir_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    local_entity_type VARCHAR(50),
    local_entity_id UUID,
    sync_direction VARCHAR(20) CHECK (sync_direction IN ('inbound', 'outbound')),
    status VARCHAR(20) CHECK (status IN ('success', 'failed', 'partial')),
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fhir_logs_tenant ON fhir_sync_logs(tenant_id);
CREATE INDEX idx_fhir_logs_resource ON fhir_sync_logs(resource_type, resource_id);
CREATE INDEX idx_fhir_logs_local ON fhir_sync_logs(local_entity_type, local_entity_id);

-- ============================================================
-- 25. DASHBOARD STATISTICS CACHE
-- ============================================================
CREATE TABLE dashboard_stats_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stat_type VARCHAR(50) NOT NULL,
    stat_date DATE NOT NULL,
    stats_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tenant_id, stat_type, stat_date)
);

CREATE INDEX idx_dashboard_cache_tenant ON dashboard_stats_cache(tenant_id);

-- ============================================================
-- 26. TRIGGER.DEV JOB TRACKING
-- ============================================================
CREATE TABLE trigger_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_id VARCHAR(100) NOT NULL,
    run_id VARCHAR(100),
    job_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'triggered', 'processing', 'completed', 'failed', 'retrying'
    )),
    triggered_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trigger_jobs_tenant ON trigger_jobs(tenant_id);
CREATE INDEX idx_trigger_jobs_status ON trigger_jobs(status);
CREATE INDEX idx_trigger_jobs_type ON trigger_jobs(job_type);
CREATE INDEX idx_trigger_jobs_run_id ON trigger_jobs(run_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_notes_updated_at BEFORE UPDATE ON patient_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_police_cases_updated_at BEFORE UPDATE ON police_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groq_config_updated_at BEFORE UPDATE ON groq_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mcp_config_updated_at BEFORE UPDATE ON mcp_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate patient ID
CREATE OR REPLACE FUNCTION generate_patient_id(tenant_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(3);
    seq_num INTEGER;
    new_id VARCHAR(20);
BEGIN
    SELECT UPPER(LEFT(code, 3)) INTO prefix FROM tenants WHERE id = tenant_uuid;
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM 4) AS INTEGER)), 0) + 1
    INTO seq_num FROM patients WHERE tenant_id = tenant_uuid;
    new_id = prefix || LPAD(seq_num::TEXT, 6, '0');
    RETURN new_id;
END;
$$ language 'plpgsql';

-- ============================================================
-- ROW LEVEL SECURITY (RLS) for Multi-tenancy
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE police_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (set app.current_tenant_id in session)
CREATE POLICY tenant_isolation_departments ON departments USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation_users ON users USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation_patients ON patients USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation_beds ON beds USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation_alerts ON alerts USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations (hospitals/clinics)';
COMMENT ON TABLE users IS 'Staff members with role-based access';
COMMENT ON TABLE patients IS 'Patient records with AI triage status';
COMMENT ON TABLE patient_vitals IS 'Vital signs with OCR support via Groq Vision';
COMMENT ON TABLE ai_triage_results IS 'Groq LLM triage predictions';
COMMENT ON TABLE prescriptions IS 'Prescriptions with MCP medication lookup';
COMMENT ON TABLE groq_configurations IS 'Per-tenant Groq API settings';
COMMENT ON TABLE mcp_configurations IS 'MCP tool configs for medication lookup';
COMMENT ON TABLE fhir_sync_logs IS 'HL7 FHIR integration audit trail';
COMMENT ON TABLE trigger_jobs IS 'Trigger.dev background job tracking';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
