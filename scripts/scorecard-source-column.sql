-- scorecard-source-column.sql
-- Adds a source column to scorecard_entries to distinguish manual vs Zoho-synced values.
-- Run once in Supabase SQL Editor.

BEGIN;

ALTER TABLE scorecard_entries
    ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Add CHECK constraint only if it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname   = 'scorecard_entries_source_check'
          AND  conrelid  = 'scorecard_entries'::regclass
    ) THEN
        ALTER TABLE scorecard_entries
            ADD CONSTRAINT scorecard_entries_source_check
            CHECK (source IN ('manual', 'zoho'));
    END IF;
END;
$$;

COMMIT;
