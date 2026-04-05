-- Promenade — Database Setup Script
-- Paste this entire file into the Neon SQL Editor and click Run

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS auth_users (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  email         TEXT UNIQUE,
  phone_number  TEXT UNIQUE,
  role          TEXT NOT NULL DEFAULT 'manager',  -- 'manager' or 'admin'
  created_via   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth accounts (stores hashed passwords)
CREATE TABLE IF NOT EXISTS auth_accounts (
  id                    SERIAL PRIMARY KEY,
  "userId"              INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL DEFAULT 'credentials',
  type                  TEXT NOT NULL DEFAULT 'credentials',
  "providerAccountId"   TEXT NOT NULL,
  password              TEXT,
  is_temporary_password BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth sessions (for web app cookie-based sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id             SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  session_token  TEXT UNIQUE NOT NULL,
  expires        TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Properties (buildings/sites managed by property managers)
CREATE TABLE IF NOT EXISTS properties (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT,
  latitude    NUMERIC(10, 7),
  longitude   NUMERIC(10, 7),
  manager_id  INTEGER REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check-ins (GPS-verified attendance records)
CREATE TABLE IF NOT EXISTS check_ins (
  id                   SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  property_id          INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  check_in_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time       TIMESTAMPTZ,
  check_in_latitude    NUMERIC(10, 7),
  check_in_longitude   NUMERIC(10, 7),
  check_out_latitude   NUMERIC(10, 7),
  check_out_longitude  NUMERIC(10, 7),
  check_in_status      TEXT NOT NULL DEFAULT 'checked_in',  -- 'checked_in' or 'checked_out'
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs (full activity trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER REFERENCES auth_users(id) ON DELETE SET NULL,
  property_id            INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  action                 TEXT NOT NULL,
  sign_in_status         TEXT,
  latitude               NUMERIC(10, 7),
  longitude              NUMERIC(10, 7),
  distance_from_property NUMERIC(10, 2),
  ip_address             TEXT,
  user_agent             TEXT,
  device_info            JSONB,
  details                JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  token      TEXT UNIQUE NOT NULL,
  user_id    INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant requests (optional — not used in MVP but schema is needed)
CREATE TABLE IF NOT EXISTS tenant_requests (
  id           SERIAL PRIMARY KEY,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_name  TEXT,
  tenant_email TEXT,
  request_type TEXT,
  priority     TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create your first admin account
-- Change the name, email, and phone to your own details
-- Then use the web portal to set your password
INSERT INTO auth_users (name, email, phone_number, role, created_via)
VALUES ('Admin', 'admin@promenade.app', '+10000000000', 'admin', 'setup')
ON CONFLICT DO NOTHING;
