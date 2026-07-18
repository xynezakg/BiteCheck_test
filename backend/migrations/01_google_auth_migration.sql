-- Migration: Alter users table for Google OAuth passwordless login
ALTER TABLE users
ALTER COLUMN ua_id DROP NOT NULL;

ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique
ON users (google_sub)
WHERE google_sub IS NOT NULL;
