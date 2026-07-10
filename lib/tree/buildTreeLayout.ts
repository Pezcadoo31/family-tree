import type { Person, Pet } from "@/lib/types";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";

// ============================================================================
// TYPES
// ============================================================================

export type TreeNodeData = {
  id: string;
  type: "person" | "pet";
  person?: Person;
  pet?: Pet;
  generation: number;
};

export type TreeEdgeData = {
  id: string;
  source: string;
  target: string;
  kind: "parent_of" | "spouse_of" | "sibling_of";
};

export type TreeLayout = {
  nodes: { id: string; type: string; position: { x: number; y: number }; data: TreeNodeData }[];
  edges: { id: string; source: string; target: string; type?: string; data: TreeEdgeData }[];
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

const COLUMN_WIDTH = 280;   // horizontal spacing between generations
const ROW_HEIGHT = 140;     // vertical spacing between siblings in the same column
const PET_COLUMN_OFFSET = 1; // pets sit one column past the last human generation

// ============================================================================
// buildTreeLayout — computes generations (columns) and row positions
// ============================================================================

export function buildTreeLayout(
  persons: Person[],
  pets: Pet[],
  relationships: RelationshipWithPersons[]
): TreeLayout {
  const parentOf = relationships.filter((r) => r.type === "parent_of");
  const spouseOf = relationships.filter((r) => r.type === "spouse_of");
  const siblingOf = relationships.filter((r) => r.type === "sibling_of");

  // --------------------------------------------------------------
  // 1) Determine generation (column) for each person via BFS from roots
  //    Roots = persons who never appear as a child (person_b) in parent_of
  // --------------------------------------------------------------
  const childIds = new Set(parentOf.map((r) => r.person_b_id));
  const roots = persons.filter((p) => !childIds.has(p.id));

  const generation = new Map<string, number>();
  const queue: { id: string; gen: number }[] = roots.map((r) => ({ id: r.id, gen: 0 }));

  // Seed roots
  for (const r of roots) generation.set(r.id, 0);

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    const children = parentOf.filter((r) => r.person_a_id === id).map((r) => r.person_b_id);
    for (const childId of children) {
      const existing = generation.get(childId);
      const nextGen = gen + 1;
      if (existing === undefined || nextGen > existing) {
        generation.set(childId, nextGen);
        queue.push({ id: childId, gen: nextGen });
      }
    }
  }

  // Anyone never touched (isolated person, no relationships) goes to generation 0
  for (const p of persons) {
    if (!generation.has(p.id)) generation.set(p.id, 0);
  }

  // Spouses share the generation of their partner (whichever is already placed)
  for (const rel of spouseOf) {
    const genA = generation.get(rel.person_a_id);
    const genB = generation.get(rel.person_b_id);
    if (genA !== undefined && genB === undefined) generation.set(rel.person_b_id, genA);
    if (genB !== undefined && genA === undefined) generation.set(rel.person_a_id, genB);
  }

  // Siblings share generation too, in case one wasn't linked via parent_of
  for (const rel of siblingOf) {
    const genA = generation.get(rel.person_a_id);
    const genB = generation.get(rel.person_b_id);
    if (genA !== undefined && genB === undefined) generation.set(rel.person_b_id, genA);
    if (genB !== undefined && genA === undefined) generation.set(rel.person_a_id, genB);
  }

  // --------------------------------------------------------------
  // 2) Group persons by generation, assign row index within each column
  // --------------------------------------------------------------
  const maxGeneration = Math.max(0, ...Array.from(generation.values()));
  const byGeneration = new Map<number, Person[]>();

  for (const p of persons) {
    const gen = generation.get(p.id) ?? 0;
    const list = byGeneration.get(gen) ?? [];
    list.push(p);
    byGeneration.set(gen, list);
  }

  const nodes: TreeLayout["nodes"] = [];

  for (const [gen, list] of byGeneration.entries()) {
    list.forEach((p, index) => {
      nodes.push({
        id: p.id,
        type: "personNode",
        position: { x: gen * COLUMN_WIDTH, y: index * ROW_HEIGHT },
        data: { id: p.id, type: "person", person: p, generation: gen },
      });
    });
  }

  // --------------------------------------------------------------
  // 3) Pets — placed in their own column past the last human generation,
  //    stacked vertically. No specific owner link exists yet.
  // --------------------------------------------------------------
  const petColumn = maxGeneration + PET_COLUMN_OFFSET;
  pets.forEach((pet, index) => {
    nodes.push({
      id: `pet-${pet.id}`,
      type: "petNode",
      position: { x: petColumn * COLUMN_WIDTH, y: index * ROW_HEIGHT },
      data: { id: pet.id, type: "pet", pet, generation: petColumn },
    });
  });

  // --------------------------------------------------------------
  // 4) Edges — one per relationship, styled by kind
  //    For sibling_of / spouse_of (same column, stacked vertically),
  //    reorder source/target so source = the node positioned above,
  //    ensuring the connector draws a clean vertical line downward.
  // --------------------------------------------------------------
  const yById = new Map<string, number>();
  for (const n of nodes) {
    if (n.type === "personNode") yById.set(n.id, n.position.y);
  }

  const edges: TreeLayout["edges"] = relationships.map((rel) => {
    let source = rel.person_a_id;
    let target = rel.person_b_id;

    if (rel.type !== "parent_of") {
      const yA = yById.get(rel.person_a_id) ?? 0;
      const yB = yById.get(rel.person_b_id) ?? 0;
      if (yB < yA) {
        source = rel.person_b_id;
        target = rel.person_a_id;
      }
    }

    return {
      id: rel.id,
      source,
      target,
      data: { id: rel.id, source, target, kind: rel.type },
    };
  });

  return { nodes, edges };
}
