// ============================================================================
// Database types — manually written to match the Supabase schema
// ============================================================================
// These types reflect the structure of the database tables.
// Keep this file in sync with the SQL migrations in supabase/migrations/
// ============================================================================

// ============================================================================
// PERSON TYPES
// ============================================================================

// Enum values for the `gender` column on persons
export type Gender =
  | 'male'
  | 'female'
  | 'non_binary'
  | 'other'
  | 'unspecified';

// A person as stored in the database
export type Person = {
  id: string;
  given_name: string;
  paternal_surname: string | null;
  maternal_surname: string | null;
  maiden_name: string | null;
  birth_name: string | null;
  nickname: string | null;
  gender: Gender;
  nationality: string[];
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  death_cause: string | null;
  occupation: string | null;
  religion: string | null;
  languages: string[];
  notable_quote: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// RELATIONSHIP TYPES (person ↔ person)
// ============================================================================

export type RelationshipType = 'parent_of' | 'spouse_of';

export type ParentSubtype =
  | 'biological'
  | 'adoptive'
  | 'step'
  | 'foster';

export type SpouseSubtype =
  | 'married'
  | 'divorced'
  | 'separated'
  | 'widowed'
  | 'partner';

export type Relationship = {
  id: string;
  person_a_id: string;
  person_b_id: string;
  type: RelationshipType;
  parent_subtype: ParentSubtype | null;
  spouse_subtype: SpouseSubtype | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// RESIDENCE TYPES (person)
// ============================================================================

export type Residence = {
  id: string;
  person_id: string;
  place: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PERSON LINKS
// ============================================================================

export type PersonLink = {
  id: string;
  person_id: string;
  label: string;
  url: string;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PET TYPES
// ============================================================================

export type Species =
  | 'dog'
  | 'cat'
  | 'bird'
  | 'fish'
  | 'rabbit'
  | 'rodent'
  | 'reptile'
  | 'horse'
  | 'farm_animal'
  | 'other';

export type PetGender = 'male' | 'female' | 'unknown';

export type AdoptionSourceType =
  | 'shelter'
  | 'breeder'
  | 'family'
  | 'street'
  | 'friend'
  | 'born_at_home'
  | 'other';

// A pet as stored in the database
export type Pet = {
  id: string;
  name: string;
  nickname: string | null;
  species: Species;
  breed: string | null;
  color: string | null;
  gender: PetGender;
  birth_date: string | null;
  birth_place: string | null;
  adoption_date: string | null;
  adoption_source: string | null;
  adoption_source_type: AdoptionSourceType | null;
  adoption_notes: string | null;
  death_date: string | null;
  death_place: string | null;
  death_cause: string | null;
  memorial_note: string | null;
  favorite_thing: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PET RELATIONSHIP TYPES (person ↔ pet)
// ============================================================================

export type PetPersonRelationship =
  | 'owner'
  | 'primary_caregiver'
  | 'family_pet'
  | 'beloved_by'
  | 'adopter';

export type PetRelationship = {
  id: string;
  pet_id: string;
  person_id: string;
  relationship: PetPersonRelationship;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PET FAMILY TYPES (pet ↔ pet)
// ============================================================================

export type PetFamilyType =
  | 'parent_of'
  | 'sibling_of'
  | 'same_litter';

export type PetFamily = {
  id: string;
  pet_a_id: string;
  pet_b_id: string;
  type: PetFamilyType;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PET RESIDENCES
// ============================================================================

export type PetResidence = {
  id: string;
  pet_id: string;
  place: string;
  start_date: string | null;
  end_date: string | null;
  with_owner: boolean;
  caretaker_person_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// PET LINKS
// ============================================================================

export type PetLink = {
  id: string;
  pet_id: string;
  label: string;
  url: string;
  created_at: string;
  updated_at: string;
};