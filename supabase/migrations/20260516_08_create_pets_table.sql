-- ============================================================================
-- BLOQUE 9: Pets table
-- ============================================================================

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name      TEXT NOT NULL,
  nickname  TEXT,
  species   species_type NOT NULL,
  breed     TEXT,
  color     TEXT,
  gender    pet_gender NOT NULL DEFAULT 'unknown',

  -- Birth
  birth_date  DATE,
  birth_place TEXT,

  -- Adoption / how this pet joined the family
  adoption_date         DATE,
  adoption_source       TEXT,
  adoption_source_type  adoption_source_type,
  adoption_notes        TEXT,

  -- Death (NULL if alive)
  death_date  DATE,
  death_place TEXT,
  death_cause TEXT,

  -- Memory and personality
  memorial_note   TEXT,
  favorite_thing  TEXT,

  -- Photo and bio
  photo_url TEXT,
  bio       TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- death_date must be after birth_date if both exist
  CONSTRAINT pet_death_after_birth CHECK (
    death_date IS NULL OR birth_date IS NULL OR death_date >= birth_date
  ),

  -- adoption_date must be after birth_date if both exist
  CONSTRAINT pet_adoption_after_birth CHECK (
    adoption_date IS NULL OR birth_date IS NULL OR adoption_date >= birth_date
  )
);

-- Documentation
COMMENT ON TABLE pets IS 'Pets registered in the family ecosystem';
COMMENT ON COLUMN pets.memorial_note IS 'Tribute or special memory of a deceased pet';
COMMENT ON COLUMN pets.favorite_thing IS 'Quirk, favorite food, behavior that captures their personality';
COMMENT ON COLUMN pets.adoption_source IS 'Free text: shelter name, breeder name, etc.';

-- Index for fast search by name and species
CREATE INDEX idx_pets_name ON pets(name);
CREATE INDEX idx_pets_species ON pets(species);