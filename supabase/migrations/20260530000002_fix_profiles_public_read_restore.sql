-- Restore profiles_public_read to allow any user (including authenticated) to read
-- public profiles.
--
-- The previous migration incorrectly added auth.uid() IS NULL to this policy, which
-- broke generateUniqueUsername() in src/lib/username.ts: that function uses the
-- authenticated server client to check username availability across all profiles, so
-- it must be able to see public profiles regardless of auth state.

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;

CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT
  USING (is_public = true);
