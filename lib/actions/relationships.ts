  "use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type {
  Relationship,
  RelationshipType,
  ParentSubtype,
  SpouseSubtype,
  SiblingSubtype,
} from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

export type CreateRelationshipInput = {
  person_a_id: string;
  person_b_id: string;
  type: RelationshipType;
  parent_subtype: ParentSubtype | "";
  spouse_subtype: SpouseSubtype | "";
  sibling_subtype: SiblingSubtype | "";
  start_date: string;
  end_date: string;
  notes: string;
};

export type RelationshipWithPersons = Relationship & {
  person_a: { id: string; given_name: string; paternal_surname: string | null; nickname: string | null };
  person_b: { id: string; given_name: string; paternal_surname: string | null; nickname: string | null };
};

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

// ============================================================================
// createRelationship
// ============================================================================

export async function createRelationship(
  input: CreateRelationshipInput
): Promise<ActionResult> {
  if (!input.person_a_id || !input.person_b_id) {
    return { success: false, error: "Debes seleccionar dos personas." };
  }

  if (input.person_a_id === input.person_b_id) {
    return { success: false, error: "No puedes vincular a una persona consigo misma." };
  }

  if (input.type === "parent_of" && !input.parent_subtype) {
    return { success: false, error: "Selecciona el tipo de parentesco." };
  }

  if (input.type === "spouse_of" && !input.spouse_subtype) {
    return { success: false, error: "Selecciona el tipo de vínculo conyugal." };
  }

  if (input.type === "sibling_of" && !input.sibling_subtype) {
    return { success: false, error: "Selecciona el tipo de hermandad." };
  }

  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  const { data, error } = await supabase
    .from("relationships")
    .insert({
      person_a_id:     input.person_a_id,
      person_b_id:     input.person_b_id,
      type:            input.type,
      parent_subtype:  input.type === "parent_of"  ? input.parent_subtype  || null : null,
      spouse_subtype:  input.type === "spouse_of"  ? input.spouse_subtype  || null : null,
      sibling_subtype: input.type === "sibling_of" ? input.sibling_subtype || null : null,
      start_date:      nullable(input.start_date),
      end_date:        nullable(input.end_date),
      notes:           nullable(input.notes),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createRelationship] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id: data.id };
}

// ============================================================================
// getRelationships — fetch all with person names
// ============================================================================

export async function getRelationships(): Promise<RelationshipWithPersons[]> {
  const { data, error } = await supabase
    .from("relationships")
    .select(`
      *,
      person_a:persons!relationships_person_a_id_fkey(id, given_name, paternal_surname, nickname),
      person_b:persons!relationships_person_b_id_fkey(id, given_name, paternal_surname, nickname)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getRelationships] Supabase error:", error);
    return [];
  }

  return data as RelationshipWithPersons[];
}

// ============================================================================
// getInferredSiblings — encuentra hermanos por padres compartidos
// Dos personas son hermanos inferidos si comparten al menos un padre (person_a_id)
// en relaciones de tipo parent_of
// ============================================================================

export type InferredSiblingPair = {
  person_a_id: string;
  person_b_id: string;
  shared_parent_ids: string[];
};

export async function getInferredSiblings(): Promise<InferredSiblingPair[]> {
  // Traer todas las relaciones parent_of
  const { data, error } = await supabase
    .from("relationships")
    .select("person_a_id, person_b_id")
    .eq("type", "parent_of");

  if (error || !data) return [];

  // Agrupar hijos por padre: { parent_id: [child_id, child_id, ...] }
  const childrenByParent: Record<string, string[]> = {};
  for (const rel of data) {
    if (!childrenByParent[rel.person_a_id]) {
      childrenByParent[rel.person_a_id] = [];
    }
    childrenByParent[rel.person_a_id].push(rel.person_b_id);
  }

  // Encontrar pares de hijos que comparten padre
  const siblingMap: Record<string, Set<string>> = {};

  for (const [parentId, children] of Object.entries(childrenByParent)) {
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const a = children[i];
        const b = children[j];
        const key = [a, b].sort().join("|");

        if (!siblingMap[key]) {
          siblingMap[key] = new Set();
        }
        siblingMap[key].add(parentId);
      }
    }
  }

  // Convertir a array de pares
  return Object.entries(siblingMap).map(([key, parentIds]) => {
    const [person_a_id, person_b_id] = key.split("|");
    return {
      person_a_id,
      person_b_id,
      shared_parent_ids: Array.from(parentIds),
    };
  });
}

// ============================================================================
// deleteRelationship
// ============================================================================

export async function deleteRelationship(id: string): Promise<ActionResult> {
  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteRelationship] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id };
}

// ============================================================================
// getRelationshipsForPerson — todas las relaciones donde participa una persona
// ============================================================================

export async function getRelationshipsForPerson(
  personId: string
): Promise<RelationshipWithPersons[]> {
  const { data, error } = await supabase
    .from("relationships")
    .select(`
      *,
      person_a:persons!relationships_person_a_id_fkey(id, given_name, paternal_surname, nickname),
      person_b:persons!relationships_person_b_id_fkey(id, given_name, paternal_surname, nickname)
    `)
    .or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getRelationshipsForPerson] Supabase error:", error);
    return [];
  }

  return data as RelationshipWithPersons[];
}

// ============================================================================
// createSiblingGroup — vincula 3+ personas como hermanos entre sí
// Genera automáticamente todos los pares únicos (combinaciones sin repetición)
// ============================================================================

export type CreateSiblingGroupInput = {
  person_ids: string[];
  sibling_subtype: SiblingSubtype | "";
  start_date: string;
  end_date: string;
  notes: string;
};

export async function createSiblingGroup(
  input: CreateSiblingGroupInput
): Promise<ActionResult> {
  const ids = Array.from(new Set(input.person_ids.filter(Boolean)));

  if (ids.length < 2) {
    return { success: false, error: "Selecciona al menos dos hermanos." };
  }

  if (!input.sibling_subtype) {
    return { success: false, error: "Selecciona el tipo de hermandad." };
  }

  const nullable = (val: string): string | null =>
    val.trim() === "" ? null : val.trim();

  const rows: {
    person_a_id: string;
    person_b_id: string;
    type: "sibling_of";
    parent_subtype: null;
    spouse_subtype: null;
    sibling_subtype: SiblingSubtype;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  }[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      rows.push({
        person_a_id: ids[i],
        person_b_id: ids[j],
        type: "sibling_of",
        parent_subtype: null,
        spouse_subtype: null,
        sibling_subtype: input.sibling_subtype,
        start_date: nullable(input.start_date),
        end_date: nullable(input.end_date),
        notes: nullable(input.notes),
      });
    }
  }

  const { error } = await supabase.from("relationships").insert(rows);

  if (error) {
    console.error("[createSiblingGroup] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id: ids[0] };
}

// ============================================================================
// deleteRelationshipGroup — elimina varios vínculos a la vez (ej. grupo de hermanos)
// ============================================================================

export async function deleteRelationshipGroup(ids: string[]): Promise<ActionResult> {
  if (ids.length === 0) {
    return { success: false, error: "No hay vínculos para eliminar." };
  }

  const { error } = await supabase
    .from("relationships")
    .delete()
    .in("id", ids);

  if (error) {
    console.error("[deleteRelationshipGroup] Supabase error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true, id: ids[0] };
}