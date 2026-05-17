-- ============================================================================
-- BLOQUE 8: Enums for pets
-- ============================================================================

-- Species of pet
CREATE TYPE species_type AS ENUM (
  'dog',
  'cat',
  'bird',
  'fish',
  'rabbit',
  'rodent',
  'reptile',
  'horse',
  'farm_animal',
  'other'
);

-- Pet gender (simpler than humans, often unknown)
CREATE TYPE pet_gender AS ENUM (
  'male',
  'female',
  'unknown'
);

-- Where the pet came from
CREATE TYPE adoption_source_type AS ENUM (
  'shelter',
  'breeder',
  'family',
  'street',
  'friend',
  'born_at_home',
  'other'
);

-- Person ↔ pet relationship
CREATE TYPE pet_person_relationship AS ENUM (
  'owner',
  'primary_caregiver',
  'family_pet',
  'beloved_by',
  'adopter'
);

-- Pet ↔ pet relationship
CREATE TYPE pet_family_type AS ENUM (
  'parent_of',
  'sibling_of',
  'same_litter'
);