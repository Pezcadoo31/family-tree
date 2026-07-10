-- Migration: 13_grant_update_persons
-- Created: 2026-07-09

GRANT UPDATE ON persons TO anon, authenticated;

CREATE POLICY "dev_allow_update_persons"
  ON persons
  FOR UPDATE
  USING (true)
  WITH CHECK (true);