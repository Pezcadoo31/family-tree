GRANT INSERT ON pet_relationships TO anon, authenticated;
GRANT UPDATE ON pet_relationships TO anon, authenticated;
GRANT DELETE ON pet_relationships TO anon, authenticated;

CREATE POLICY "dev_allow_write_pet_relationships"
  ON pet_relationships
  FOR ALL
  USING (true)
  WITH CHECK (true);