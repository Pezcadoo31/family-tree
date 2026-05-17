-- ============================================================================
-- Grant table permissions to anon role (TEMPORARY)
-- ============================================================================
-- After disabling "Automatically expose new tables" at project creation,
-- new tables don't grant access to the anon role by default. RLS policies
-- alone are not enough — the role also needs USAGE on the schema and
-- SELECT permission on each table.
--
-- These grants will be revoked or modified when we implement Auth and
-- proper role-based access control (Etapa 8-9).
-- ============================================================================

-- Allow anon role to use the public schema
GRANT USAGE ON SCHEMA public TO anon;

-- Allow anon role to read all our tables
GRANT SELECT ON persons       TO anon;
GRANT SELECT ON relationships TO anon;
GRANT SELECT ON residences    TO anon;
GRANT SELECT ON person_links  TO anon;