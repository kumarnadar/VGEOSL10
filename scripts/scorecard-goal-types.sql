-- scorecard-goal-types.sql
-- Adds goal_type to scorecard_measures, baseline + thresholds to scorecard_goals
-- Run in Supabase SQL Editor
-- Date: 2026-03-04

BEGIN;

-- 1. Add goal_type to scorecard_measures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorecard_measures' AND column_name = 'goal_type'
  ) THEN
    ALTER TABLE scorecard_measures ADD COLUMN goal_type text NOT NULL DEFAULT 'weekly';
    ALTER TABLE scorecard_measures ADD CONSTRAINT scorecard_measures_goal_type_check
      CHECK (goal_type IN ('weekly', 'cumulative', 'point_in_time'));
  END IF;
END $$;

-- 2. Add baseline_value and threshold columns to scorecard_goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorecard_goals' AND column_name = 'baseline_value'
  ) THEN
    ALTER TABLE scorecard_goals ADD COLUMN baseline_value numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorecard_goals' AND column_name = 'threshold_green'
  ) THEN
    ALTER TABLE scorecard_goals ADD COLUMN threshold_green integer NOT NULL DEFAULT 90;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorecard_goals' AND column_name = 'threshold_yellow'
  ) THEN
    ALTER TABLE scorecard_goals ADD COLUMN threshold_yellow integer NOT NULL DEFAULT 50;
  END IF;
END $$;

-- 3. Set goal_type for existing measures based on scorecard logic rules
-- Weekly measures: activity counts tracked per week
UPDATE scorecard_measures SET goal_type = 'weekly'
WHERE name IN ('Contacts Created', 'First Time Meetings', 'New Potentials Created', 'Proposals Delivered (#)',
               'Emails Sent', 'Emails Replied To', 'Calls Made', 'LI Connections', 'Meetings Set', 'Connects');

-- Cumulative measures: running totals toward quarterly goals
UPDATE scorecard_measures SET goal_type = 'cumulative'
WHERE name IN ('Proposals Delivered ($)', 'New One-Time Deals Booked ($)', 'Recurring Deals Booked ($)',
               'Number of Lead Conversions', 'Qualified Leads');

-- Point-in-time measures: weekly snapshots (locked after week closes)
UPDATE scorecard_measures SET goal_type = 'point_in_time'
WHERE name LIKE 'Quarter-End%';

COMMIT;
