-- ============================================================================
-- Migration: 01_create_enums
-- Description: Create custom enum types for person attributes and relationships
-- Created: 2026-05-10
-- ============================================================================

-- Gender of a person
CREATE TYPE gender_type AS ENUM (
  'male',
  'female',
  'non_binary',
  'other',
  'unspecified'
);

-- Type of relationship between two persons
CREATE TYPE relationship_type AS ENUM (
  'parent_of',
  'spouse_of'
);

-- Subtype when relationship_type = 'parent_of'
CREATE TYPE parent_subtype AS ENUM (
  'biological',
  'adoptive',
  'step',
  'foster'
);

-- Subtype when relationship_type = 'spouse_of'
CREATE TYPE spouse_subtype AS ENUM (
  'married',
  'divorced',
  'separated',
  'widowed',
  'partner'
);