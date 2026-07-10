"use client";

import { useState, useTransition } from "react";
import { deleteRelationship, deleteRelationshipGroup } from "@/lib/actions/relationships";
import type { Relationship } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type PersonRef = { id: string; given_name: string; paternal_surname: string | null; nickname: string | null } | null;

type RelationshipWithPersons = Relationship & {
  person_a: PersonRef;
  person_b: PersonRef;
};

type Props = {
  relationships: RelationshipWithPersons[];
  onDeleted?: () => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function RelationshipCard({ relationships, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const first = relationships[0];
  const isGroup = relationships.length > 1;

  // Recolecta todas las personas únicas involucradas (para el caso de grupo)
  const uniquePersons = (() => {
    const map = new Map<string, PersonRef>();
    for (const rel of relationships) {
      if (rel.person_a) map.set(rel.person_a.id, rel.person_a);
      if (rel.person_b) map.set(rel.person_b.id, rel.person_b);
    }
    return Array.from(map.values());
  })();

  const typeLabel =
    first.type === 'parent_of'  ? first.parent_subtype  === 'biological' ? 'Padre/Madre biológico/a' :
                                   first.parent_subtype  === 'adoptive'   ? 'Padre/Madre adoptivo/a'  :
                                   first.parent_subtype  === 'step'       ? 'Padrastro/Madrastra'     : 'Tutor/a temporal' :
    first.type === 'spouse_of'  ? first.spouse_subtype  === 'married'    ? 'Casados'     :
                                   first.spouse_subtype  === 'divorced'   ? 'Divorciados' :
                                   first.spouse_subtype  === 'separated'  ? 'Separados'   :
                                   first.spouse_subtype  === 'widowed'    ? 'Viudo/a'     : 'Pareja' :
    first.type === 'sibling_of' ? first.sibling_subtype === 'full'      ? 'Hermanos completos' :
                                   first.sibling_subtype === 'half'      ? 'Medio hermanos'    :
                                   first.sibling_subtype === 'step'      ? 'Hermanastros'      : 'Hermanos adoptivos' :
    'Vínculo';

  const emoji =
    first.type === 'parent_of'  ? '👨‍👧' :
    first.type === 'sibling_of' ? '👫' : '💑';

  function handleDelete() {
    startTransition(async () => {
      if (isGroup) {
        await deleteRelationshipGroup(relationships.map((r) => r.id));
      } else {
        await deleteRelationship(first.id);
      }
      setConfirming(false);
      onDeleted?.();
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-raised border border-violet-accent/10 rounded-xl">
      <span className="text-lg">{emoji}</span>

      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {isGroup ? (
          // ================== GROUP: show all unique names ==================
          <>
            {uniquePersons.map((p, i) => (
              <span key={p?.id} className="flex items-center gap-1.5">
                <span className="text-sm text-zinc-200">
                  {p ? [p.given_name, p.paternal_surname].filter(Boolean).join(' ') : ''}
                </span>
                {p?.nickname && (
                  <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
                    &quot;{p.nickname}&quot;
                  </span>
                )}
                {i < uniquePersons.length - 1 && <span className="text-zinc-600">·</span>}
              </span>
            ))}
            <span className="text-xs text-zinc-600 mx-1">·</span>
            <span className="text-xs px-2 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300">
              {typeLabel}
            </span>
          </>
        ) : (
          // ================== SINGLE: original two-person layout ==================
          <>
            <span className="text-sm text-zinc-200">
              {first.person_a ? [first.person_a.given_name, first.person_a.paternal_surname].filter(Boolean).join(' ') : ''}
            </span>
            {first.person_a?.nickname && (
              <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
                &quot;{first.person_a.nickname}&quot;
              </span>
            )}
            <span className="text-xs text-zinc-600 mx-1">·</span>
            <span className="text-xs px-2 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300">
              {typeLabel}
            </span>
            <span className="text-xs text-zinc-600 mx-1">·</span>
            <span className="text-sm text-zinc-200">
              {first.person_b ? [first.person_b.given_name, first.person_b.paternal_surname].filter(Boolean).join(' ') : ''}
            </span>
            {first.person_b?.nickname && (
              <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
                &quot;{first.person_b.nickname}&quot;
              </span>
            )}
          </>
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
