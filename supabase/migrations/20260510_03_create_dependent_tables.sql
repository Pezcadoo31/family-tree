-- ============================================================================
-- Migration: 03_create_dependent_tables
-- Description: Create relationships, residences, and person_links tables
-- Created: 2026-05-10
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: relationships
-- ----------------------------------------------------------------------------
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  person_a_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  type relationship_type NOT NULL,
  parent_subtype parent_subtype,
  spouse_subtype spouse_subtype,

  start_date DATE,
  end_date   DATE,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_relationship CHECK (person_a_id <> person_b_id),

  CONSTRAINT consistent_subtype CHECK (
    (type = 'parent_of' AND parent_subtype IS NOT NULL AND spouse_subtype IS NULL) OR
    (type = 'spouse_of' AND spouse_subtype IS NOT NULL AND parent_subtype IS NULL)
  ),

  CONSTRAINT end_after_start CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

COMMENT ON TABLE relationships IS 'Connections between persons: parent-child and spouse';
COMMENT ON COLUMN relationships.person_a_id IS 'In parent_of: the parent. In spouse_of: either partner.';
COMMENT ON COLUMN relationships.person_b_id IS 'In parent_of: the child. In spouse_of: the other partner.';

CREATE INDEX idx_relationships_person_a ON relationships(person_a_id);
CREATE INDEX idx_relationships_person_b ON relationships(person_b_id);

-- ----------------------------------------------------------------------------
-- Table: residences
-- ----------------------------------------------------------------------------
CREATE TABLE residences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  place      TEXT NOT NULL,
  start_date DATE,
  end_date   DATE,
  notes      TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT end_after_start CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

COMMENT ON TABLE residences IS 'Places where each person lived and for how long';

CREATE INDEX idx_residences_person ON residences(person_id);

-- ----------------------------------------------------------------------------
-- Table: person_links
-- ----------------------------------------------------------------------------
CREATE TABLE person_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  label TEXT NOT NULL,
  url   TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_url CHECK (url ~ '^https?://')
);

COMMENT ON TABLE person_links IS 'Links to social networks, websites and pages of each person';

CREATE INDEX idx_person_links_person ON person_links(person_id);