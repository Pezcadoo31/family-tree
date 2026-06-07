-- Migration: 12_add_sibling_relationship
-- Created: 2026-06-06
-- NOTA: Se ejecutó en dos queries por limitación de PostgreSQL con enums nuevos

-- Query A
ALTER TYPE relationship_type ADD VALUE 'sibling_of';

CREATE TYPE sibling_subtype AS ENUM (
  'full',
  'half',
  'step',
  'adoptive'
);

-- Query B
ALTER TABLE relationships
  ADD COLUMN sibling_subtype sibling_subtype;

ALTER TABLE relationships
  DROP CONSTRAINT consistent_subtype;

ALTER TABLE relationships
  ADD CONSTRAINT consistent_subtype CHECK (
    (type = 'parent_of' AND parent_subtype IS NOT NULL AND spouse_subtype IS NULL AND sibling_subtype IS NULL) OR
    (type = 'spouse_of' AND spouse_subtype IS NOT NULL AND parent_subtype IS NULL AND sibling_subtype IS NULL) OR
    (type = 'sibling_of' AND sibling_subtype IS NOT NULL AND parent_subtype IS NULL AND spouse_subtype IS NULL)
  );