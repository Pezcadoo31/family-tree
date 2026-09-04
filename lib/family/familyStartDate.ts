import type { FamilyGroup } from "./detectFamilyGroups";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";

// ============================================================================
// familyStartDate — a family's chronological anchor, shared by every place
// that needs to rank one family against another: column order
// (buildTreeLayout), left-corridor eligibility, and bridge-lane ranking
// (FamilyTreeView). Previously two independently-evolving copies existed —
// one only checked a spouse_of date when there were EXACTLY 2 parents and
// had a child-birth fallback the other didn't — which agreed only because
// every family in this app happens to have exactly 2 recorded parents, not
// because they were actually the same logic. A family with 1 or 3+ parents
// would have silently gotten a different answer from each.
//
// Priority: the parents' own union date (spouse_of.start_date, earliest
// across every parent PAIR — not just the first two, so this holds for any
// number of recorded parents) → else the eldest child's birth_date (a
// recorded child is itself evidence the family existed by then) → else the
// eldest parent's birth_date. No evidence at all sorts last, same
// convention used everywhere else in this app.
// ============================================================================

export function familyStartDate(
  group: FamilyGroup,
  relationships: RelationshipWithPersons[]
): string | null {
  let earliestUnion: string | undefined;
  for (let i = 0; i < group.parents.length; i++) {
    for (let j = i + 1; j < group.parents.length; j++) {
      const a = group.parents[i].id;
      const b = group.parents[j].id;
      const rel = relationships.find(
        (r) =>
          r.type === "spouse_of" &&
          ((r.person_a_id === a && r.person_b_id === b) ||
            (r.person_a_id === b && r.person_b_id === a))
      );
      if (rel?.start_date && (!earliestUnion || rel.start_date < earliestUnion)) {
        earliestUnion = rel.start_date;
      }
    }
  }
  if (earliestUnion) return earliestUnion;

  const childDates = group.children.map((c) => c.birth_date).filter((d): d is string => !!d).sort();
  if (childDates.length > 0) return childDates[0];

  const parentDates = group.parents.map((p) => p.birth_date).filter((d): d is string => !!d).sort();
  if (parentDates.length > 0) return parentDates[0];

  return null;
}
