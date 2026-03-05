-- fix-goal-decimals.sql
-- Round all goal values to whole numbers.
-- Goals like 15.08, 12.06 (weekly averages from quarterly targets) should be whole numbers.
-- Run once in Supabase SQL Editor.

BEGIN;

-- Disable the goal_change_log trigger temporarily to avoid logging this bulk fix
ALTER TABLE scorecard_goals DISABLE TRIGGER goal_change_log_trigger;

UPDATE scorecard_goals
SET goal_value = ROUND(goal_value)
WHERE goal_value != ROUND(goal_value);

ALTER TABLE scorecard_goals ENABLE TRIGGER goal_change_log_trigger;

COMMIT;
