-- ============================================================
-- User Preferences Table + Avatar Column + RLS + Storage
-- Run in Supabase SQL Editor
-- ============================================================

-- Add avatar_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Table: user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notification_channel text NOT NULL DEFAULT 'email' CHECK (notification_channel IN ('email', 'sms', 'both', 'none')),
  meeting_reminder_timing text NOT NULL DEFAULT '1_day' CHECK (meeting_reminder_timing IN ('1_day', '1_hour', 'both', 'none')),
  scorecard_reminder_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "user_preferences_select_own"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "user_preferences_insert_own"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "user_preferences_update_own"
  ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- Storage: avatars bucket
-- NOTE: Run these in Supabase Dashboard > Storage
-- Or use the SQL below if storage schema is accessible
-- ============================================================

-- Create avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload their own avatar
CREATE POLICY "avatar_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "avatar_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "avatar_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for avatars
CREATE POLICY "avatar_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
