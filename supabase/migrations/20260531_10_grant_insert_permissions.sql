-- ============================================================================
-- Grant INSERT permissions to anon role (TEMPORARY)
-- ============================================================================
-- Allows the app to insert new records during development.
-- Will be restricted to authenticated users only in Etapa 8-9 (Auth).
-- ============================================================================

-- Persons table
GRANT INSERT ON persons TO anon;

CREATE POLICY "dev_allow_insert_persons"
  ON persons
  FOR INSERT
  WITH CHECK (true);

-- Pets table (for future use)
GRANT INSERT ON pets TO anon;

CREATE POLICY "dev_allow_insert_pets"
  ON pets
  FOR INSERT
  WITH CHECK (true);