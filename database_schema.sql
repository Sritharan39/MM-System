-- ============================================================
-- MESS MANAGEMENT SYSTEM - PostgreSQL Database Schema
-- Version: 1.0
-- ============================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS misuse_flags CASCADE;
DROP TABLE IF EXISTS leave_records CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS meal_slots CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;

-- ============================================================
-- TABLE: admin_settings
-- Description: Stores admin account and system settings
-- ============================================================
CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    full_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABLE: meal_slots
-- Description: Available meal slots (Breakfast, Lunch, Dinner)
-- ============================================================
CREATE TABLE meal_slots (
    id SERIAL PRIMARY KEY,
    slot_name VARCHAR(50) NOT NULL UNIQUE,
    slot_description VARCHAR(255),
    display_order INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: members
-- Description: Core member information
-- ============================================================
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    joining_date DATE NOT NULL,
    photo_url VARCHAR(500),
    emergency_contact VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better search performance
CREATE INDEX idx_members_name ON members(full_name);
CREATE INDEX idx_members_mobile ON members(mobile_number);
CREATE INDEX idx_members_member_id ON members(member_id);
CREATE INDEX idx_members_active ON members(is_active);

-- ============================================================
-- TABLE: meal_plans
-- Description: Active meal plans for each member
-- ============================================================
CREATE TABLE meal_plans (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_month DATE NOT NULL,
    slot_ids TEXT NOT NULL, -- JSON array of slot IDs: [1,2,3]
    monthly_amount DECIMAL(10, 2) NOT NULL,
    plan_start_date DATE NOT NULL,
    plan_end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for meal plans
CREATE INDEX idx_meal_plans_member ON meal_plans(member_id);
CREATE INDEX idx_meal_plans_active ON meal_plans(is_active);
CREATE INDEX idx_meal_plans_date_range ON meal_plans(plan_start_date, plan_end_date);

-- ============================================================
-- TABLE: payment_records
-- Description: Payment history for each member
-- ============================================================
CREATE TABLE payment_records (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id INT REFERENCES meal_plans(id) ON DELETE SET NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_month DATE NOT NULL,
    payment_status VARCHAR(20) NOT NULL, -- 'Paid', 'Due', 'Partial'
    payment_method VARCHAR(50), -- 'Cash', 'Online', 'Check', etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for payment records
CREATE INDEX idx_payment_member ON payment_records(member_id);
CREATE INDEX idx_payment_status ON payment_records(payment_status);
CREATE INDEX idx_payment_date ON payment_records(payment_date);

-- ============================================================
-- TABLE: attendance_records
-- Description: Daily attendance tracking per member per slot
-- ============================================================
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES meal_slots(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'Present', 'Absent', 'Leave'
    marked_by VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_id, slot_id, attendance_date)
);

-- Indexes for attendance
CREATE INDEX idx_attendance_member ON attendance_records(member_id);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_slot ON attendance_records(slot_id);
CREATE INDEX idx_attendance_status ON attendance_records(status);

-- ============================================================
-- TABLE: leave_records
-- Description: Planned leave/absence for members
-- ============================================================
CREATE TABLE leave_records (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES meal_slots(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    leave_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_id, slot_id, leave_date)
);

-- Indexes for leave records
CREATE INDEX idx_leave_member ON leave_records(member_id);
CREATE INDEX idx_leave_date ON leave_records(leave_date);

-- ============================================================
-- TABLE: misuse_flags
-- Description: Misuse/violation incidents
-- ============================================================
CREATE TABLE misuse_flags (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    incident_date TIMESTAMP NOT NULL,
    reason TEXT NOT NULL,
    severity VARCHAR(20), -- 'Low', 'Medium', 'High'
    status VARCHAR(20) DEFAULT 'Open', -- 'Open', 'Resolved', 'Closed'
    resolution_notes TEXT,
    resolved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for misuse flags
CREATE INDEX idx_misuse_member ON misuse_flags(member_id);
CREATE INDEX idx_misuse_status ON misuse_flags(status);
CREATE INDEX idx_misuse_date ON misuse_flags(incident_date);

-- ============================================================
-- TABLE: sms_logs
-- Description: Log of all SMS notifications sent
-- ============================================================
CREATE TABLE sms_logs (
    id SERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    phone_number VARCHAR(15) NOT NULL,
    message_type VARCHAR(50), -- 'Renewal_Alert', 'Welcome', 'Custom', etc.
    message_body TEXT NOT NULL,
    status VARCHAR(20), -- 'Sent', 'Failed', 'Pending'
    twilio_sid VARCHAR(100),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for SMS logs
CREATE INDEX idx_sms_member ON sms_logs(member_id);
CREATE INDEX idx_sms_sent_at ON sms_logs(sent_at);
CREATE INDEX idx_sms_status ON sms_logs(status);

-- ============================================================
-- INITIAL DATA INSERTION
-- ============================================================

-- Insert default meal slots
INSERT INTO meal_slots (slot_name, slot_description, display_order, is_active) VALUES
('Breakfast', 'Morning meal slot (7:00 AM - 10:00 AM)', 1, TRUE),
('Lunch', 'Afternoon meal slot (12:00 PM - 2:00 PM)', 2, TRUE),
('Dinner', 'Evening meal slot (7:00 PM - 9:00 PM)', 3, TRUE);

-- ============================================================
-- CREATE FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to auto-generate Member ID
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.member_id := 'MESS-' || LPAD(NEW.id::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate Member ID
CREATE TRIGGER trigger_generate_member_id
BEFORE INSERT ON members
FOR EACH ROW
EXECUTE FUNCTION generate_member_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER trigger_update_members_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_meal_plans_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_payment_records_at BEFORE UPDATE ON payment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_attendance_records_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_leave_records_at BEFORE UPDATE ON leave_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_misuse_flags_at BEFORE UPDATE ON misuse_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- END OF SCHEMA
-- ============================================================
