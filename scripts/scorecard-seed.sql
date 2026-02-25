-- ============================================================
-- scorecard-seed.sql
-- Seeds BDEV scorecard template, measures, campaign metrics,
-- settings, and Q1 2026 goals from VGScorecard.xlsx
-- Run manually in Supabase SQL Editor AFTER scorecard-schema.sql and scorecard-rls.sql
-- Date: 2026-02-25
--
-- IMPORTANT: Replace <BDEV_GROUP_ID> with the actual BDEV group UUID
-- before running. Query: SELECT id, name FROM groups;
-- ============================================================

BEGIN;

-- ============================================================
-- Variables: Set your BDEV group ID here
-- ============================================================
DO $$
DECLARE
  v_group_id uuid;
  v_template_id uuid;
  v_us_section_id uuid;
  v_india_section_id uuid;
  v_leadgen_section_id uuid;
BEGIN

  -- Get the BDEV group (adjust name if different)
  SELECT id INTO v_group_id FROM groups WHERE name ILIKE '%BDEV%' LIMIT 1;
  IF v_group_id IS NULL THEN
    RAISE NOTICE 'BDEV group not found. Using first group as fallback.';
    SELECT id INTO v_group_id FROM groups LIMIT 1;
  END IF;

  RAISE NOTICE 'Using group_id: %', v_group_id;

  -- ============================================================
  -- 1. Create template
  -- ============================================================
  INSERT INTO scorecard_templates (group_id, name, description, is_active)
  VALUES (v_group_id, 'BDEV Pipeline Scorecard', 'Weekly sales pipeline and campaign tracking for BDEV team', true)
  RETURNING id INTO v_template_id;

  -- ============================================================
  -- 2. Create sections
  -- ============================================================
  INSERT INTO scorecard_sections (template_id, name, display_order, section_type)
  VALUES (v_template_id, 'US Team', 1, 'team_pipeline')
  RETURNING id INTO v_us_section_id;

  INSERT INTO scorecard_sections (template_id, name, display_order, section_type)
  VALUES (v_template_id, 'India Team', 2, 'team_pipeline')
  RETURNING id INTO v_india_section_id;

  INSERT INTO scorecard_sections (template_id, name, display_order, section_type)
  VALUES (v_template_id, 'Lead Generation', 3, 'lead_generation')
  RETURNING id INTO v_leadgen_section_id;

  -- ============================================================
  -- 3. Create measures - US Team (10 measures)
  -- ============================================================
  INSERT INTO scorecard_measures (section_id, name, display_order, data_type, is_calculated) VALUES
    (v_us_section_id, 'Contacts Created', 1, 'count', false),
    (v_us_section_id, 'First Time Meetings', 2, 'count', false),
    (v_us_section_id, 'New Potentials Created', 3, 'count', false),
    (v_us_section_id, 'Proposals Delivered (#)', 4, 'count', false),
    (v_us_section_id, 'Proposals Delivered ($)', 5, 'currency', false),
    (v_us_section_id, 'New One-Time Deals Booked ($)', 6, 'currency', false),
    (v_us_section_id, 'Recurring Deals Booked ($)', 7, 'currency', false),
    (v_us_section_id, 'Quarter-End One-Time Weighted Forecast ($)', 8, 'currency', false),
    (v_us_section_id, 'Quarter-End Recurring Weighted Forecast ($)', 9, 'currency', false),
    (v_us_section_id, 'Quarter-End Bookings Forecast', 10, 'currency', true);

  -- Set calculation formula for the sum row
  UPDATE scorecard_measures
  SET calculation_formula = '{"type": "sum", "source_measures": ["Quarter-End One-Time Weighted Forecast ($)", "Quarter-End Recurring Weighted Forecast ($)"]}'::jsonb
  WHERE section_id = v_us_section_id AND name = 'Quarter-End Bookings Forecast';

  -- ============================================================
  -- 4. Create measures - India Team (8 measures)
  -- ============================================================
  INSERT INTO scorecard_measures (section_id, name, display_order, data_type, is_calculated) VALUES
    (v_india_section_id, 'Contacts Created', 1, 'count', false),
    (v_india_section_id, 'First Time Meetings', 2, 'count', false),
    (v_india_section_id, 'New Potentials Created', 3, 'count', false),
    (v_india_section_id, 'Proposals Delivered (#)', 4, 'count', false),
    (v_india_section_id, 'Proposals Delivered ($)', 5, 'currency', false),
    (v_india_section_id, 'New One-Time Deals Booked ($)', 6, 'currency', false),
    (v_india_section_id, 'Quarter-End One-Time Weighted Forecast ($)', 7, 'currency', false),
    (v_india_section_id, 'Quarter-End Bookings Forecast', 8, 'currency', true);

  UPDATE scorecard_measures
  SET calculation_formula = '{"type": "sum", "source_measures": ["Quarter-End One-Time Weighted Forecast ($)"]}'::jsonb
  WHERE section_id = v_india_section_id AND name = 'Quarter-End Bookings Forecast';

  -- ============================================================
  -- 5. Create measures - Lead Generation (8 measures)
  -- ============================================================
  INSERT INTO scorecard_measures (section_id, name, display_order, data_type, is_calculated) VALUES
    (v_leadgen_section_id, 'Emails Sent', 1, 'count', false),
    (v_leadgen_section_id, 'Emails Replied To', 2, 'count', false),
    (v_leadgen_section_id, 'Calls Made', 3, 'count', false),
    (v_leadgen_section_id, 'LI Connections', 4, 'count', false),
    (v_leadgen_section_id, 'Meetings Set', 5, 'count', false),
    (v_leadgen_section_id, 'Connects', 6, 'count', false),
    (v_leadgen_section_id, 'Number of Lead Conversions', 7, 'count', false),
    (v_leadgen_section_id, 'Qualified Leads', 8, 'count', false);

  -- ============================================================
  -- 6. Set Q1 2026 Goals (from Excel "Goal" column)
  -- ============================================================

  -- US Team goals
  INSERT INTO scorecard_goals (measure_id, quarter, goal_value, set_by)
  SELECT m.id, '2026-Q1', goal.val, (SELECT id FROM profiles WHERE role = 'system_admin' LIMIT 1)
  FROM (VALUES
    ('Contacts Created', 15.08),
    ('First Time Meetings', 12.06),
    ('New Potentials Created', 8.08),
    ('Proposals Delivered (#)', 2.67),
    ('Proposals Delivered ($)', 800001),
    ('New One-Time Deals Booked ($)', 266667),
    ('Recurring Deals Booked ($)', 188333),
    ('Quarter-End One-Time Weighted Forecast ($)', 800000),
    ('Quarter-End Recurring Weighted Forecast ($)', 565000),
    ('Quarter-End Bookings Forecast', 1365000)
  ) AS goal(name, val)
  JOIN scorecard_measures m ON m.name = goal.name AND m.section_id = v_us_section_id;

  -- India Team goals
  INSERT INTO scorecard_goals (measure_id, quarter, goal_value, set_by)
  SELECT m.id, '2026-Q1', goal.val, (SELECT id FROM profiles WHERE role = 'system_admin' LIMIT 1)
  FROM (VALUES
    ('Contacts Created', 75),
    ('First Time Meetings', 75),
    ('New Potentials Created', 15),
    ('Proposals Delivered (#)', 5),
    ('Proposals Delivered ($)', 150000),
    ('New One-Time Deals Booked ($)', 33000),
    ('Quarter-End One-Time Weighted Forecast ($)', 100000),
    ('Quarter-End Bookings Forecast', 100000)
  ) AS goal(name, val)
  JOIN scorecard_measures m ON m.name = goal.name AND m.section_id = v_india_section_id;

  -- Lead Generation goals
  INSERT INTO scorecard_goals (measure_id, quarter, goal_value, set_by)
  SELECT m.id, '2026-Q1', goal.val, (SELECT id FROM profiles WHERE role = 'system_admin' LIMIT 1)
  FROM (VALUES
    ('Emails Sent', 1760),
    ('Emails Replied To', 176),
    ('Calls Made', 1760),
    ('LI Connections', 110),
    ('Meetings Set', 11),
    ('Connects', 276),
    ('Number of Lead Conversions', 25),
    ('Qualified Leads', 11)
  ) AS goal(name, val)
  JOIN scorecard_measures m ON m.name = goal.name AND m.section_id = v_leadgen_section_id;

  -- ============================================================
  -- 7. Seed campaign metric definitions
  -- Core (required): outreach, connects, meetings, potentials
  -- Optional: email metrics, cold call metrics
  -- ============================================================
  INSERT INTO campaign_metric_definitions (group_id, metric_key, label, data_type, is_required, display_order) VALUES
    -- Core required metrics
    (v_group_id, 'outreach', 'Outreach', 'count', true, 1),
    (v_group_id, 'connects', 'Connects / Responses', 'count', true, 2),
    (v_group_id, 'meetings', 'Meetings', 'count', true, 3),
    (v_group_id, 'potentials', 'Potentials', 'count', true, 4),
    -- Optional email metrics
    (v_group_id, 'total_contacts', 'Total Contacts', 'count', false, 5),
    (v_group_id, 'delivered', 'Delivered', 'count', false, 6),
    (v_group_id, 'open_rate', 'Open Rate', 'percentage', false, 7),
    (v_group_id, 'reply_rate', 'Reply Rate', 'percentage', false, 8),
    (v_group_id, 'opt_out', 'Opt Out', 'percentage', false, 9),
    -- Optional cold call metrics
    (v_group_id, 'cold_call_no', 'Cold Call No', 'count', false, 10),
    (v_group_id, 'connected_call', 'Connected Call', 'count', false, 11),
    (v_group_id, 'positive_response', 'Positive Response', 'count', false, 12),
    (v_group_id, 'negative_response', 'Negative Response', 'count', false, 13);

  -- ============================================================
  -- 8. Seed scorecard settings
  -- ============================================================
  INSERT INTO scorecard_settings (group_id, setting_key, setting_value) VALUES
    (v_group_id, 'week_ending_day', 'friday');

  RAISE NOTICE 'Scorecard seed complete for group %', v_group_id;

END $$;

COMMIT;
