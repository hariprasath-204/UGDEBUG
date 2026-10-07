-- ==============================================================================
-- 04_rpc_functions.sql : Atomic Operations & Helper Functions
-- Target Supabase Project: ksikkbvxtnpwnisvckeg
-- ==============================================================================

-- 1. Atomic Tab Switch Warning Tracker
-- Prevents race conditions when a student switches tabs rapidly
CREATE OR REPLACE FUNCTION record_tab_switch_penalty(target_user_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        tab_switches = COALESCE(tab_switches, 0) + 1,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Atomic Copy-Paste Count Tracker
CREATE OR REPLACE FUNCTION record_copy_paste_violation(target_user_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        copy_paste_count = COALESCE(copy_paste_count, 0) + 1,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Reset Event Database State for New Round
CREATE OR REPLACE FUNCTION reset_event_scores()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        score = 0,
        tab_switches = 0,
        copy_paste_count = 0,
        total_submissions_count = 0,
        elapsed_time_ms = 0,
        is_finished = FALSE,
        selected_question_id = NULL,
        completed_questions = '[]'::jsonb,
        drafts = '{}'::jsonb,
        submissions = '{}'::jsonb,
        question_start_times = '{}'::jsonb,
        lang_submissions_count = '{"c": 0, "cpp": 0}'::jsonb,
        final_code = '',
        current_code = '',
        cumulative_cleared_errors = 0,
        cumulative_total_errors = 0,
        updated_at = NOW();

    UPDATE settings
    SET 
        data = jsonb_set(
            jsonb_set(data, '{status}', '"waiting"'),
            '{startTime}', 'null'
        ),
        updated_at = NOW()
    WHERE id = 'event';
END;
$$ LANGUAGE plpgsql;
