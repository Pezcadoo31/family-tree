import type { Person, Pet } from "@/lib/types";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";
import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import { groupParentChildRelationships } from "@/lib/relationships/groupParentRelationships";

// ============================================================================
// TYPES
// ============================================================================

export type FamilyGroup = {
  key: string;
  name: string;
  parents: Person[];
  children: Person[];
  pets: Pet[];
};

export type FamilyGroupsResult = {
  groups: FamilyGroup[];
  groupedPersonIds: Set<string>;
  groupedPetIds: Set<string>;
};

// ============================================================================
// HELPERS
// ============================================================================

function mostCommonSurname(people: Person[]): string | null {
  const counts = new Map<string, number>();
  for (const p of people) {
    const s = p.paternal_surname?.trim();
    if (!s) continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [s, c] of counts) {
    if (c > bestCount) {
      best = s;
      bestCount = c;
    }
  }
  return best;
}

/** For a childless couple, prefer the husband's paternal surname
 *  (traditional convention) over an arbitrary tie-break. */
function preferredParentSurname(parents: Person[]): string | null {
  const husband = parents.find((p) => p.gender === "male" && p.paternal_surname);
  if (husband?.paternal_surname) return husband.paternal_surname;
  return mostCommonSurname(parents);
}

function buildGroupName(parents: Person[], children: Person[]): string {
  if (children.length > 0) {
    const surname = mostCommonSurname(children);
    if (surname) return `Familia ${surname}`;
  }
  const surname = preferredParentSurname(parents);
  if (surname) return `Familia ${surname}`;
  return parents.map((p) => p.given_name).join(" y ") || "Familia";
}

// ============================================================================
// detectFamilyGroups
// ============================================================================

export function detectFamilyGroups(
  persons: Person[],
  pets: Pet[],
  relationships: RelationshipWithPersons[],
  petRelationships: PetRelationshipWithRefs[]
): FamilyGroupsResult {
  const personById = new Map(persons.map((p) => [p.id, p]));
  const groups: FamilyGroup[] = [];
  const registeredParentKeys = new Set<string>();

  // --------------------------------------------------------------
  // 1) One group per exact parent-set that already has children
  //    (reuses the same grouping logic as the RELACIONES cards)
  // --------------------------------------------------------------
  const parentGroups = groupParentChildRelationships(relationships);

  for (const pg of parentGroups) {
    const parentIds = pg.parents.filter((p) => p).map((p) => p!.id);
    const parents = parentIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);
    const children = pg.children
      .map((c) => (c.person ? personById.get(c.person.id) : undefined))
      .filter((p): p is Person => !!p);

    if (parents.length === 0 || children.length === 0) continue;

    const key = parentIds.sort().join("|");
    registeredParentKeys.add(key);

    groups.push({
      key,
      name: buildGroupName(parents, children),
      parents,
      children,
      pets: [],
    });
  }

  // --------------------------------------------------------------
  // 2) Couples without children yet (spouse_of pairs not already
  //    represented above)
  // --------------------------------------------------------------
  const spouseOf = relationships.filter((r) => r.type === "spouse_of");
  const seenCoupleKeys = new Set<string>();

  for (const rel of spouseOf) {
    const key = [rel.person_a_id, rel.person_b_id].sort().join("|");
    if (registeredParentKeys.has(key) || seenCoupleKeys.has(key)) continue;
    seenCoupleKeys.add(key);

    const personA = personById.get(rel.person_a_id);
    const personB = personById.get(rel.person_b_id);
    const parents = [personA, personB].filter((p): p is Person => !!p);
    if (parents.length === 0) continue;

    groups.push({
      key,
      name: buildGroupName(parents, []),
      parents,
      children: [],
      pets: [],
    });
  }

  // --------------------------------------------------------------
  // 3) Attach pets — a pet joins the first group where its linked
  //    person (owner, caregiver, etc.) is a parent or a child
  // --------------------------------------------------------------
  const petById = new Map(pets.map((p) => [p.id, p]));
  const assignedPetIds = new Set<string>();

  for (const petRel of petRelationships) {
    if (!petRel.person || assignedPetIds.has(petRel.pet_id)) continue;
    const pet = petById.get(petRel.pet_id);
    if (!pet) continue;

    const group = groups.find(
      (g) =>
        g.parents.some((p) => p.id === petRel.person_id) ||
        g.children.some((c) => c.id === petRel.person_id)
    );

    if (group) {
      group.pets.push(pet);
      assignedPetIds.add(petRel.pet_id);
    }
  }

  // --------------------------------------------------------------
  // 4) Which persons ended up inside a group (everyone else is "loose")
  // --------------------------------------------------------------
  const groupedPersonIds = new Set<string>();
  for (const g of groups) {
    for (const p of g.parents) groupedPersonIds.add(p.id);
    for (const c of g.children) groupedPersonIds.add(c.id);
  }

  const groupedPetIds = new Set<string>();
  for (const g of groups) {
    for (const pet of g.pets) groupedPetIds.add(pet.id);
  }

  return { groups, groupedPersonIds, groupedPetIds };
}
