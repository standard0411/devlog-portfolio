-- Fix RLS data isolation: public_read policies must only fire for anon users.
--
-- Bug: logs_select, projects_public_read, and skills_public_read used OR conditions
-- without auth.uid() IS NULL, so authenticated users received other users' public data
-- in addition to their own when the dashboard queries had no explicit user_id filter.
--
-- Fix: split logs into owner_select + public_select; add auth.uid() IS NULL guard
-- to projects and skills public_read policies.

-- ── logs ──────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "logs_select" ON logs;

CREATE POLICY "logs_owner_select" ON logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "logs_public_select" ON logs
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = logs.user_id
        AND profiles.is_public = true
    )
  );

-- ── projects ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "projects_public_read" ON projects;

CREATE POLICY "projects_public_read" ON projects
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = projects.user_id
        AND profiles.is_public = true
    )
  );

-- ── skills ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "skills_public_read" ON skills;

CREATE POLICY "skills_public_read" ON skills
  FOR SELECT
  USING (
    auth.uid() IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = skills.user_id
        AND profiles.is_public = true
    )
  );
