-- ============================================================
-- User Quotas Table -- Quarterly Sales Quotas per User
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS user_quotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quarter smallint NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year smallint NOT NULL CHECK (year BETWEEN 2020 AND 2099),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quarter, year)
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_user_quotas_updated_at();

-- RLS
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read quotas (needed for dashboard chart)
CREATE POLICY "user_quotas_select_authenticated"
  ON user_quotas FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert quotas
CREATE POLICY "user_quotas_insert_admin"
  ON user_quotas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('system_admin', 'admin'))
  );

-- Only admins can update quotas
CREATE POLICY "user_quotas_update_admin"
  ON user_quotas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('system_admin', 'admin'))
  );

-- Only admins can delete quotas
CREATE POLICY "user_quotas_delete_admin"
  ON user_quotas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('system_admin', 'admin'))
  );

COMMIT;

-- ============================================================
-- VERIFICATION: Run after the script completes
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'user_quotas';
-- SELECT * FROM user_quotas LIMIT 5;
