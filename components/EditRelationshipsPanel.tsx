"use client";

import { useEffect, useState, useCallback } from "react";
import { getRelationshipsForPerson, type RelationshipWithPersons } from "@/lib/actions/relationships";
import { groupRelationships } from "@/lib/relationships/groupRelationships";
import { RelationshipCard } from "./RelationshipCard";
import { AddRelationshipSheet } from "./AddRelationshipSheet";
import type { Person } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  personId: string;
  allPersons: Person[];
};

// ============================================================================
// COMPONENT
// ============================================================================

export function EditRelationshipsPanel({ personId, allPersons }: Props) {
  const [relationships, setRelationships] = useState<RelationshipWithPersons[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getRelationshipsForPerson(personId);
    setRelationships(data);
    setLoading(false);
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = groupRelationships(relationships);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {loading ? "Cargando..." : `${relationships.length} ${relationships.length === 1 ? "vínculo" : "vínculos"}`}
        </span>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
        >
          + Vincular
        </button>
      </div>

      {!loading && groups.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-3">Sin vínculos registrados todavía.</p>
      )}

      <div className="space-y-2">
        {groups.map((group) => (
          <RelationshipCard key={group[0].id} relationships={group} onDeleted={load} />
        ))}
      </div>

      <AddRelationshipSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        persons={allPersons}
        presetPersonId={personId}
        onCreated={load}
      />
    </div>
  );
}
