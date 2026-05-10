-- ============================================================================
-- Migration: 04_create_triggers
-- Description: Create triggers to automatically update updated_at column
-- Created: 2026-05-10
-- ============================================================================

-- Reusable function that updates updated_at column
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at() IS
  'Updates the updated_at column to current timestamp. Used as a BEFORE UPDATE trigger.';

-- Apply trigger to each table
CREATE TRIGGER trg_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_residences_updated_at
  BEFORE UPDATE ON residences
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_person_links_updated_at
  BEFORE UPDATE ON person_links
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();