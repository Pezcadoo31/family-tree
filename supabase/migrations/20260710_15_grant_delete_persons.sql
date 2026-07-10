-- Migration: 15_grant_delete_persons
-- Created: 2026-07-10

GRANT DELETE ON persons TO anon, authenticated;

CREATE POLICY "dev_allow_delete_persons"
  ON persons
  FOR DELETE
  USING (true);
