import type { Person, Pet } from "@/lib/types";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";
import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import type { FamilyGroup } from "@/lib/family/detectFamilyGroups";

// ============================================================================
// TYPES
// ============================================================================

export type TreeNodeData = {
  id: string;
  type: "person" | "pet" | "group";
  person?: Person;
  pet?: Pet;
  group?: FamilyGroup;
  generation: number;
};

export type TreeEdgeData = {
  id: string;
  source: string;
  target: string;
  kind: "parent_of" | "spouse_of" | "sibling_of" | "pet_relationship";
};

export type TreeLayout = {
  nodes: { id: string; type: string; position: { x: number; y: number }; data: TreeNodeData }[];
  edges: { id: string; source: string; target: string; data: TreeEdgeData }[];
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

const COLUMN_WIDTH = 280;
const ROW_HEIGHT = 140;

// ============================================================================
// buildTreeLayout
// ============================================================================

export function buildTreeLayout(
  persons: Person[],
  pets: Pet[],
  relationships: RelationshipWithPersons[],
  petRelationships: PetRelationshipWithRefs[] = [],
  familyGroups: FamilyGroup[] = [],
  collapsedGroupKeys: Set<string> = new Set(),
  onExpandGroup: (key: string) => void = () => {}
): TreeLayout {
  const parentOf = relationships.filter((r) => r.type === "parent_of");
  const spouseOf = relationships.filter((r) => r.type === "spouse_of");
  const siblingOf = relationships.filter((r) => r.type === "sibling_of");

  // --------------------------------------------------------------
  // 1) Generation (column) for each person, via BFS from roots
  // --------------------------------------------------------------
  const childIds = new Set(parentOf.map((r) => r.person_b_id));
  const roots = persons.filter((p) => !childIds.has(p.id));

  const generation = new Map<string, number>();
  const queue: { id: string; gen: number }[] = roots.map((r) => ({ id: r.id, gen: 0 }));
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

  for (const p of persons) {
    if (!generation.has(p.id)) generation.set(p.id, 0);
  }
  for (const rel of spouseOf) {
    const genA = generation.get(rel.person_a_id);
    const genB = generation.get(rel.person_b_id);
    if (genA !== undefined && genB === undefined) generation.set(rel.person_b_id, genA);
    if (genB !== undefined && genA === undefined) generation.set(rel.person_a_id, genB);
  }
  for (const rel of siblingOf) {
    const genA = generation.get(rel.person_a_id);
    const genB = generation.get(rel.person_b_id);
    if (genA !== undefined && genB === undefined) generation.set(rel.person_b_id, genA);
    if (genB !== undefined && genA === undefined) generation.set(rel.person_a_id, genB);
  }

  // --------------------------------------------------------------
  // 2) Map each person/pet to the family group they belong to (if any)
  // --------------------------------------------------------------
  const personToGroupKey = new Map<string, string>();
  const petToGroupKey = new Map<string, string>();
  for (const g of familyGroups) {
    for (const p of [...g.parents, ...g.children]) personToGroupKey.set(p.id, g.key);
    for (const pet of g.pets) petToGroupKey.set(pet.id, g.key);
  }

  function isPersonCollapsed(personId: string): boolean {
    const key = personToGroupKey.get(personId);
    return !!key && collapsedGroupKeys.has(key);
  }
  function isPetCollapsed(petId: string): boolean {
    const key = petToGroupKey.get(petId);
    return !!key && collapsedGroupKeys.has(key);
  }
  function resolvePersonNodeId(personId: string): string {
    const key = personToGroupKey.get(personId);
    if (key && collapsedGroupKeys.has(key)) return `group-${key}`;
    return personId;
  }
  function resolvePetNodeId(petId: string): string {
    const key = petToGroupKey.get(petId);
    if (key && collapsedGroupKeys.has(key)) return `group-${key}`;
    return `pet-${petId}`;
  }

  // --------------------------------------------------------------
  // 3) Person nodes — skip individuals whose group is collapsed
  // --------------------------------------------------------------
  const byGeneration = new Map<number, Person[]>();
  for (const p of persons) {
    if (isPersonCollapsed(p.id)) continue;
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
  // 4) One compact node per collapsed group, placed at its parents'
  //    generation (falls back to the min generation among members)
  // --------------------------------------------------------------
  const renderedGroupKeys = new Set<string>();

  for (const g of familyGroups) {
    if (!collapsedGroupKeys.has(g.key) || renderedGroupKeys.has(g.key)) continue;
    renderedGroupKeys.add(g.key);

    const members = [...g.parents, ...g.children];
    const gens = members.map((m) => generation.get(m.id) ?? 0);
    const anchorGen = g.parents.length > 0
      ? Math.min(...g.parents.map((p) => generation.get(p.id) ?? 0))
      : Math.min(...gens, 0);

    const list = byGeneration.get(anchorGen) ?? [];
    const index = list.length; // append after any loose persons already in this column
    byGeneration.set(anchorGen, [...list, {} as Person]); // reserve the row slot

    nodes.push({
      id: `group-${g.key}`,
      type: "familyGroupNode",
      position: { x: anchorGen * COLUMN_WIDTH, y: index * ROW_HEIGHT },
      data: { id: g.key, type: "group", group: g, generation: anchorGen },
    });
  }

  // --------------------------------------------------------------
  // 5) Pet nodes — skip pets whose group is collapsed (already
  //    represented inside the group node)
  // --------------------------------------------------------------
  const maxHumanGeneration = Math.max(0, ...Array.from(generation.values()));
  const petGeneration = new Map<string, number>();

  for (const petRel of petRelationships) {
    if (!petRel.person) continue;
    const ownerGen = generation.get(petRel.person_id);
    if (ownerGen !== undefined) {
      const targetGen = ownerGen + 1;
      const existing = petGeneration.get(petRel.pet_id);
      if (existing === undefined || targetGen > existing) {
        petGeneration.set(petRel.pet_id, targetGen);
      }
    }
  }
  for (const pet of pets) {
    if (!petGeneration.has(pet.id)) petGeneration.set(pet.id, maxHumanGeneration + 1);
  }

  const petsByGeneration = new Map<number, Pet[]>();
  for (const pet of pets) {
    if (isPetCollapsed(pet.id)) continue;
    const gen = petGeneration.get(pet.id) ?? maxHumanGeneration + 1;
    const list = petsByGeneration.get(gen) ?? [];
    list.push(pet);
    petsByGeneration.set(gen, list);
  }

  for (const [gen, list] of petsByGeneration.entries()) {
    list.forEach((pet, index) => {
      nodes.push({
        id: `pet-${pet.id}`,
        type: "petNode",
        position: { x: gen * COLUMN_WIDTH, y: index * ROW_HEIGHT },
        data: { id: pet.id, type: "pet", pet, generation: gen },
      });
    });
  }

  // --------------------------------------------------------------
  // 6) Edges — redirected to the group node id when an endpoint is
  //    collapsed; dropped entirely when both endpoints resolve to
  //    the same collapsed group (fully internal connection).
  //    For sibling_of / spouse_of (same column, stacked vertically,
  //    fixed bottom→top handles), reorder source/target so source
  //    is always the node positioned above, keeping the connector
  //    a clean vertical line downward.
  // --------------------------------------------------------------
  const yById = new Map<string, number>();
  for (const n of nodes) {
    if (n.type === "personNode" || n.type === "familyGroupNode") yById.set(n.id, n.position.y);
  }

  const edges: TreeLayout["edges"] = [];

  for (const rel of relationships) {
    let source = resolvePersonNodeId(rel.person_a_id);
    let target = resolvePersonNodeId(rel.person_b_id);
    if (source === target) continue;

    if (rel.type !== "parent_of") {
      const yA = yById.get(source) ?? 0;
      const yB = yById.get(target) ?? 0;
      if (yB < yA) {
        [source, target] = [target, source];
      }
    }

    edges.push({
      id: rel.id,
      source,
      target,
      data: { id: rel.id, source, target, kind: rel.type },
    });
  }

  for (const petRel of petRelationships) {
    if (!petRel.person) continue;
    const source = resolvePersonNodeId(petRel.person_id);
    const target = resolvePetNodeId(petRel.pet_id);
    if (source === target) continue;
    edges.push({
      id: petRel.id,
      source,
      target,
      data: { id: petRel.id, source, target, kind: "pet_relationship" },
    });
  }

  return { nodes, edges };
}
