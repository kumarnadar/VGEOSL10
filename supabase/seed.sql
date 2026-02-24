-- Seed quarters
INSERT INTO quarters (id, label, start_date, end_date, is_current) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Q4 2025', '2025-10-01', '2025-12-31', false),
  ('a0000000-0000-0000-0000-000000000002', 'Q1 2026', '2026-01-01', '2026-03-31', true);

-- Seed groups
INSERT INTO groups (id, name, description, geography, meeting_cadence) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'BDev', 'Business Development', 'US', 'weekly');

-- Note: profiles and group_members are seeded after users sign up via auth.
-- The handle_new_user trigger creates profiles automatically.
