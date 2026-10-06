-- ==============================================================================
-- 01_schema.sql : CODATHAN Platform Database Schema for Supabase
-- Target Supabase Project: ksikkbvxtnpwnisvckeg
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SETTINGS TABLE
-- Stores global configurations (event status/timer, branding info, compiler keys, language settings)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QUESTIONS TABLE
-- Stores the question bank for C / C++ debugging missions
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Easy', -- 'Easy', 'Medium', 'Hard', 'UG'
    phase TEXT DEFAULT 'cpp',      -- 'cpp' or 'c'
    points INT DEFAULT 100,
    expected_output TEXT DEFAULT '',
    initial_code TEXT DEFAULT '',
    correct_code TEXT DEFAULT '',
    error_lines TEXT DEFAULT '',
    variants JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USERS TABLE
-- Stores participant records, lot/roll numbers, live progress, submissions, drafts, and violation scores
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    roll_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'UG',
    score INT DEFAULT 0,
    tab_switches INT DEFAULT 0,
    copy_paste_count INT DEFAULT 0,
    total_submissions_count INT DEFAULT 0,
    elapsed_time_ms BIGINT DEFAULT 0,
    is_finished BOOLEAN DEFAULT FALSE,
    selected_question_id TEXT DEFAULT NULL,
    assigned_question_ids JSONB DEFAULT '[]'::jsonb,
    assigned_questions JSONB DEFAULT '{}'::jsonb,
    completed_questions JSONB DEFAULT '[]'::jsonb,
    drafts JSONB DEFAULT '{}'::jsonb,
    submissions JSONB DEFAULT '{}'::jsonb,
    question_start_times JSONB DEFAULT '{}'::jsonb,
    lang_submissions_count JSONB DEFAULT '{"c": 0, "cpp": 0}'::jsonb,
    final_code TEXT DEFAULT '',
    current_code TEXT DEFAULT '',
    cumulative_cleared_errors INT DEFAULT 0,
    cumulative_total_errors INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_roll_no ON users(roll_no);
CREATE INDEX IF NOT EXISTS idx_users_ranking ON users(score DESC, total_submissions_count ASC, elapsed_time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_phase ON questions(phase);

-- 6. AUTOMATIC updated_at TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_settings_timestamp ON settings;
CREATE TRIGGER trg_update_settings_timestamp
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_users_timestamp ON users;
CREATE TRIGGER trg_update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_questions_timestamp ON questions;
CREATE TRIGGER trg_update_questions_timestamp
BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
