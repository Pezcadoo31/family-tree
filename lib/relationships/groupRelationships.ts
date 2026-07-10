import type { RelationshipWithPersons } from "@/lib/actions/relationships";

// ============================================================================
// groupRelationships — agrupa vínculos sibling_of que comparten created_at
// (mismo lote de inserción), para mostrarlos como un solo card de grupo
// ============================================================================

export function groupRelationships(
  relationships: RelationshipWithPersons[]
): RelationshipWithPersons[][] {
  const siblingGroups = new Map<string, RelationshipWithPersons[]>();
  const standalone: RelationshipWithPersons[][] = [];

  for (const rel of relationships) {
    if (rel.type === "sibling_of") {
      const key = rel.created_at;
      const group = siblingGroups.get(key) ?? [];
      group.push(rel);
      siblingGroups.set(key, group);
    } else {
      standalone.push([rel]);
    }
  }

  return [...standalone, ...Array.from(siblingGroups.values())];
}
