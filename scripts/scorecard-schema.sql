-- ============================================================
-- scorecard-schema.sql
-- Creates 11 new tables for the Scorecard Module
-- Run manually in Supabase SQL Editor
-- Date: 2026-02-25
-- ============================================================

BEGIN;

-- ============================================================
-- 1. scorecard_templates
-- One template per group (e.g., "BDEV Pipeline Scorecard")
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scorecard_templates_group ON scorecard_templates(group_id);

-- ============================================================
-- 2. scorecard_sections
-- Sections within a template (US Team, India Team, Lead Gen)
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES scorecard_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  section_type text NOT NULL CHECK (section_type IN ('team_pipeline', 'lead_generation', 'campaign')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scorecard_sections_template ON scorecard_sections(template_id);

-- ============================================================
-- 3. scorecard_measures
-- Individual measures within a section (Contacts Created, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES scorecard_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  data_type text NOT NULL DEFAULT 'count' CHECK (data_type IN ('count', 'currency', 'percentage', 'decimal')),
  is_calculated boolean NOT NULL DEFAULT false,
  calculation_formula jsonb,
  owner_user_id uuid REFERENCES profiles(id),
  zoho_field_mapping text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scorecard_measures_section ON scorecard_measures(section_id);
CREATE INDEX idx_scorecard_measures_owner ON scorecard_measures(owner_user_id);

-- ============================================================
-- 4. scorecard_goals
-- Quarterly goals per measure
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_id uuid NOT NULL REFERENCES scorecard_measures(id) ON DELETE CASCADE,
  quarter varchar(10) NOT NULL, -- e.g., '2026-Q1'
  goal_value numeric NOT NULL,
  set_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(measure_id, quarter)
);

CREATE INDEX idx_scorecard_goals_measure ON scorecard_goals(measure_id);
CREATE INDEX idx_scorecard_goals_quarter ON scorecard_goals(quarter);

-- ============================================================
-- 5. goal_change_log
-- Append-only audit log for goal changes
-- ============================================================
CREATE TABLE IF NOT EXISTS goal_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES scorecard_goals(id) ON DELETE CASCADE,
  previous_value numeric NOT NULL,
  new_value numeric NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

CREATE INDEX idx_goal_change_log_goal ON goal_change_log(goal_id);

-- ============================================================
-- 6. scorecard_entries
-- Weekly data entries per measure per user
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_id uuid NOT NULL REFERENCES scorecard_measures(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  week_ending date NOT NULL,
  value numeric,
  zoho_record_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(measure_id, user_id, week_ending)
);

CREATE INDEX idx_scorecard_entries_measure ON scorecard_entries(measure_id);
CREATE INDEX idx_scorecard_entries_user ON scorecard_entries(user_id);
CREATE INDEX idx_scorecard_entries_week ON scorecard_entries(week_ending);
CREATE INDEX idx_scorecard_entries_lookup ON scorecard_entries(measure_id, week_ending);

-- ============================================================
-- 7. scorecard_entry_details
-- Line items for a specific entry (name + amount breakdowns)
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_entry_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES scorecard_entries(id) ON DELETE CASCADE,
  line_name text NOT NULL,
  line_value numeric,
  notes text,
  zoho_potential_id text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scorecard_entry_details_entry ON scorecard_entry_details(entry_id);

-- ============================================================
-- 8. campaigns
-- Campaign tracking (dynamic add/archive)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  leads_count_total integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX idx_campaigns_group ON campaigns(group_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================================
-- 9. campaign_weekly_data
-- Weekly data per campaign with configurable JSONB metrics
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_weekly_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  week_ending date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  entered_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, week_ending)
);

CREATE INDEX idx_campaign_weekly_data_campaign ON campaign_weekly_data(campaign_id);
CREATE INDEX idx_campaign_weekly_data_week ON campaign_weekly_data(week_ending);

-- ============================================================
-- 10. campaign_metric_definitions
-- Configurable column definitions per group
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  label text NOT NULL,
  data_type text NOT NULL DEFAULT 'count' CHECK (data_type IN ('count', 'currency', 'percentage', 'decimal')),
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, metric_key)
);

CREATE INDEX idx_campaign_metric_defs_group ON campaign_metric_definitions(group_id);

-- ============================================================
-- 11. scorecard_settings
-- Group-level settings (week_ending_day, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS scorecard_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_id, setting_key)
);

CREATE INDEX idx_scorecard_settings_group ON scorecard_settings(group_id);

-- ============================================================
-- Trigger: Auto-log goal changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_goal_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.goal_value IS DISTINCT FROM NEW.goal_value THEN
    INSERT INTO goal_change_log (goal_id, previous_value, new_value, changed_by, reason)
    VALUES (NEW.id, OLD.goal_value, NEW.goal_value, auth.uid(), NULL);
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER goal_change_log_trigger
  BEFORE UPDATE ON scorecard_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_goal_change();

-- ============================================================
-- updated_at triggers for tables that need them
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_scorecard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scorecard_templates_updated_at BEFORE UPDATE ON scorecard_templates FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();
CREATE TRIGGER scorecard_sections_updated_at BEFORE UPDATE ON scorecard_sections FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();
CREATE TRIGGER scorecard_measures_updated_at BEFORE UPDATE ON scorecard_measures FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();
CREATE TRIGGER scorecard_entries_updated_at BEFORE UPDATE ON scorecard_entries FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();
CREATE TRIGGER scorecard_entry_details_updated_at BEFORE UPDATE ON scorecard_entry_details FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();
CREATE TRIGGER campaign_weekly_data_updated_at BEFORE UPDATE ON campaign_weekly_data FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();
CREATE TRIGGER scorecard_settings_updated_at BEFORE UPDATE ON scorecard_settings FOR EACH ROW EXECUTE FUNCTION public.update_scorecard_updated_at();

COMMIT;
