import type { RelationshipWithPersons } from "@/lib/actions/relationships";

// ============================================================================
// groupRelationships — agrupa vínculos sibling_of por conectividad real
// (union-find sobre las personas), no por fecha de creación. Así, si A-B
// y B-C existen como pares separados creados en momentos distintos, se
// muestran como un solo grupo de hermanos {A, B, C}.
// ============================================================================

export function groupRelationships(
  relationships: RelationshipWithPersons[]
): RelationshipWithPersons[][] {
  const siblingRels = relationships.filter((r) => r.type === "sibling_of");
  const otherRels = relationships.filter((r) => r.type !== "sibling_of");

  // --- Union-Find sobre ids de persona conectados por sibling_of ---
  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const rel of siblingRels) {
    union(rel.person_a_id, rel.person_b_id);
  }

  const groupsByRoot = new Map<string, RelationshipWithPersons[]>();
  for (const rel of siblingRels) {
    const root = find(rel.person_a_id);
    const arr = groupsByRoot.get(root) ?? [];
    arr.push(rel);
    groupsByRoot.set(root, arr);
  }

  const standalone: RelationshipWithPersons[][] = otherRels.map((r) => [r]);

  return [...standalone, ...Array.from(groupsByRoot.values())];
}
