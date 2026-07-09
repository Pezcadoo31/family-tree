"use client";

import { useState, useTransition } from "react";
import { deleteRelationship } from "@/lib/actions/relationships";
import type { Relationship } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type RelationshipWithPersons = Relationship & {
  person_a: { id: string; given_name: string; paternal_surname: string | null; nickname: string | null } | null;
  person_b: { id: string; given_name: string; paternal_surname: string | null; nickname: string | null } | null;
};

type Props = {
  relationship: RelationshipWithPersons;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function RelationshipCard({ relationship }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const nameA = [relationship.person_a?.given_name, relationship.person_a?.paternal_surname]
    .filter(Boolean).join(' ');
  const nameB = [relationship.person_b?.given_name, relationship.person_b?.paternal_surname]
    .filter(Boolean).join(' ');

  const typeLabel =
    relationship.type === 'parent_of'  ? relationship.parent_subtype  === 'biological' ? 'Padre/Madre biológico/a' :
                                         relationship.parent_subtype  === 'adoptive'   ? 'Padre/Madre adoptivo/a'  :
                                         relationship.parent_subtype  === 'step'       ? 'Padrastro/Madrastra'     : 'Tutor/a temporal' :
    relationship.type === 'spouse_of'  ? relationship.spouse_subtype  === 'married'    ? 'Casados'     :
                                         relationship.spouse_subtype  === 'divorced'   ? 'Divorciados' :
                                         relationship.spouse_subtype  === 'separated'  ? 'Separados'   :
                                         relationship.spouse_subtype  === 'widowed'    ? 'Viudo/a'     : 'Pareja' :
    relationship.type === 'sibling_of' ? relationship.sibling_subtype === 'full'      ? 'Hermanos completos' :
                                         relationship.sibling_subtype === 'half'      ? 'Medio hermanos'    :
                                         relationship.sibling_subtype === 'step'      ? 'Hermanastros'      : 'Hermanos adoptivos' :
    'Vínculo';

  const emoji =
    relationship.type === 'parent_of'  ? '👨‍👧' :
    relationship.type === 'sibling_of' ? '👫' : '💑';

  function handleDelete() {
    startTransition(async () => {
      await deleteRelationship(relationship.id);
      setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-raised border border-violet-accent/10 rounded-xl">
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-200">{nameA}</span>
        {relationship.person_a?.nickname && (
          <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
            &quot;{relationship.person_a.nickname}&quot;
          </span>
        )}
        <span className="text-xs text-zinc-600 mx-1">·</span>
        <span className="text-xs px-2 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300">
          {typeLabel}
        </span>
        <span className="text-xs text-zinc-600 mx-1">·</span>
        <span className="text-sm text-zinc-200">{nameB}</span>
        {relationship.person_b?.nickname && (
          <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
            &quot;{relationship.person_b.nickname}&quot;
          </span>
        )}
      </div>

      {/* Delete button */}
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