-- ============================================================
-- scorecard-rls.sql
-- RLS policies for all 11 scorecard tables
-- Depends on: scorecard-schema.sql + existing helper functions
--   public.user_role(), public.user_group_ids(), public.is_admin_or_sysadmin()
-- Run manually in Supabase SQL Editor AFTER scorecard-schema.sql
-- Date: 2026-02-25
-- ============================================================

BEGIN;

-- ============================================================
-- Helper: Check if user is executive or group lead in a group
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_group_lead_or_exec(p_group_id uuid)
RETURNS boolean AS $$
BEGIN
  -- System admins always pass
  IF public.is_admin_or_sysadmin() THEN
    RETURN true;
  END IF;
  -- Check if user has executive or group_lead role in this group
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role_in_group IN ('group_lead', 'executive')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: Get group_id for a template
CREATE OR REPLACE FUNCTION public.scorecard_template_group(p_template_id uuid)
RETURNS uuid AS $$
  SELECT group_id FROM scorecard_templates WHERE id = p_template_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get group_id for a section (via template)
CREATE OR REPLACE FUNCTION public.scorecard_section_group(p_section_id uuid)
RETURNS uuid AS $$
  SELECT t.group_id
  FROM scorecard_sections s
  JOIN scorecard_templates t ON t.id = s.template_id
  WHERE s.id = p_section_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get group_id for a measure (via section -> template)
CREATE OR REPLACE FUNCTION public.scorecard_measure_group(p_measure_id uuid)
RETURNS uuid AS $$
  SELECT t.group_id
  FROM scorecard_measures m
  JOIN scorecard_sections s ON s.id = m.section_id
  JOIN scorecard_templates t ON t.id = s.template_id
  WHERE m.id = p_measure_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Get owner_user_id of a scorecard_entry
CREATE OR REPLACE FUNCTION public.scorecard_entry_owner(p_entry_id uuid)
RETURNS uuid AS $$
  SELECT user_id FROM scorecard_entries WHERE id = p_entry_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Enable RLS on all scorecard tables
-- ============================================================
ALTER TABLE scorecard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_entry_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_weekly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1. scorecard_templates
-- SELECT: Group members + executives (admin)
-- INSERT/UPDATE: System admin only
-- ============================================================
CREATE POLICY "scorecard_templates_select" ON scorecard_templates FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "scorecard_templates_insert" ON scorecard_templates FOR INSERT
  WITH CHECK (public.is_admin_or_sysadmin());

CREATE POLICY "scorecard_templates_update" ON scorecard_templates FOR UPDATE
  USING (public.is_admin_or_sysadmin());

-- ============================================================
-- 2. scorecard_sections
-- SELECT: Group members (via template group_id) + executives
-- INSERT/UPDATE: System admin only
-- ============================================================
CREATE POLICY "scorecard_sections_select" ON scorecard_sections FOR SELECT
  USING (
    public.scorecard_template_group(template_id) = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "scorecard_sections_insert" ON scorecard_sections FOR INSERT
  WITH CHECK (public.is_admin_or_sysadmin());

CREATE POLICY "scorecard_sections_update" ON scorecard_sections FOR UPDATE
  USING (public.is_admin_or_sysadmin());

-- ============================================================
-- 3. scorecard_measures
-- SELECT: Group members (via section -> template group_id) + executives
-- INSERT/UPDATE: System admin only
-- ============================================================
CREATE POLICY "scorecard_measures_select" ON scorecard_measures FOR SELECT
  USING (
    public.scorecard_section_group(section_id) = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "scorecard_measures_insert" ON scorecard_measures FOR INSERT
  WITH CHECK (public.is_admin_or_sysadmin());

CREATE POLICY "scorecard_measures_update" ON scorecard_measures FOR UPDATE
  USING (public.is_admin_or_sysadmin());

-- ============================================================
-- 4. scorecard_goals
-- SELECT: Group members
-- INSERT/UPDATE: Executives + group leads
-- ============================================================
CREATE POLICY "scorecard_goals_select" ON scorecard_goals FOR SELECT
  USING (
    public.scorecard_measure_group(measure_id) = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "scorecard_goals_insert" ON scorecard_goals FOR INSERT
  WITH CHECK (
    public.is_group_lead_or_exec(public.scorecard_measure_group(measure_id))
  );

CREATE POLICY "scorecard_goals_update" ON scorecard_goals FOR UPDATE
  USING (
    public.is_group_lead_or_exec(public.scorecard_measure_group(measure_id))
  );

-- ============================================================
-- 5. goal_change_log
-- SELECT: Executives + group leads
-- INSERT: System only (via trigger), but allow for manual audit entries
-- No UPDATE or DELETE
-- ============================================================
CREATE POLICY "goal_change_log_select" ON goal_change_log FOR SELECT
  USING (
    public.is_admin_or_sysadmin()
    OR EXISTS (
      SELECT 1 FROM scorecard_goals g
      WHERE g.id = goal_change_log.goal_id
        AND public.is_group_lead_or_exec(public.scorecard_measure_group(g.measure_id))
    )
  );

CREATE POLICY "goal_change_log_insert" ON goal_change_log FOR INSERT
  WITH CHECK (true); -- Trigger runs as SECURITY DEFINER; allow direct inserts too

-- ============================================================
-- 6. scorecard_entries
-- SELECT: Group members
-- INSERT/UPDATE/DELETE: owner_user_id = auth.uid()
-- ============================================================
CREATE POLICY "scorecard_entries_select" ON scorecard_entries FOR SELECT
  USING (
    public.scorecard_measure_group(measure_id) = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "scorecard_entries_insert" ON scorecard_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "scorecard_entries_update" ON scorecard_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "scorecard_entries_delete" ON scorecard_entries FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 7. scorecard_entry_details
-- SELECT: Group members (via parent entry)
-- INSERT/UPDATE/DELETE: Parent entry owner
-- ============================================================
CREATE POLICY "scorecard_entry_details_select" ON scorecard_entry_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scorecard_entries e
      WHERE e.id = scorecard_entry_details.entry_id
        AND (
          public.scorecard_measure_group(e.measure_id) = ANY(public.user_group_ids())
          OR public.is_admin_or_sysadmin()
        )
    )
  );

CREATE POLICY "scorecard_entry_details_insert" ON scorecard_entry_details FOR INSERT
  WITH CHECK (public.scorecard_entry_owner(entry_id) = auth.uid());

CREATE POLICY "scorecard_entry_details_update" ON scorecard_entry_details FOR UPDATE
  USING (public.scorecard_entry_owner(entry_id) = auth.uid());

CREATE POLICY "scorecard_entry_details_delete" ON scorecard_entry_details FOR DELETE
  USING (public.scorecard_entry_owner(entry_id) = auth.uid());

-- ============================================================
-- 8. campaigns
-- SELECT: Group members
-- INSERT/UPDATE: Group leads + executives (campaign managers)
-- ============================================================
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT
  WITH CHECK (public.is_group_lead_or_exec(group_id));

CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE
  USING (public.is_group_lead_or_exec(group_id));

-- ============================================================
-- 9. campaign_weekly_data
-- SELECT: Group members (via campaign group_id)
-- INSERT/UPDATE: entered_by = auth.uid()
-- ============================================================
CREATE POLICY "campaign_weekly_data_select" ON campaign_weekly_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_weekly_data.campaign_id
        AND (
          c.group_id = ANY(public.user_group_ids())
          OR public.is_admin_or_sysadmin()
        )
    )
  );

CREATE POLICY "campaign_weekly_data_insert" ON campaign_weekly_data FOR INSERT
  WITH CHECK (entered_by = auth.uid());

CREATE POLICY "campaign_weekly_data_update" ON campaign_weekly_data FOR UPDATE
  USING (entered_by = auth.uid());

-- ============================================================
-- 10. campaign_metric_definitions
-- SELECT: Group members
-- INSERT/UPDATE/DELETE: Executives + group leads
-- ============================================================
CREATE POLICY "campaign_metric_defs_select" ON campaign_metric_definitions FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "campaign_metric_defs_insert" ON campaign_metric_definitions FOR INSERT
  WITH CHECK (public.is_group_lead_or_exec(group_id));

CREATE POLICY "campaign_metric_defs_update" ON campaign_metric_definitions FOR UPDATE
  USING (public.is_group_lead_or_exec(group_id));

CREATE POLICY "campaign_metric_defs_delete" ON campaign_metric_definitions FOR DELETE
  USING (public.is_group_lead_or_exec(group_id));

-- ============================================================
-- 11. scorecard_settings
-- SELECT: Group members
-- INSERT/UPDATE: Executives + group leads
-- ============================================================
CREATE POLICY "scorecard_settings_select" ON scorecard_settings FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "scorecard_settings_insert" ON scorecard_settings FOR INSERT
  WITH CHECK (public.is_group_lead_or_exec(group_id));

CREATE POLICY "scorecard_settings_update" ON scorecard_settings FOR UPDATE
  USING (public.is_group_lead_or_exec(group_id));

COMMIT;
