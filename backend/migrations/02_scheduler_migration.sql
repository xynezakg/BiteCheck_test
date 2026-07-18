-- Migration: Create tables for AI report scheduler and PDF expiry
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS sent_reports (
    id SERIAL PRIMARY KEY,
    stall_id INT NOT NULL,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    pdf_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Seed default settings if not exists
INSERT INTO system_settings (key, value)
VALUES ('reports_auto_send', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('reports_schedule', 'weekly')
ON CONFLICT (key) DO NOTHING;
