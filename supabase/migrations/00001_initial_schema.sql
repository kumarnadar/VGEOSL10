-- ============================================
-- EOS L10 Platform - Initial Schema
-- 12 tables + triggers + RLS helper functions
-- ============================================

-- 1. profiles (extends auth.users)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text UNIQUE NOT NULL,
  geography   text CHECK (geography IN ('US', 'India', 'UAE', 'Other')),
  role        text NOT NULL DEFAULT 'team_member'
              CHECK (role IN ('team_member', 'group_admin', 'executive', 'system_admin')),
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. groups
CREATE TABLE groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  geography       text,
  meeting_cadence text CHECK (meeting_cadence IN ('weekly', 'biweekly', 'monthly')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 3. group_members
CREATE TABLE group_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_group text NOT NULL DEFAULT 'member'
                CHECK (role_in_group IN ('member', 'admin')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 4. quarters
CREATE TABLE quarters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  is_current  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Ensure only one current quarter
CREATE OR REPLACE FUNCTION public.ensure_single_current_quarter()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE quarters SET is_current = false WHERE id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_current_quarter
  BEFORE INSERT OR UPDATE ON quarters
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_current_quarter();

-- 5. rocks
CREATE TABLE rocks (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  text NOT NULL,
  owner_id               uuid NOT NULL REFERENCES profiles(id),
  group_id               uuid NOT NULL REFERENCES groups(id),
  quarter_id             uuid NOT NULL REFERENCES quarters(id),
  status                 text NOT NULL DEFAULT 'on_track'
                         CHECK (status IN ('on_track', 'off_track')),
  completion             text NOT NULL DEFAULT 'in_progress'
                         CHECK (completion IN ('in_progress', 'done', 'not_done', 'rolled_forward')),
  target_completion_date date,
  notes                  text,
  rolled_from_rock_id    uuid REFERENCES rocks(id),
  is_archived            boolean DEFAULT false,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
CREATE INDEX idx_rocks_group_quarter ON rocks(group_id, quarter_id);
CREATE INDEX idx_rocks_owner_quarter ON rocks(owner_id, quarter_id);

-- 6. milestones
CREATE TABLE milestones (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_id            uuid NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  title              text NOT NULL,
  due_date           date,
  status             text NOT NULL DEFAULT 'not_started'
                     CHECK (status IN ('not_started', 'wip', 'done', 'delayed')),
  collaborators_text text,
  notes              text,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX idx_milestones_rock ON milestones(rock_id, sort_order);

-- 7. milestone_collaborators
CREATE TABLE milestone_collaborators (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(milestone_id, user_id)
);

-- 8. focus_snapshots
CREATE TABLE focus_snapshots (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id),
  group_id   uuid NOT NULL REFERENCES groups(id),
  week_date  date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, group_id, week_date)
);
CREATE INDEX idx_snapshots_user_week ON focus_snapshots(user_id, week_date);

-- 9. focus_items
CREATE TABLE focus_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id        uuid NOT NULL REFERENCES focus_snapshots(id) ON DELETE CASCADE,
  priority           text,
  company_subject    text NOT NULL,
  location           text,
  prospect_value     numeric,
  pipeline_status    text,
  key_decision_maker text,
  weekly_action      text,
  obstacles          text,
  resources_needed   text,
  strategy           text,
  sort_order         integer DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
CREATE INDEX idx_focus_items_snapshot ON focus_items(snapshot_id, sort_order);

-- 10. issues
CREATE TABLE issues (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         uuid NOT NULL REFERENCES groups(id),
  raised_by        uuid NOT NULL REFERENCES profiles(id),
  description      text NOT NULL,
  priority         integer,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'in_discussion', 'closed')),
  assigned_to_id   uuid REFERENCES profiles(id),
  resolution_notes text,
  closed_at        timestamptz,
  is_archived      boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX idx_issues_group_status ON issues(group_id, status);

-- 11. todos
CREATE TABLE todos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES groups(id),
  description     text NOT NULL,
  assigned_to_id  uuid NOT NULL REFERENCES profiles(id),
  due_date        date NOT NULL,
  status          text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'done')),
  source_issue_id uuid REFERENCES issues(id),
  is_archived     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_todos_group_status ON todos(group_id, status);
CREATE INDEX idx_todos_assigned ON todos(assigned_to_id, due_date);

-- 12. meetings
CREATE TABLE meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES groups(id),
  meeting_date  date NOT NULL,
  notes         text,
  average_score numeric,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX idx_meetings_group_date ON meetings(group_id, meeting_date);

-- 13. meeting_attendees
CREATE TABLE meeting_attendees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id   uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id),
  score        numeric CHECK (score >= 1 AND score <= 10),
  checkin_note text,
  UNIQUE(meeting_id, user_id)
);

-- Trigger: recalculate average_score on meetings
CREATE OR REPLACE FUNCTION public.update_meeting_average_score()
RETURNS trigger AS $$
BEGIN
  UPDATE meetings
  SET average_score = (
    SELECT AVG(score) FROM meeting_attendees
    WHERE meeting_id = COALESCE(NEW.meeting_id, OLD.meeting_id)
    AND score IS NOT NULL
  )
  WHERE id = COALESCE(NEW.meeting_id, OLD.meeting_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_meeting_score
  AFTER INSERT OR UPDATE OR DELETE ON meeting_attendees
  FOR EACH ROW EXECUTE FUNCTION public.update_meeting_average_score();

-- 14. rock_ideas
CREATE TABLE rock_ideas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            uuid NOT NULL REFERENCES groups(id),
  description         text NOT NULL,
  suggested_owner_id  uuid REFERENCES profiles(id),
  priority_color      text CHECK (priority_color IN ('green', 'yellow', 'red')),
  comments            text,
  promoted_to_rock_id uuid REFERENCES rocks(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ============================================
-- updated_at trigger for all mutable tables
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_group_members_updated_at BEFORE UPDATE ON group_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rocks_updated_at BEFORE UPDATE ON rocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_focus_items_updated_at BEFORE UPDATE ON focus_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_issues_updated_at BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_todos_updated_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rock_ideas_updated_at BEFORE UPDATE ON rock_ideas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
