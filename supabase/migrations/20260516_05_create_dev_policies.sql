-- ============================================================================
-- Development RLS policies (TEMPORARY)
-- ============================================================================
-- These policies allow public READ access to all tables during development.
-- They will be REPLACED in a future migration when we implement Auth and
-- tree-based access control with roles (owner/editor/viewer).
-- ============================================================================

-- Allow anyone to read persons
CREATE POLICY "dev_allow_read_persons"
  ON persons
  FOR SELECT
  USING (true);

-- Allow anyone to read relationships
CREATE POLICY "dev_allow_read_relationships"
  ON relationships
  FOR SELECT
  USING (true);

-- Allow anyone to read residences
CREATE POLICY "dev_allow_read_residences"
  ON residences
  FOR SELECT
  USING (true);

-- Allow anyone to read person_links
CREATE POLICY "dev_allow_read_person_links"
  ON person_links
  FOR SELECT
  USING (true);