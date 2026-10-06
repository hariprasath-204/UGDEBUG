-- ==============================================================================
-- 02_realtime_and_security.sql : Realtime Replication and RLS Policies
-- Target Supabase Project: ksikkbvxtnpwnisvckeg
-- ==============================================================================

-- 1. ENABLE POSTGRES REALTIME BROADCASTING
-- Allows frontend clients (monitors, student editors, leaderboard) to receive instant WebSocket updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE settings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'questions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE questions;
    END IF;
END $$;

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. DROP OLD POLICIES (Idempotency)
DROP POLICY IF EXISTS "Public Read Settings" ON settings;
DROP POLICY IF EXISTS "Public Manage Settings" ON settings;
DROP POLICY IF EXISTS "Public Read Questions" ON questions;
DROP POLICY IF EXISTS "Public Manage Questions" ON questions;
DROP POLICY IF EXISTS "Public Read Users" ON users;
DROP POLICY IF EXISTS "Public Manage Users" ON users;

-- 4. CREATE OPEN RLS POLICIES FOR EVENT ENVIRONMENT
-- (Permits anon public access for frontend student PCs and admin consoles during the competition)
CREATE POLICY "Public Read Settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Public Manage Settings" ON settings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Public Manage Questions" ON questions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Users" ON users FOR SELECT USING (true);
CREATE POLICY "Public Manage Users" ON users FOR ALL USING (true) WITH CHECK (true);
