"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Gender } from "@/lib/types";

// ============================================================================
// TYPES — input shape for creating a person
// ============================================================================

export type CreatePersonInput = {
  // Section 1 — Identity (required)
  given_name: string;
  paternal_surname: string;
  maternal_surname: string;
  maiden_name: string;
  birth_name: string;
  nickname: string;
  gender: Gender;

  // Section 2 — Birth
  birth_date: string;
  birth_place: string;

  // Section 3 — Personal info
  occupation: string;
  religion: string;
  nationality: string;   // comma-separated → will be split into array
  languages: string;     // comma-separated → will be split into array

  // Section 4 — History
  bio: string;
  notable_quote: string;

  // Section 5 — Death (optional)
  death_date: string;
  death_place: string;
  death_cause: string;

  // Section 6 — Photo
  photo_url: string;
};

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

// ============================================================================
// createPerson — inserts a new person into the database
// ============================================================================

export async function createPerson(
  input: CreatePersonInput
): Promise<ActionResult> {
  // Validate required fields
  if (!input.given_name.trim()) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  // Helper: convert empty string to null for optional fields
  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  // Helper: convert comma-separated string to array, filtering empty strings
  const toArray = (val: string): string[] =>
    val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const { data, error } = await supabase
    .from("persons")
    .insert({
      given_name:       input.given_name.trim(),
      paternal_surname: nullable(input.paternal_surname),
      maternal_surname: nullable(input.maternal_surname),
      maiden_name:      nullable(input.maiden_name),
      birth_name:       nullable(input.birth_name),
      nickname:         nullable(input.nickname),
      gender:           input.gender,
      birth_date:       nullable(input.birth_date),
      birth_place:      nullable(input.birth_place),
      occupation:       nullable(input.occupation),
      religion:         nullable(input.religion),
      nationality:      toArray(input.nationality),
      languages:        toArray(input.languages),
      bio:              nullable(input.bio),
      notable_quote:    nullable(input.notable_quote),
      death_date:       nullable(input.death_date),
      death_place:      nullable(input.death_place),
      death_cause:      nullable(input.death_cause),
      photo_url:        nullable(input.photo_url),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createPerson] Supabase error:", error);
    return { success: false, error: error.message };
  }

  // Revalidate the home page so the new person appears immediately
  revalidatePath("/");

  return { success: true, id: data.id };
}

// ============================================================================
// updatePerson — actualiza una persona existente
// ============================================================================

export async function updatePerson(
  id: string,
  input: CreatePersonInput
): Promise<ActionResult> {
  if (!input.given_name.trim()) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  const toArray = (val: string): string[] =>
    val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const { error } = await supabase
    .from("persons")
    .update({
      given_name:       input.given_name.trim(),
      paternal_surname: nullable(input.paternal_surname),
      maternal_surname: nullable(input.maternal_surname),
      maiden_name:      nullable(input.maiden_name),
      birth_name:       nullable(input.birth_name),
      nickname:         nullable(input.nickname),
      gender:           input.gender,
      birth_date:       nullable(input.birth_date),
      birth_place:      nullable(input.birth_place),
      occupation:       nullable(input.occupation),
      religion:         nullable(input.religion),
      nationality:      toArray(input.nationality),
      languages:        toArray(input.languages),
      bio:              nullable(input.bio),
      notable_quote:    nullable(input.notable_quote),
      death_date:       nullable(input.death_date),
      death_place:      nullable(input.death_place),
      death_cause:      nullable(input.death_cause),
      photo_url:        nullable(input.photo_url),
      updated_at:       new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updatePerson] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/persona/${id}`);

  return { success: true, id };
}

// ============================================================================
// deletePerson — elimina una persona (y sus relaciones en cascada)
// ============================================================================

export async function deletePerson(id: string): Promise<ActionResult> {
  const { error } = await supabase
    .from("persons")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deletePerson] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id };
}