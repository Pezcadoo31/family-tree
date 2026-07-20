import type { Person, Pet } from "@/lib/types";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";
import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import type { FamilyGroup } from "@/lib/family/detectFamilyGroups";
import { layoutFamilyCluster } from "@/lib/family/layoutFamilyCluster";

// ============================================================================
// TYPES
// ============================================================================

export type TreeNodeData = {
  id: string;
  type: "person" | "pet" | "group" | "cluster";
  person?: Person;
  pet?: Pet;
  group?: FamilyGroup;
  generation: number;
  width?: number;
  height?: number;
};

export type TreeEdgeData = {
  id: string;
  source: string;
  target: string;
  kind: "parent_of" | "spouse_of" | "sibling_of" | "pet_relationship";
  parentSubtype?: "biological" | "adoptive" | "step" | "foster";
};

export type TreeLayout = {
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number };
    parentId?: string;
    extent?: "parent";
    style?: { width: number; height: number };
    data: TreeNodeData;
  }[];
  edges: { id: string; source: string; target: string; data: TreeEdgeData }[];
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

const COLUMN_WIDTH = 280;
const ROW_HEIGHT = 140;
const COLUMN_GUTTER = 40; // extra breathing room reserved after a wide cluster

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
  // 1) Generation (column index) for each person, via BFS from roots
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
  // Couples and siblings must sit in the SAME column. If both already have
  // a generation but they differ (e.g. one has confirmed parents and the
  // other doesn't), snap both to the deeper one — not just fill in the
  // missing side — so a spouse without registered parents doesn't get
  // stranded in the wrong column next to unrelated people.
  for (const rel of spouseOf) {
    const genA = generation.get(rel.person_a_id);
    const genB = generation.get(rel.person_b_id);
    if (genA === undefined && genB === undefined) continue;
    const shared = Math.max(genA ?? 0, genB ?? 0);
    generation.set(rel.person_a_id, shared);
    generation.set(rel.person_b_id, shared);
  }

  for (const rel of siblingOf) {
    const genA = generation.get(rel.person_a_id);
    const genB = generation.get(rel.person_b_id);
    if (genA === undefined && genB === undefined) continue;
    const shared = Math.max(genA ?? 0, genB ?? 0);
    generation.set(rel.person_a_id, shared);
    generation.set(rel.person_b_id, shared);
  }

  // --------------------------------------------------------------
  // 2) Map each person to the ONE family group they physically render
  //    inside on THIS render (depends on collapsedGroupKeys, so it's
  //    recomputed every time a group is toggled). A person is often a
  //    CHILD in their family-of-origin group AND a PARENT in their own
  //    group (e.g. a daughter who is also a mother). React Flow needs a
  //    globally unique node id, so she can only live in ONE container
  //    at a time. Rule, in priority order:
  //      1. If exactly one of her groups is expanded → render her there.
  //      2. If BOTH are expanded → the group where she's a PARENT wins
  //         (her own family), not the one where she's a child — so
  //         expanding "her" family pulls her out of her family-of-origin
  //         box, leaving just the connecting edge behind.
  //      3. If NEITHER is expanded → doesn't affect individual rendering
  //         (nobody's expanded), but still needed to route edges to the
  //         right collapsed pill — defaults to her child role for
  //         stability.
  //    Pets don't have this ambiguity — detectFamilyGroups already
  //    assigns each pet to exactly one group.
  // --------------------------------------------------------------
  const personRoles = new Map<string, { key: string; role: "parent" | "child" }[]>();
  for (const g of familyGroups) {
    for (const c of g.children) {
      const list = personRoles.get(c.id) ?? [];
      list.push({ key: g.key, role: "child" });
      personRoles.set(c.id, list);
    }
    for (const p of g.parents) {
      const list = personRoles.get(p.id) ?? [];
      list.push({ key: g.key, role: "parent" });
      personRoles.set(p.id, list);
    }
  }

  const personToGroupKey = new Map<string, string>();
  for (const [personId, roles] of personRoles.entries()) {
    const expandedRoles = roles.filter((r) => !collapsedGroupKeys.has(r.key));
    const chosen =
      expandedRoles.length > 0
        ? expandedRoles.find((r) => r.role === "parent") ?? expandedRoles[0]
        : roles.find((r) => r.role === "child") ?? roles[0];
    if (chosen) personToGroupKey.set(personId, chosen.key);
  }

  const petToGroupKey = new Map<string, string>();
  for (const g of familyGroups) {
    for (const pet of g.pets) petToGroupKey.set(pet.id, g.key);
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
  // 3) Pet generation (owner's generation + 1) — needed both for loose
  //    pets and to know the overall column range before computing widths
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

  // --------------------------------------------------------------
  // 4) Anchor generation + cluster layout for every family group.
  //    A group's anchor column is where it sits in the OUTER grid —
  //    an expanded group still renders as ONE self-contained block
  //    there (like the collapsed pill does today), just wider/taller,
  //    with its members positioned RELATIVE to it. This avoids the 2D
  //    packing problem of trying to align cluster columns with the
  //    global generation grid.
  // --------------------------------------------------------------
  const clusterLayouts = new Map<string, ReturnType<typeof layoutFamilyCluster>>();
  const anchorGenByGroupKey = new Map<string, number>();

  for (const g of familyGroups) {
    const members = [...g.parents, ...g.children];
    const gens = members.map((m) => generation.get(m.id) ?? 0);
    const anchorGen = g.parents.length > 0
      ? Math.min(...g.parents.map((p) => generation.get(p.id) ?? 0))
      : Math.min(...gens, 0);
    anchorGenByGroupKey.set(g.key, anchorGen);

    if (!collapsedGroupKeys.has(g.key)) {
      const renderableGroup: FamilyGroup = {
        ...g,
        parents: g.parents.filter((p) => personToGroupKey.get(p.id) === g.key),
        children: g.children.filter((c) => personToGroupKey.get(c.id) === g.key),
      };
      clusterLayouts.set(g.key, layoutFamilyCluster(renderableGroup, petRelationships));
    }
  }

  // --------------------------------------------------------------
  // 5) Column width: default COLUMN_WIDTH, widened for any column that
  //    anchors an expanded cluster wider than that.
  // --------------------------------------------------------------
  const columnRequiredWidth = new Map<number, number>();
  for (const [key, anchorGen] of anchorGenByGroupKey.entries()) {
    const cluster = clusterLayouts.get(key);
    if (!cluster) continue;
    const needed = cluster.width + COLUMN_GUTTER;
    columnRequiredWidth.set(anchorGen, Math.max(columnRequiredWidth.get(anchorGen) ?? COLUMN_WIDTH, needed));
  }

  const maxGen = Math.max(
    maxHumanGeneration,
    ...Array.from(petGeneration.values()),
    ...Array.from(anchorGenByGroupKey.values(), (g) => g)
  );

  const colX = new Map<number, number>();
  let cursor = 0;
  for (let g = 0; g <= maxGen; g++) {
    colX.set(g, cursor);
    cursor += columnRequiredWidth.get(g) ?? COLUMN_WIDTH;
  }

  // --------------------------------------------------------------
  // 6) Person nodes — skip anyone who belongs to ANY family group
  //    (collapsed → represented by the pill; expanded → represented
  //    inside its cluster container instead)
  // --------------------------------------------------------------
  const byGeneration = new Map<number, unknown[]>();
  for (const p of persons) {
    if (personToGroupKey.has(p.id)) continue;
    const gen = generation.get(p.id) ?? 0;
    const list = byGeneration.get(gen) ?? [];
    list.push(p);
    byGeneration.set(gen, list);
  }

  const nodes: TreeLayout["nodes"] = [];

  for (const [gen, list] of byGeneration.entries()) {
    list.forEach((p, index) => {
      const person = p as Person;
      nodes.push({
        id: person.id,
        type: "personNode",
        position: { x: colX.get(gen) ?? gen * COLUMN_WIDTH, y: index * ROW_HEIGHT },
        data: { id: person.id, type: "person", person, generation: gen },
      });
    });
  }

  // --------------------------------------------------------------
  // 7) One node per family group — a compact pill if collapsed, or a
  //    full container with nested person/pet nodes if expanded.
  // --------------------------------------------------------------
  for (const g of familyGroups) {
    const anchorGen = anchorGenByGroupKey.get(g.key) ?? 0;
    const list = byGeneration.get(anchorGen) ?? [];
    const index = list.length;
    const x = colX.get(anchorGen) ?? anchorGen * COLUMN_WIDTH;

    if (collapsedGroupKeys.has(g.key)) {
      byGeneration.set(anchorGen, [...list, {}]); // reserve 1 row slot
      nodes.push({
        id: `group-${g.key}`,
        type: "familyGroupNode",
        position: { x, y: index * ROW_HEIGHT },
        data: { id: g.key, type: "group", group: g, generation: anchorGen },
      });
      continue;
    }

    const cluster = clusterLayouts.get(g.key);
    if (!cluster) continue;

    const slotsUsed = Math.max(1, Math.ceil(cluster.height / ROW_HEIGHT));
    byGeneration.set(anchorGen, [...list, ...Array(slotsUsed).fill({})]); // reserve N row slots

    const containerId = `cluster-${g.key}`;
    nodes.push({
      id: containerId,
      type: "familyContainerNode",
      position: { x, y: index * ROW_HEIGHT },
      style: { width: cluster.width, height: cluster.height },
      data: { id: g.key, type: "cluster", group: g, generation: anchorGen, width: cluster.width, height: cluster.height },
    });

    const personById = new Map([...g.parents, ...g.children].map((p) => [p.id, p]));
    const petById = new Map(g.pets.map((p) => [p.id, p]));

    for (const member of cluster.members) {
      if (member.kind === "person") {
        const person = personById.get(member.id);
        if (!person) continue;
        nodes.push({
          id: person.id,
          type: "personNode",
          position: member.localPosition,
          parentId: containerId,
          extent: "parent",
          data: { id: person.id, type: "person", person, generation: generation.get(person.id) ?? anchorGen },
        });
      } else {
        const petId = member.id.replace(/^pet-/, "");
        const pet = petById.get(petId);
        if (!pet) continue;
        nodes.push({
          id: `pet-${pet.id}`,
          type: "petNode",
          position: member.localPosition,
          parentId: containerId,
          extent: "parent",
          data: { id: pet.id, type: "pet", pet, generation: anchorGen },
        });
      }
    }
  }

  // --------------------------------------------------------------
  // 8) Loose pet nodes — skip pets already represented inside a group
  //    (collapsed pill or expanded cluster)
  // --------------------------------------------------------------
  const petsByGeneration = new Map<number, Pet[]>();
  for (const pet of pets) {
    if (petToGroupKey.has(pet.id)) continue;
    const gen = petGeneration.get(pet.id) ?? maxHumanGeneration + 1;
    const list = petsByGeneration.get(gen) ?? [];
    list.push(pet);
    petsByGeneration.set(gen, list);
  }

  for (const [gen, list] of petsByGeneration.entries()) {
    // Continue the row count from wherever persons/groups already left off
    // in this same column, instead of restarting at 0 and colliding.
    const baseOffset = byGeneration.get(gen)?.length ?? 0;
    const x = colX.get(gen) ?? gen * COLUMN_WIDTH;
    list.forEach((pet, index) => {
      nodes.push({
        id: `pet-${pet.id}`,
        type: "petNode",
        position: { x, y: (baseOffset + index) * ROW_HEIGHT },
        data: { id: pet.id, type: "pet", pet, generation: gen },
      });
    });
  }

  // --------------------------------------------------------------
  // 9) Center each column vertically relative to the tallest column.
  //    Only applies to TOP-LEVEL nodes (no parentId) — nested cluster
  //    members are positioned relative to their container and must be
  //    left untouched.
  // --------------------------------------------------------------
  const nodesByColumn = new Map<number, typeof nodes>();
  for (const n of nodes) {
    if (n.parentId) continue;
    const list = nodesByColumn.get(n.position.x) ?? [];
    list.push(n);
    nodesByColumn.set(n.position.x, list);
  }

  const maxColumnCount = Math.max(0, ...Array.from(nodesByColumn.values()).map((l) => l.length));

  for (const list of nodesByColumn.values()) {
    const offset = ((maxColumnCount - list.length) * ROW_HEIGHT) / 2;
    for (const n of list) {
      n.position.y += offset;
    }
  }

  // --------------------------------------------------------------
  // 10) Edges — redirected to the group node id when an endpoint is
  //     collapsed; dropped entirely when both endpoints resolve to
  //     the same collapsed group (fully internal connection). Nested
  //     nodes keep their real id, so edges to/from them work exactly
  //     as before — React Flow resolves absolute position internally.
  //     For sibling_of / spouse_of (same column, stacked vertically,
  //     fixed bottom→top handles), reorder source/target so source
  //     is always the node positioned above, keeping the connector
  //     a clean vertical line downward.
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
      data: {
        id: rel.id,
        source,
        target,
        kind: rel.type,
        parentSubtype: rel.type === "parent_of" ? (rel.parent_subtype ?? undefined) : undefined,
      },
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
