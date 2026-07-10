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
  relationshipIds: string[]; // one id per parent linking to this child
};

export type ParentGroup = {
  parents: PersonRef[];
  children: ParentGroupChild[];
};

// ============================================================================
// groupParentChildRelationships
// Groups parent_of relationships by the exact set of parents a child has,
// so a couple with multiple children shows as ONE card instead of one
// per parent-child pair.
// ============================================================================

export function groupParentChildRelationships(
  relationships: RelationshipWithPersons[]
): ParentGroup[] {
  const parentOf = relationships.filter((r) => r.type === "parent_of");

  type ChildEntry = { person: PersonRef; parentIds: Map<string, string> }; // parentId -> relationshipId
  const byChild = new Map<string, ChildEntry>();
  const parentPersonById = new Map<string, PersonRef>();

  for (const rel of parentOf) {
    const entry = byChild.get(rel.person_b_id) ?? { person: rel.person_b, parentIds: new Map() };
    entry.parentIds.set(rel.person_a_id, rel.id);
    byChild.set(rel.person_b_id, entry);
    parentPersonById.set(rel.person_a_id, rel.person_a);
  }

  const byKey = new Map<string, ParentGroup>();

  for (const [, entry] of byChild) {
    const parentIds = Array.from(entry.parentIds.keys()).sort();
    const key = parentIds.join("|");
    const group = byKey.get(key) ?? {
      parents: parentIds.map((pid) => parentPersonById.get(pid) ?? null),
      children: [],
    };
    group.children.push({
      person: entry.person,
      relationshipIds: Array.from(entry.parentIds.values()),
    });
    byKey.set(key, group);
  }

  return Array.from(byKey.values());
}
