"use client";

import { useEffect, useState, useCallback } from "react";
import { getPetRelationshipsForPerson, type PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import { PetRelationshipCard } from "./PetRelationshipCard";
import { AddPetRelationshipSheet } from "./AddPetRelationshipSheet";
import type { Person, Pet } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  personId: string;
  allPersons: Person[];
  allPets: Pet[];
};

// ============================================================================
// COMPONENT
// ============================================================================

export function EditPersonPetsPanel({ personId, allPersons, allPets }: Props) {
  const [relationships, setRelationships] = useState<PetRelationshipWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getPetRelationshipsForPerson(personId);
    setRelationships(data);
    setLoading(false);
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {loading ? "Cargando..." : `${relationships.length} ${relationships.length === 1 ? "mascota" : "mascotas"}`}
        </span>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-3 py-1.5 rounded-full text-xs font-medium text-cyan-300 border border-cyan-accent/40 bg-cyan-accent/10 hover:bg-cyan-accent/20 transition-colors"
        >
          + Vincular
        </button>
      </div>

      {!loading && relationships.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-3">Sin mascotas vinculadas todavía.</p>
      )}

      <div className="space-y-2">
        {relationships.map((rel) => (
          <PetRelationshipCard key={rel.id} relationship={rel} onDeleted={load} />
        ))}
      </div>

      <AddPetRelationshipSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        persons={allPersons}
        pets={allPets}
        presetPersonId={personId}
        onCreated={load}
      />
    </div>
  );
}
