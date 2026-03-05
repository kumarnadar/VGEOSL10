-- audit-login-schema.sql
-- Creates the audit_logins table with RLS policies.
-- Run once in Supabase SQL Editor.

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logins (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES profiles(id),
    login_at    timestamptz NOT NULL DEFAULT now(),
    ip_address  text,
    user_agent  text
);

CREATE INDEX IF NOT EXISTS audit_logins_user_id_idx  ON audit_logins (user_id);
CREATE INDEX IF NOT EXISTS audit_logins_login_at_idx ON audit_logins (login_at);

-- RLS
ALTER TABLE audit_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_admin can view all login audit rows" ON audit_logins;
CREATE POLICY "system_admin can view all login audit rows"
    ON audit_logins
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

DROP POLICY IF EXISTS "authenticated users can insert own login audit row" ON audit_logins;
CREATE POLICY "authenticated users can insert own login audit row"
    ON audit_logins
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

COMMIT;
