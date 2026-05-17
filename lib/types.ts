// ============================================================================
// Database types — manually written to match the Supabase schema
// ============================================================================
// These types reflect the structure of the `persons` table.
// When we add more tables, we'll add their types here too.
// ============================================================================

// Enum values for the `gender` column
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