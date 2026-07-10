"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Species, PetGender, AdoptionSourceType } from "@/lib/types";

// ============================================================================
// TYPES — input shape for creating a pet
// ============================================================================

export type CreatePetInput = {
  // Identity
  name: string;
  nickname: string;
  species: Species;
  breed: string;
  color: string;
  gender: PetGender;

  // Birth
  birth_date: string;
  birth_place: string;

  // Adoption
  adoption_date: string;
  adoption_source: string;
  adoption_source_type: AdoptionSourceType | "";
  adoption_notes: string;

  // Death (optional)
  death_date: string;
  death_place: string;
  death_cause: string;

  // Memory and personality
  memorial_note: string;
  favorite_thing: string;

  // Photo and bio
  photo_url: string;
  bio: string;
};

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

// ============================================================================
// createPet — inserts a new pet into the database
// ============================================================================

export async function createPet(
  input: CreatePetInput
): Promise<ActionResult> {
  if (!input.name.trim()) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  const { data, error } = await supabase
    .from("pets")
    .insert({
      name:                  input.name.trim(),
      nickname:              nullable(input.nickname),
      species:               input.species,
      breed:                 nullable(input.breed),
      color:                 nullable(input.color),
      gender:                input.gender,
      birth_date:            nullable(input.birth_date),
      birth_place:           nullable(input.birth_place),
      adoption_date:         nullable(input.adoption_date),
      adoption_source:       nullable(input.adoption_source),
      adoption_source_type:  input.adoption_source_type || null,
      adoption_notes:        nullable(input.adoption_notes),
      death_date:            nullable(input.death_date),
      death_place:           nullable(input.death_place),
      death_cause:           nullable(input.death_cause),
      memorial_note:         nullable(input.memorial_note),
      favorite_thing:        nullable(input.favorite_thing),
      photo_url:             nullable(input.photo_url),
      bio:                   nullable(input.bio),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createPet] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id: data.id };
}

// ============================================================================
// updatePet — actualiza una mascota existente
// ============================================================================

export async function updatePet(
  id: string,
  input: CreatePetInput
): Promise<ActionResult> {
  if (!input.name.trim()) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  const { error } = await supabase
    .from("pets")
    .update({
      name:                  input.name.trim(),
      nickname:              nullable(input.nickname),
      species:               input.species,
      breed:                 nullable(input.breed),
      color:                 nullable(input.color),
      gender:                input.gender,
      birth_date:            nullable(input.birth_date),
      birth_place:           nullable(input.birth_place),
      adoption_date:         nullable(input.adoption_date),
      adoption_source:       nullable(input.adoption_source),
      adoption_source_type:  input.adoption_source_type || null,
      adoption_notes:        nullable(input.adoption_notes),
      death_date:            nullable(input.death_date),
      death_place:           nullable(input.death_place),
      death_cause:           nullable(input.death_cause),
      memorial_note:         nullable(input.memorial_note),
      favorite_thing:        nullable(input.favorite_thing),
      photo_url:             nullable(input.photo_url),
      bio:                   nullable(input.bio),
      updated_at:            new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updatePet] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/mascota/${id}`);

  return { success: true, id };
}

// ============================================================================
// deletePet — elimina una mascota
// ============================================================================

export async function deletePet(id: string): Promise<ActionResult> {
  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deletePet] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id };
}