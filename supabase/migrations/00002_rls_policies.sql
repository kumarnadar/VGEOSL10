-- ============================================
-- RLS Helper Functions
-- ============================================

CREATE OR REPLACE FUNCTION public.user_group_ids()
RETURNS uuid[] AS $$
  SELECT COALESCE(array_agg(group_id), '{}')
  FROM group_members
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_sysadmin()
RETURNS boolean AS $$
  SELECT public.user_role() = 'system_admin'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE rock_ideas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles
-- ============================================
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (public.is_admin_or_sysadmin());

-- ============================================
-- groups
-- ============================================
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (
    id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (public.is_admin_or_sysadmin());

CREATE POLICY "groups_update" ON groups FOR UPDATE
  USING (public.is_admin_or_sysadmin());

-- ============================================
-- group_members
-- ============================================
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (
    public.is_admin_or_sysadmin()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_members.group_id
      AND user_id = auth.uid()
      AND role_in_group = 'admin'
    )
  );

CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (
    public.is_admin_or_sysadmin()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role_in_group = 'admin'
    )
  );

-- ============================================
-- quarters
-- ============================================
CREATE POLICY "quarters_select" ON quarters FOR SELECT
  USING (true);

CREATE POLICY "quarters_insert" ON quarters FOR INSERT
  WITH CHECK (public.is_admin_or_sysadmin());

CREATE POLICY "quarters_update" ON quarters FOR UPDATE
  USING (public.is_admin_or_sysadmin());

-- ============================================
-- rocks
-- ============================================
CREATE POLICY "rocks_select" ON rocks FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "rocks_insert" ON rocks FOR INSERT
  WITH CHECK (
    group_id = ANY(public.user_group_ids())
  );

CREATE POLICY "rocks_update" ON rocks FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = rocks.group_id
      AND user_id = auth.uid()
      AND role_in_group = 'admin'
    )
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "rocks_delete" ON rocks FOR DELETE
  USING (
    owner_id = auth.uid()
    OR public.is_admin_or_sysadmin()
  );

-- ============================================
-- milestones
-- ============================================
CREATE POLICY "milestones_select" ON milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rocks
      WHERE rocks.id = milestones.rock_id
      AND (
        rocks.group_id = ANY(public.user_group_ids())
        OR public.user_role() IN ('executive', 'system_admin')
      )
    )
  );

CREATE POLICY "milestones_insert" ON milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rocks
      WHERE rocks.id = milestones.rock_id
      AND rocks.group_id = ANY(public.user_group_ids())
    )
  );

CREATE POLICY "milestones_update" ON milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rocks
      WHERE rocks.id = milestones.rock_id
      AND (
        rocks.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = rocks.group_id
          AND user_id = auth.uid()
          AND role_in_group = 'admin'
        )
        OR public.is_admin_or_sysadmin()
      )
    )
  );

CREATE POLICY "milestones_delete" ON milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rocks
      WHERE rocks.id = milestones.rock_id
      AND (rocks.owner_id = auth.uid() OR public.is_admin_or_sysadmin())
    )
  );

-- ============================================
-- milestone_collaborators
-- ============================================
CREATE POLICY "milestone_collabs_select" ON milestone_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM milestones m
      JOIN rocks r ON r.id = m.rock_id
      WHERE m.id = milestone_collaborators.milestone_id
      AND (
        r.group_id = ANY(public.user_group_ids())
        OR public.user_role() IN ('executive', 'system_admin')
      )
    )
  );

CREATE POLICY "milestone_collabs_insert" ON milestone_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM milestones m
      JOIN rocks r ON r.id = m.rock_id
      WHERE m.id = milestone_collaborators.milestone_id
      AND r.group_id = ANY(public.user_group_ids())
    )
  );

CREATE POLICY "milestone_collabs_delete" ON milestone_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM milestones m
      JOIN rocks r ON r.id = m.rock_id
      WHERE m.id = milestone_collaborators.milestone_id
      AND (r.owner_id = auth.uid() OR public.is_admin_or_sysadmin())
    )
  );

-- ============================================
-- focus_snapshots
-- ============================================
CREATE POLICY "focus_snapshots_select" ON focus_snapshots FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "focus_snapshots_insert" ON focus_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "focus_snapshots_update" ON focus_snapshots FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- focus_items
-- ============================================
CREATE POLICY "focus_items_select" ON focus_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM focus_snapshots fs
      WHERE fs.id = focus_items.snapshot_id
      AND (
        fs.group_id = ANY(public.user_group_ids())
        OR public.user_role() IN ('executive', 'system_admin')
      )
    )
  );

CREATE POLICY "focus_items_insert" ON focus_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM focus_snapshots fs
      WHERE fs.id = focus_items.snapshot_id
      AND fs.user_id = auth.uid()
      AND fs.is_current = true
    )
  );

CREATE POLICY "focus_items_update" ON focus_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM focus_snapshots fs
      WHERE fs.id = focus_items.snapshot_id
      AND fs.user_id = auth.uid()
      AND fs.is_current = true
    )
  );

CREATE POLICY "focus_items_delete" ON focus_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM focus_snapshots fs
      WHERE fs.id = focus_items.snapshot_id
      AND fs.user_id = auth.uid()
      AND fs.is_current = true
    )
  );

-- ============================================
-- issues
-- ============================================
CREATE POLICY "issues_select" ON issues FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "issues_insert" ON issues FOR INSERT
  WITH CHECK (group_id = ANY(public.user_group_ids()));

CREATE POLICY "issues_update" ON issues FOR UPDATE
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

-- ============================================
-- todos
-- ============================================
CREATE POLICY "todos_select" ON todos FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "todos_insert" ON todos FOR INSERT
  WITH CHECK (group_id = ANY(public.user_group_ids()));

CREATE POLICY "todos_update" ON todos FOR UPDATE
  USING (
    assigned_to_id = auth.uid()
    OR group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

-- ============================================
-- meetings
-- ============================================
CREATE POLICY "meetings_select" ON meetings FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "meetings_insert" ON meetings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = meetings.group_id
      AND user_id = auth.uid()
      AND role_in_group = 'admin'
    )
    OR public.is_admin_or_sysadmin()
  );

CREATE POLICY "meetings_update" ON meetings FOR UPDATE
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );

-- ============================================
-- meeting_attendees
-- ============================================
CREATE POLICY "meeting_attendees_select" ON meeting_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_attendees.meeting_id
      AND (
        m.group_id = ANY(public.user_group_ids())
        OR public.user_role() IN ('executive', 'system_admin')
      )
    )
  );

CREATE POLICY "meeting_attendees_insert" ON meeting_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_attendees.meeting_id
      AND m.group_id = ANY(public.user_group_ids())
    )
  );

CREATE POLICY "meeting_attendees_update" ON meeting_attendees FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_sysadmin()
  );

-- ============================================
-- rock_ideas
-- ============================================
CREATE POLICY "rock_ideas_select" ON rock_ideas FOR SELECT
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.user_role() IN ('executive', 'system_admin')
  );

CREATE POLICY "rock_ideas_insert" ON rock_ideas FOR INSERT
  WITH CHECK (group_id = ANY(public.user_group_ids()));

CREATE POLICY "rock_ideas_update" ON rock_ideas FOR UPDATE
  USING (
    group_id = ANY(public.user_group_ids())
    OR public.is_admin_or_sysadmin()
  );
