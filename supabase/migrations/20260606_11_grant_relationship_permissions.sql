-- ============================================================================
-- Migration: 11_grant_relationship_permissions
-- Description: Grant INSERT/SELECT permissions on relationships table
-- Created: 2026-06-06
-- ============================================================================

GRANT SELECT ON relationships TO anon, authenticated;
GRANT INSERT ON relationships TO anon, authenticated;
GRANT UPDATE ON relationships TO anon, authenticated;
GRANT DELETE ON relationships TO anon, authenticated;

-- Dev policy: allow all operations
CREATE POLICY "dev_allow_all_relationships"
  ON relationships
  FOR ALL
  USING (true)
  WITH CHECK (true);