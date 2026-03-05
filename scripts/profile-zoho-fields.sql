-- profile-zoho-fields.sql
-- Adds zoho_user_id and team_region columns to the profiles table.
-- Run this one time. After running, update zoho_user_id for each user via the Admin Users UI.

BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zoho_user_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_region  text DEFAULT 'US';

UPDATE profiles
SET    team_region = 'India'
WHERE  full_name ILIKE '%Nirmiti%';

COMMIT;
