"use client";

import { useState, useTransition } from "react";
import { deletePetRelationship, type PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import type { PetPersonRelationship } from "@/lib/types";

// ============================================================================
// LABELS
// ============================================================================

const RELATIONSHIP_LABELS: Record<PetPersonRelationship, string> = {
  owner:             "Dueño/a",
  primary_caregiver: "Cuidador/a principal",
  family_pet:        "Mascota familiar",
  beloved_by:        "Querido/a por",
  adopter:           "Adoptante",
};

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  relationship: PetRelationshipWithRefs;
  /** Which side to show as the "main" name — the pet or the person.
   *  Defaults to showing both. */
  onDeleted?: () => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PetRelationshipCard({ relationship, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const petName = relationship.pet
    ? relationship.pet.name + (relationship.pet.nickname ? ` "${relationship.pet.nickname}"` : "")
    : "";
  const personName = relationship.person
    ? [relationship.person.given_name, relationship.person.paternal_surname].filter(Boolean).join(" ")
    : "";

  function handleDelete() {
    startTransition(async () => {
      await deletePetRelationship(relationship.id);
      setConfirming(false);
      onDeleted?.();
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-raised border border-cyan-accent/10 rounded-xl">
      <span className="text-lg">🐾</span>
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-200">{petName}</span>
        <span className="text-xs text-zinc-600 mx-1">·</span>
        <span className="text-xs px-2 py-0.5 bg-cyan-accent/10 border border-cyan-accent/20 rounded-full text-cyan-300">
          {RELATIONSHIP_LABELS[relationship.relationship]}
        </span>
        <span className="text-xs text-zinc-600 mx-1">·</span>
        <span className="text-sm text-zinc-200">{personName}</span>
      </div>

      {confirming ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Eliminar vínculo"
        >
          🗑
        </button>
      )}
    </div>
  );
}
