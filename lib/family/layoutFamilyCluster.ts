import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import type { FamilyGroup } from "./detectFamilyGroups";

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================
// Deliberately smaller than the outer tree's COLUMN_WIDTH/ROW_HEIGHT — a
// cluster is a compact, self-contained block, not another generation of
// the main grid.

const NODE_WIDTH = 200;
const CLUSTER_COLUMN_WIDTH = 240;
const CLUSTER_ROW_HEIGHT = 76;
const HEADER_HEIGHT = 44; // space reserved for the "🏠 Familia X" label + collapse button
const PADDING = 24;

// ============================================================================
// TYPES
// ============================================================================

export type ClusterMember = {
  id: string; // person.id, or `pet-${pet.id}`
  kind: "person" | "pet";
  localPosition: { x: number; y: number };
};

export type ClusterLayout = {
  width: number;
  height: number;
  members: ClusterMember[];
};

// ============================================================================
// layoutFamilyCluster — local generation 0 = parents, 1 = children,
// pets slot into ownerLocalGen + 1 (so a parent's pet sits next to the
// children column, a child's pet sits one column further out).
// ============================================================================

export function layoutFamilyCluster(
  group: FamilyGroup,
  petRelationships: PetRelationshipWithRefs[]
): ClusterLayout {
  const ownerLocalGen = new Map<string, number>();
  for (const p of group.parents) ownerLocalGen.set(p.id, 0);
  for (const c of group.children) ownerLocalGen.set(c.id, 1);

  const byLocalGen = new Map<number, ClusterMember[]>();
  function push(id: string, kind: "person" | "pet", gen: number) {
    const list = byLocalGen.get(gen) ?? [];
    list.push({ id, kind, localPosition: { x: 0, y: 0 } });
    byLocalGen.set(gen, list);
  }

  for (const p of group.parents) push(p.id, "person", 0);
  for (const c of group.children) push(c.id, "person", 1);

  const memberPersonIds = new Set([...group.parents, ...group.children].map((m) => m.id));
  for (const pet of group.pets) {
    const petRel = petRelationships.find(
      (r) => r.pet_id === pet.id && r.person && memberPersonIds.has(r.person_id)
    );
    const ownerGen = petRel ? ownerLocalGen.get(petRel.person_id) : undefined;
    const gen = ownerGen !== undefined ? ownerGen + 1 : 1;
    push(`pet-${pet.id}`, "pet", gen);
  }

  const localGens = Array.from(byLocalGen.keys());
  const maxGen = localGens.length > 0 ? Math.max(...localGens) : 0;
  const maxRows = Math.max(1, ...Array.from(byLocalGen.values()).map((l) => l.length));

  const members: ClusterMember[] = [];
  for (const [gen, list] of byLocalGen.entries()) {
    // Vertically center columns with fewer members than the tallest column.
    const rowOffset = ((maxRows - list.length) * CLUSTER_ROW_HEIGHT) / 2;
    list.forEach((m, index) => {
      members.push({
        ...m,
        localPosition: {
          x: PADDING + gen * CLUSTER_COLUMN_WIDTH,
          y: HEADER_HEIGHT + PADDING + rowOffset + index * CLUSTER_ROW_HEIGHT,
        },
      });
    });
  }

  const width = PADDING * 2 + maxGen * CLUSTER_COLUMN_WIDTH + NODE_WIDTH;
  const height = HEADER_HEIGHT + PADDING * 2 + maxRows * CLUSTER_ROW_HEIGHT;

  return { width, height, members };
}
