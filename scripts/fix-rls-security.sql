-- ============================================================
-- fix-rls-security.sql
-- Security fixes for RLS policies and SECURITY DEFINER functions
-- Run manually in Supabase SQL Editor
-- Date: 2026-02-24
-- ============================================================

BEGIN;

-- ============================================================
-- FIX 1: Prevent privilege escalation via profiles_update_own
--
-- Problem: Any user can UPDATE their own profile row, including
-- the `role` column, allowing self-promotion to system_admin.
--
-- Solution: A BEFORE UPDATE trigger that blocks role changes
-- unless the caller is already a system_admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being changed and the caller is not system_admin, block it
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.user_role() != 'system_admin' THEN
      RAISE EXCEPTION 'Only system admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();


-- ============================================================
-- FIX 2: Add caller authorization to SECURITY DEFINER RPCs
--
-- Problem: All three RPC functions run as SECURITY DEFINER
-- (bypassing RLS) but do not verify that the caller is
-- authorized to perform the operation.
-- ============================================================

-- 2a. roll_forward_rock: caller must own the rock, be in its group, or be admin
CREATE OR REPLACE FUNCTION public.roll_forward_rock(
  p_rock_id uuid,
  p_new_quarter_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_new_rock_id uuid;
  v_old_rock RECORD;
BEGIN
  -- Get original rock
  SELECT * INTO v_old_rock FROM rocks WHERE id = p_rock_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rock not found: %', p_rock_id;
  END IF;

  -- Authorization: caller must be owner, in the group, or admin
  IF NOT (
    v_old_rock.owner_id = auth.uid()
    OR v_old_rock.group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  ) THEN
    RAISE EXCEPTION 'Not authorized to roll forward this rock';
  END IF;

  -- Mark original as rolled forward
  UPDATE rocks SET completion = 'rolled_forward', updated_at = now()
  WHERE id = p_rock_id;

  -- Create new rock in next quarter
  INSERT INTO rocks (title, owner_id, group_id, quarter_id, status, completion, target_completion_date, notes, rolled_from_rock_id)
  VALUES (v_old_rock.title, v_old_rock.owner_id, v_old_rock.group_id, p_new_quarter_id, 'on_track', 'in_progress', NULL, v_old_rock.notes, p_rock_id)
  RETURNING id INTO v_new_rock_id;

  -- Copy milestones (reset status)
  INSERT INTO milestones (rock_id, title, due_date, status, collaborators_text, notes, sort_order)
  SELECT v_new_rock_id, title, NULL, 'not_started', collaborators_text, notes, sort_order
  FROM milestones WHERE rock_id = p_rock_id
  ORDER BY sort_order;

  -- Copy milestone collaborators
  INSERT INTO milestone_collaborators (milestone_id, user_id)
  SELECT nm.id, mc.user_id
  FROM milestones om
  JOIN milestone_collaborators mc ON mc.milestone_id = om.id
  JOIN milestones nm ON nm.rock_id = v_new_rock_id AND nm.sort_order = om.sort_order
  WHERE om.rock_id = p_rock_id;

  RETURN v_new_rock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2b. start_new_week: force p_user_id to match auth.uid(), verify group membership
CREATE OR REPLACE FUNCTION public.start_new_week(
  p_user_id uuid,
  p_group_id uuid,
  p_new_week_date date
)
RETURNS uuid AS $$
DECLARE
  v_old_snapshot_id uuid;
  v_new_snapshot_id uuid;
BEGIN
  -- Authorization: can only start new week for yourself
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Can only create focus snapshots for yourself';
  END IF;

  -- Verify user is a member of the specified group
  IF NOT (p_group_id = ANY(public.user_group_ids())) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  -- Find current snapshot
  SELECT id INTO v_old_snapshot_id
  FROM focus_snapshots
  WHERE user_id = p_user_id AND group_id = p_group_id AND is_current = true;

  -- Mark old snapshot as not current
  IF v_old_snapshot_id IS NOT NULL THEN
    UPDATE focus_snapshots SET is_current = false WHERE id = v_old_snapshot_id;
  END IF;

  -- Create new snapshot
  INSERT INTO focus_snapshots (user_id, group_id, week_date, is_current)
  VALUES (p_user_id, p_group_id, p_new_week_date, true)
  RETURNING id INTO v_new_snapshot_id;

  -- Copy focus items from old snapshot
  IF v_old_snapshot_id IS NOT NULL THEN
    INSERT INTO focus_items (snapshot_id, priority, company_subject, location, prospect_value, pipeline_status, key_decision_maker, weekly_action, obstacles, resources_needed, strategy, sort_order)
    SELECT v_new_snapshot_id, priority, company_subject, location, prospect_value, pipeline_status, key_decision_maker, NULL, obstacles, resources_needed, strategy, sort_order
    FROM focus_items WHERE snapshot_id = v_old_snapshot_id
    ORDER BY sort_order;
  END IF;

  RETURN v_new_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2c. promote_rock_idea: caller must be in the idea's group or be admin
CREATE OR REPLACE FUNCTION public.promote_rock_idea(
  p_idea_id uuid,
  p_quarter_id uuid,
  p_owner_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_idea RECORD;
  v_new_rock_id uuid;
BEGIN
  -- Fetch the idea
  SELECT * INTO v_idea FROM rock_ideas WHERE id = p_idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rock idea not found: %', p_idea_id;
  END IF;

  -- Authorization: caller must be in the idea's group or be admin
  IF NOT (
    v_idea.group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  ) THEN
    RAISE EXCEPTION 'Not authorized to promote this rock idea';
  END IF;

  -- Create rock from idea
  INSERT INTO rocks (title, owner_id, group_id, quarter_id)
  VALUES (v_idea.description, p_owner_id, v_idea.group_id, p_quarter_id)
  RETURNING id INTO v_new_rock_id;

  -- Link idea to rock
  UPDATE rock_ideas SET promoted_to_rock_id = v_new_rock_id, updated_at = now()
  WHERE id = p_idea_id;

  RETURN v_new_rock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- FIX 3: rocks_insert policy missing system_admin bypass
--
-- Problem: system_admin users cannot insert rocks for groups
-- they are not directly a member of, even though they should
-- have full access.
--
-- Solution: Add OR public.is_admin_or_sysadmin() to the
-- WITH CHECK clause.
-- ============================================================

DROP POLICY IF EXISTS "rocks_insert" ON rocks;
CREATE POLICY "rocks_insert" ON rocks FOR INSERT
  WITH CHECK (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );


COMMIT;
