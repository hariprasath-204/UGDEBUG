-- ==============================================================================
-- 03_seed_settings.sql : Initial Configuration Data for Softtech Codathan
-- Target Supabase Project: ksikkbvxtnpwnisvckeg
-- ==============================================================================

-- 1. SEED DEFAULT SETTINGS
INSERT INTO settings (id, data) VALUES
(
  'event',
  '{
    "status": "waiting",
    "durationMinutes": 60,
    "questionsPerStudent": 2,
    "startTime": null,
    "endTime": null
  }'::jsonb
),
(
  'branding',
  '{
    "collegeName": "Ayya Nadar Janaki Ammal College",
    "departmentName": "Department of Computer Applications",
    "mainTitle": "SOFTTECH",
    "associationTitle": "ASSOCIATION",
    "tagline": "THE ULTIMATE DEBUGGING CHALLENGE",
    "buttonText": "START_SYSTEM",
    "footerText": "© 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.",
    "roundsText": "C++ DEBUGGING (5 MISSIONS)",
    "modalTitle": "SYSTEM ACCESS"
  }'::jsonb
),
(
  'language',
  '{
    "cpp": true
  }'::jsonb
),
(
  'onlinecompiler',
  '{
    "keys": [
  "a6ed2c1539a350079a242c2c2deecc36",
  "ccb79ad09699924cb025d0ba0b6690ed",
  "8471946023c357608b7666f763b66d9e",
  "00f2e3686a1712e01b8fa42d4ff76635",
  "31f89d72d1ae6013e4925c06bac75502"
]

  }'::jsonb
)
ON CONFLICT (id) 
DO UPDATE SET 
  data = EXCLUDED.data,
  updated_at = NOW();
