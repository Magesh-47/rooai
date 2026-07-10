-- ============================================================
-- Roo AI — Supabase Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  role        TEXT        NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  department  TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Meetings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration          INTEGER     NOT NULL DEFAULT 0,          -- minutes
  status            TEXT        NOT NULL DEFAULT 'processing'
                                CHECK (status IN ('processing', 'ready', 'live')),
  summary           TEXT,
  language          TEXT        DEFAULT 'en',
  audio_url         TEXT,
  participant_count INTEGER     DEFAULT 0,
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Meeting participants ──────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_label TEXT,                -- 'Speaker A'
  speaker_name  TEXT NOT NULL,
  speaker_role  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Transcript segments ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transcript_segments (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id         UUID    NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_label      TEXT    NOT NULL,
  speaker_name       TEXT,
  text               TEXT    NOT NULL,
  timestamp_seconds  FLOAT   NOT NULL DEFAULT 0,
  detected_language  TEXT,
  seq_order          INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Meeting notes (freeform) ──────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content     TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Log entries ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS log_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  meeting_title   TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('action','decision','architecture','risk','culture')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  owner           TEXT,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in-progress','resolved')),
  priority        TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  verification    TEXT DEFAULT 'unverified'
                  CHECK (verification IN ('unverified','verified','rejected')),
  source_quote    TEXT,
  source_timestamp TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI chat messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID REFERENCES meetings(id) ON DELETE CASCADE,  -- NULL = global chat
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security ────────────────────────────────────
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages   ENABLE ROW LEVEL SECURITY;

-- Profiles: any authenticated user can read; only owner can update own row
CREATE POLICY "profiles_read"       ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- All other tables: authenticated users have full access
CREATE POLICY "meetings_all"             ON meetings             FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "participants_all"         ON meeting_participants  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "transcript_all"           ON transcript_segments   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "notes_all"                ON meeting_notes         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "logs_all"                 ON log_entries           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "chat_all"                 ON ai_chat_messages      FOR ALL USING (auth.role() = 'authenticated');

-- ── Auto-create profile on signup ────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── updated_at auto-timestamp ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER meetings_updated_at    BEFORE UPDATE ON meetings    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notes_updated_at       BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER logs_updated_at        BEFORE UPDATE ON log_entries  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at    BEFORE UPDATE ON profiles     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Integrations ──────────────────────────────────────────
-- One row per integration type ('teams', 'mcp').
-- config stores OAuth tokens / connection config (service-role access only).
CREATE TABLE IF NOT EXISTS integrations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL UNIQUE CHECK (type IN ('teams', 'mcp')),
  config       JSONB       NOT NULL DEFAULT '{}',
  is_active    BOOLEAN     NOT NULL DEFAULT FALSE,
  connected_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
-- Only admins can read/write integration records
CREATE POLICY "integrations_admin_only" ON integrations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
