-- ============================================================================
-- Migration: 02_create_persons_table
-- Description: Create the main persons table
-- Created: 2026-05-10
-- ============================================================================

CREATE TABLE persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Names
  given_name        TEXT NOT NULL,
  paternal_surname  TEXT,
  maternal_surname  TEXT,
  maiden_name       TEXT,
  birth_name        TEXT,
  nickname          TEXT,

  -- Gender
  gender gender_type NOT NULL DEFAULT 'unspecified',

  -- Nationalities (array because a person can have multiple)
  nationality TEXT[] DEFAULT '{}',

  -- Birth
  birth_date  DATE,
  birth_place TEXT,

  -- Death (NULL if alive)
  death_date  DATE,
  death_place TEXT,
  death_cause TEXT,

  -- Life information
  occupation     TEXT,
  religion       TEXT,
  languages      TEXT[] DEFAULT '{}',
  notable_quote  TEXT,

  -- Photo and biography
  photo_url TEXT,
  bio       TEXT,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: death_date must be after birth_date if both exist
  CONSTRAINT death_after_birth CHECK (
    death_date IS NULL OR birth_date IS NULL OR death_date >= birth_date
  )
);

-- Documentation
COMMENT ON TABLE persons IS 'Persons registered in the family tree';
COMMENT ON COLUMN persons.given_name IS 'First name(s)';
COMMENT ON COLUMN persons.birth_name IS 'Original name if the person legally changed it';
COMMENT ON COLUMN persons.nickname IS 'Nickname or informal name';
COMMENT ON COLUMN persons.nationality IS 'Array of nationalities, e.g. {"mexican", "spanish"}';
COMMENT ON COLUMN persons.notable_quote IS 'Memorable phrase or motto the person used to say';

-- Index on surnames for fast search
CREATE INDEX idx_persons_paternal_surname ON persons(paternal_surname);
CREATE INDEX idx_persons_maternal_surname ON persons(maternal_surname);