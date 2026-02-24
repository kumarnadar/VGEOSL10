-- ============================================
-- roll_forward_rock: Copy rock + milestones to next quarter
-- ============================================
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

-- ============================================
-- start_new_week: Snapshot and carry forward focus items
-- ============================================
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

-- ============================================
-- promote_rock_idea: Convert idea to active rock
-- ============================================
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
  SELECT * INTO v_idea FROM rock_ideas WHERE id = p_idea_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rock idea not found: %', p_idea_id;
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
