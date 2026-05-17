-- ============================================================================
-- BLOQUE 10: Pets dependent tables, triggers, permissions, and policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: pet_relationships (person ↔ pet)
-- ----------------------------------------------------------------------------
CREATE TABLE pet_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pet_id    UUID NOT NULL REFERENCES pets(id)    ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  relationship pet_person_relationship NOT NULL,

  start_date DATE,
  end_date   DATE,
  notes      TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pet_rel_end_after_start CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

COMMENT ON TABLE pet_relationships IS 'Connections between persons and pets';

CREATE INDEX idx_pet_rel_pet    ON pet_relationships(pet_id);
CREATE INDEX idx_pet_rel_person ON pet_relationships(person_id);

-- ----------------------------------------------------------------------------
-- Table: pet_family (pet ↔ pet)
-- ----------------------------------------------------------------------------
CREATE TABLE pet_family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pet_a_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  pet_b_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

  type pet_family_type NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A pet can't be related to itself
  CONSTRAINT pet_no_self_relationship CHECK (pet_a_id <> pet_b_id)
);

COMMENT ON TABLE pet_family IS 'Pet-to-pet family relationships (siblings, parents, litter)';
COMMENT ON COLUMN pet_family.pet_a_id IS 'In parent_of: the parent. In sibling_of/same_litter: either pet.';
COMMENT ON COLUMN pet_family.pet_b_id IS 'In parent_of: the offspring. In sibling_of/same_litter: the other.';

CREATE INDEX idx_pet_family_a ON pet_family(pet_a_id);
CREATE INDEX idx_pet_family_b ON pet_family(pet_b_id);

-- ----------------------------------------------------------------------------
-- Table: pet_residences
-- ----------------------------------------------------------------------------
CREATE TABLE pet_residences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

  place      TEXT NOT NULL,
  start_date DATE,
  end_date   DATE,

  -- Did the pet move WITH or WITHOUT its primary owner?
  with_owner BOOLEAN DEFAULT TRUE,

  -- Optional reference to person who took care of the pet at this place
  caretaker_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pet_res_end_after_start CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

COMMENT ON TABLE pet_residences IS 'Places where pets lived, including when they stayed with someone else';
COMMENT ON COLUMN pet_residences.with_owner IS 'TRUE if the pet moved with its owner; FALSE if it stayed elsewhere';
COMMENT ON COLUMN pet_residences.caretaker_person_id IS 'Who took care of the pet at this place (optional)';

CREATE INDEX idx_pet_residences_pet ON pet_residences(pet_id);

-- ----------------------------------------------------------------------------
-- Table: pet_links
-- ----------------------------------------------------------------------------
CREATE TABLE pet_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  url   TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pet_links_valid_url CHECK (url ~ '^https?://')
);

COMMENT ON TABLE pet_links IS 'External links: photo galleries, social media, adoption records';

CREATE INDEX idx_pet_links_pet ON pet_links(pet_id);

-- ----------------------------------------------------------------------------
-- Triggers: auto-update updated_at on all pet tables
-- ----------------------------------------------------------------------------
-- We already have set_updated_at() from a previous migration, just reuse it

CREATE TRIGGER trg_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pet_relationships_updated_at
  BEFORE UPDATE ON pet_relationships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pet_family_updated_at
  BEFORE UPDATE ON pet_family
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pet_residences_updated_at
  BEFORE UPDATE ON pet_residences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pet_links_updated_at
  BEFORE UPDATE ON pet_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Development RLS policies (TEMPORARY)
-- Same pattern as persons: allow public SELECT during development.
-- Will be replaced when Auth + tree-based access control is implemented.
-- ----------------------------------------------------------------------------

CREATE POLICY "dev_allow_read_pets"
  ON pets FOR SELECT USING (true);

CREATE POLICY "dev_allow_read_pet_relationships"
  ON pet_relationships FOR SELECT USING (true);

CREATE POLICY "dev_allow_read_pet_family"
  ON pet_family FOR SELECT USING (true);

CREATE POLICY "dev_allow_read_pet_residences"
  ON pet_residences FOR SELECT USING (true);

CREATE POLICY "dev_allow_read_pet_links"
  ON pet_links FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- Grant table permissions to anon role (TEMPORARY)
-- Required because "Automatically expose new tables" is disabled.
-- ----------------------------------------------------------------------------

GRANT SELECT ON pets              TO anon;
GRANT SELECT ON pet_relationships TO anon;
GRANT SELECT ON pet_family        TO anon;
GRANT SELECT ON pet_residences    TO anon;
GRANT SELECT ON pet_links         TO anon;