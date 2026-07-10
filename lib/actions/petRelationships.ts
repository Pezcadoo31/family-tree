"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { PetPersonRelationship } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

export type CreatePetRelationshipInput = {
  pet_id: string;
  person_id: string;
  relationship: PetPersonRelationship;
  start_date: string;
  end_date: string;
  notes: string;
};

export type PetRelationshipWithRefs = {
  id: string;
  pet_id: string;
  person_id: string;
  relationship: PetPersonRelationship;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pet: { id: string; name: string; nickname: string | null; species: string } | null;
  person: { id: string; given_name: string; paternal_surname: string | null; nickname: string | null } | null;
};

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

// ============================================================================
// createPetRelationship
// ============================================================================

export async function createPetRelationship(
  input: CreatePetRelationshipInput
): Promise<ActionResult> {
  if (!input.pet_id || !input.person_id) {
    return { success: false, error: "Selecciona la mascota y la persona." };
  }

  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  const { data, error } = await supabase
    .from("pet_relationships")
    .insert({
      pet_id: input.pet_id,
      person_id: input.person_id,
      relationship: input.relationship,
      start_date: nullable(input.start_date),
      end_date: nullable(input.end_date),
      notes: nullable(input.notes),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createPetRelationship] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/arbol");
  revalidatePath(`/persona/${input.person_id}`);
  revalidatePath(`/mascota/${input.pet_id}`);

  return { success: true, id: data.id };
}

// ============================================================================
// getPetRelationshipsForPet
// ============================================================================

export async function getPetRelationshipsForPet(
  petId: string
): Promise<PetRelationshipWithRefs[]> {
  const { data, error } = await supabase
    .from("pet_relationships")
    .select(`
      *,
      pet:pets(id, name, nickname, species),
      person:persons(id, given_name, paternal_surname, nickname)
    `)
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPetRelationshipsForPet] Supabase error:", error);
    return [];
  }

  return data as PetRelationshipWithRefs[];
}

// ============================================================================
// getPetRelationshipsForPerson
// ============================================================================

export async function getPetRelationshipsForPerson(
  personId: string
): Promise<PetRelationshipWithRefs[]> {
  const { data, error } = await supabase
    .from("pet_relationships")
    .select(`
      *,
      pet:pets(id, name, nickname, species),
      person:persons(id, given_name, paternal_surname, nickname)
    `)
    .eq("person_id", personId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPetRelationshipsForPerson] Supabase error:", error);
    return [];
  }

  return data as PetRelationshipWithRefs[];
}

// ============================================================================
// getAllPetRelationships — used for the tree
// ============================================================================

export async function getAllPetRelationships(): Promise<PetRelationshipWithRefs[]> {
  const { data, error } = await supabase
    .from("pet_relationships")
    .select(`
      *,
      pet:pets(id, name, nickname, species),
      person:persons(id, given_name, paternal_surname, nickname)
    `);

  if (error) {
    console.error("[getAllPetRelationships] Supabase error:", error);
    return [];
  }

  return data as PetRelationshipWithRefs[];
}

// ============================================================================
// deletePetRelationship
// ============================================================================

export async function deletePetRelationship(id: string): Promise<ActionResult> {
  const { error } = await supabase
    .from("pet_relationships")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deletePetRelationship] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/arbol");
  return { success: true, id };
}
