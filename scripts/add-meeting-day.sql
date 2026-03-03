-- Add meeting_day column to groups table
-- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
-- Default 4 (Thursday) since most L10 meetings are on Thursdays

ALTER TABLE groups ADD COLUMN IF NOT EXISTS meeting_day smallint NOT NULL DEFAULT 4;

-- Constraint to ensure valid day range
ALTER TABLE groups ADD CONSTRAINT groups_meeting_day_check CHECK (meeting_day >= 0 AND meeting_day <= 6);
