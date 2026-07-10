-- Migration: 14_grant_insert_pets
-- Created: 2026-07-09

GRANT SELECT ON pets TO anon, authenticated;
GRANT INSERT ON pets TO anon, authenticated;
GRANT UPDATE ON pets TO anon, authenticated;
GRANT DELETE ON pets TO anon, authenticated;

CREATE POLICY "dev_allow_all_pets"
  ON pets
  FOR ALL
  USING (true)
  WITH CHECK (true);