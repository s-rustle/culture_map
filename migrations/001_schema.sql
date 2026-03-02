-- Global Pulse — Database Schema
-- Vercel Postgres (Neon). Spec: Global_Pulse_Spec_v2.md + Global_Pulse_Amendment_1.md

-- Situations: active/historical events being tracked
CREATE TABLE IF NOT EXISTS situations (
  id            SERIAL PRIMARY KEY,
  country_code  VARCHAR(2) NOT NULL,
  country       VARCHAR(100) NOT NULL,
  region        VARCHAR(200),
  city          VARCHAR(200),
  event_type    VARCHAR(50) NOT NULL,
  severity      VARCHAR(10) NOT NULL,
  title         VARCHAR(500) NOT NULL,
  summary       TEXT NOT NULL,
  source_url    TEXT,
  source_name   VARCHAR(200),
  infrastructure_impact TEXT,
  affected_consultant_count INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'active',
  first_detected_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  last_checked_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at        TIMESTAMP,
  previous_severity  VARCHAR(10),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Coaches: the only email recipients (Amendment 1)
CREATE TABLE IF NOT EXISTS coaches (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(300) NOT NULL UNIQUE,
  timezone      VARCHAR(50) NOT NULL,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Coach subscription preferences (Amendment 1)
CREATE TABLE IF NOT EXISTS coach_subscriptions (
  id            SERIAL PRIMARY KEY,
  coach_id      INTEGER REFERENCES coaches(id) ON DELETE CASCADE,
  country_code  VARCHAR(2) NOT NULL,
  event_types   TEXT NOT NULL DEFAULT '[]',
  min_severity  VARCHAR(10) DEFAULT 'moderate',
  is_admin_override BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(coach_id, country_code)
);

-- Notifications: coaches only (Amendment 1)
CREATE TABLE IF NOT EXISTS notifications (
  id            SERIAL PRIMARY KEY,
  situation_id  INTEGER REFERENCES situations(id),
  coach_id      INTEGER REFERENCES coaches(id),
  email_type    VARCHAR(30) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  body_html     TEXT NOT NULL,
  screenshot_url TEXT,
  status        VARCHAR(20) DEFAULT 'draft',
  approved_by   INTEGER REFERENCES coaches(id),
  approved_at   TIMESTAMP,
  sent_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Scan history
CREATE TABLE IF NOT EXISTS scan_history (
  id            SERIAL PRIMARY KEY,
  scan_type     VARCHAR(30) NOT NULL,
  countries_scanned TEXT,
  situations_found  INTEGER DEFAULT 0,
  escalations_found INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Sessions: role-aware auth (Amendment 1)
CREATE TABLE IF NOT EXISTS sessions (
  id            VARCHAR(64) PRIMARY KEY,
  coach_id      INTEGER REFERENCES coaches(id),
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL
);
