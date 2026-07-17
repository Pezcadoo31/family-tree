import type { RelationshipWithPersons } from "@/lib/actions/relationships";

// ============================================================================
// TYPES
// ============================================================================

export type PersonRef = {
  id: string;
  given_name: string;
  paternal_surname: string | null;
  nickname: string | null;
} | null;

export type ParentGroupChild = {
  person: PersonRef;
  /** One entry per parent linking to this child — full relationship data,
   *  needed to open the individual edit sheet (person_a_id/subtype/dates). */
  relationships: RelationshipWithPersons[];
};

export type ParentGroup = {
  parents: PersonRef[];
  children: ParentGroupChild[];
};

// ============================================================================
// groupParentChildRelationships
// ============================================================================

export function groupParentChildRelationships(
  relationships: RelationshipWithPersons[]
): ParentGroup[] {
  const parentOf = relationships.filter((r) => r.type === "parent_of");

  type ChildEntry = { person: PersonRef; rels: Map<string, RelationshipWithPersons> }; // parentId -> relationship
  const byChild = new Map<string, ChildEntry>();
  const parentPersonById = new Map<string, PersonRef>();

  for (const rel of parentOf) {
    const entry = byChild.get(rel.person_b_id) ?? { person: rel.person_b, rels: new Map() };
    entry.rels.set(rel.person_a_id, rel);
    byChild.set(rel.person_b_id, entry);
    parentPersonById.set(rel.person_a_id, rel.person_a);
  }

  const byKey = new Map<string, ParentGroup>();

  for (const [, entry] of byChild) {
    const parentIds = Array.from(entry.rels.keys()).sort();
    const key = parentIds.join("|");
    const group = byKey.get(key) ?? {
      parents: parentIds.map((pid) => parentPersonById.get(pid) ?? null),
      children: [],
    };
    group.children.push({
      person: entry.person,
      relationships: Array.from(entry.rels.values()),
    });
    byKey.set(key, group);
  }

  return Array.from(byKey.values());
}
