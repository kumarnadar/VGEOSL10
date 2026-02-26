-- ============================================================
-- Meeting Agenda Configuration Table + RLS + Seed
-- Run in Supabase SQL Editor
-- ============================================================

-- Table: meeting_agenda_config
CREATE TABLE IF NOT EXISTS meeting_agenda_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  label text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  time_box_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, step_key)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_meeting_agenda_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meeting_agenda_config_updated_at
  BEFORE UPDATE ON meeting_agenda_config
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_agenda_config_updated_at();

-- RLS
ALTER TABLE meeting_agenda_config ENABLE ROW LEVEL SECURITY;

-- Group members can read agenda config for their groups
CREATE POLICY "meeting_agenda_config_select"
  ON meeting_agenda_config FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()
    )
  );

-- System admins can insert agenda config
CREATE POLICY "meeting_agenda_config_insert"
  ON meeting_agenda_config FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
  );

-- System admins can update agenda config
CREATE POLICY "meeting_agenda_config_update"
  ON meeting_agenda_config FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
  );

-- System admins can delete agenda config
CREATE POLICY "meeting_agenda_config_delete"
  ON meeting_agenda_config FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'system_admin')
  );

-- Seed default agenda steps for all existing groups
INSERT INTO meeting_agenda_config (group_id, step_key, label, description, display_order, is_enabled, time_box_minutes)
SELECT
  g.id,
  s.step_key,
  s.label,
  s.description,
  s.display_order,
  true,
  s.time_box_minutes
FROM groups g
CROSS JOIN (
  VALUES
    ('checkins',  'Check-ins',          'Personal & professional highlights', 1, 5),
    ('rocks',     'Rock Review',        'On track / off track status',        2, 15),
    ('scorecard', 'Scorecard',          'Review key metrics',                 3, 10),
    ('focus',     'Top 10 Review',      'Focus tracker review',               4, 10),
    ('issues',    'Issues (IDS)',       'Identify, Discuss, Solve',           5, 60),
    ('conclude',  'Conclude & Score',   'Recap to-dos and rate meeting',      6, 5)
) AS s(step_key, label, description, display_order, time_box_minutes)
ON CONFLICT (group_id, step_key) DO NOTHING;
