-- ============================================================
-- scorecard-seed-campaigns.sql
-- Seeds campaign records from VGScorecard.xlsx FebCampaigns tab
-- Run in Supabase SQL Editor AFTER scorecard-seed.sql
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_group_id uuid;
  v_campaign_id uuid;
BEGIN

  -- Get the BDEV group
  SELECT id INTO v_group_id FROM groups WHERE name ILIKE '%BDEV%' LIMIT 1;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM groups LIMIT 1;
  END IF;

  RAISE NOTICE 'Seeding campaigns for group %', v_group_id;

  -- ============================================================
  -- 1. Active campaigns (9 from Excel FebCampaigns tab)
  -- ============================================================

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Netsuite Campaign A', 300, 'active')
  RETURNING id INTO v_campaign_id;

  -- Week 2026-02-19 data for Netsuite Campaign A (no data in Excel for this week)

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Staffing', 600, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Oracle Support', 400, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Netsuite Campaign B', 300, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Staffing Campaign B (US)', 800, 'active')
  RETURNING id INTO v_campaign_id;

  -- This campaign has week 2026-02-19 data
  INSERT INTO campaign_weekly_data (campaign_id, week_ending, data, entered_by)
  VALUES (
    v_campaign_id,
    '2026-02-19',
    '{"outreach": 320, "connects": 0, "meetings": 0, "potentials": 0}'::jsonb,
    (SELECT id FROM profiles WHERE role = 'system_admin' LIMIT 1)
  );

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Oracle Support Campaign B', 400, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Middle East Campaign', NULL, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Custom Software Development', NULL, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaign_weekly_data (campaign_id, week_ending, data, entered_by)
  VALUES (
    v_campaign_id,
    '2026-02-19',
    '{"outreach": 140, "connects": 1, "meetings": 0, "potentials": 0}'::jsonb,
    (SELECT id FROM profiles WHERE role = 'system_admin' LIMIT 1)
  );

  INSERT INTO campaigns (group_id, name, leads_count_total, status)
  VALUES (v_group_id, 'Fractional CTO/CIO', NULL, 'active')
  RETURNING id INTO v_campaign_id;

  INSERT INTO campaign_weekly_data (campaign_id, week_ending, data, entered_by)
  VALUES (
    v_campaign_id,
    '2026-02-19',
    '{"outreach": 259, "connects": 2, "meetings": 2, "potentials": 0}'::jsonb,
    (SELECT id FROM profiles WHERE role = 'system_admin' LIMIT 1)
  );

  RAISE NOTICE 'Campaign seed complete: 9 campaigns with weekly data';

END $$;

COMMIT;
