"use client";

import { useState, useTransition } from "react";
import { deleteRelationshipGroup } from "@/lib/actions/relationships";
import { AddRelationshipSheet, type EditingRelationship } from "./AddRelationshipSheet";
import type { ParentGroup, ParentGroupChild } from "@/lib/relationships/groupParentRelationships";
import type { Person } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  group: ParentGroup;
  allPersons: Person[];
  onDeleted?: () => void;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ParentGroupCard({ group, allPersons, onDeleted }: Props) {
  const [confirmingChildId, setConfirmingChildId] = useState<string | null>(null);
  const [editingRel, setEditingRel] = useState<EditingRelationship | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentNames = group.parents
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => [p.given_name, p.paternal_surname].filter(Boolean).join(" "));

  function handleRemoveChild(child: ParentGroupChild) {
    if (!child.person) return;
    startTransition(async () => {
      await deleteRelationshipGroup(child.relationships.map((r) => r.id));
      setConfirmingChildId(null);
      onDeleted?.();
    });
  }

  // Only offer the pencil when this parent-of link is unambiguous (exactly
  // one confirmed parent for that child) — with two parents, editing which
  // one it's tied to is better done from the ✕ chip + re-link flow instead.
  function openEditor(child: ParentGroupChild) {
    if (child.relationships.length !== 1 || !child.person) return;
    const rel = child.relationships[0];
    setEditingRel({
      id: rel.id,
      type: "parent_of",
      person_a_id: rel.person_a_id,
      person_b_id: rel.person_b_id,
      parent_subtype: rel.parent_subtype ?? "",
      spouse_subtype: "",
      sibling_subtype: "",
      start_date: rel.start_date ?? "",
      end_date: rel.end_date ?? "",
      notes: rel.notes ?? "",
    });
  }

  return (
    <div className="px-4 py-3 bg-surface-raised border border-violet-accent/10 rounded-xl">
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <span className="text-lg">👨‍👧</span>
        {parentNames.map((name, i) => (
          <span key={name} className="text-sm text-zinc-200">
            {name}
            {i < parentNames.length - 1 && <span className="text-zinc-600 mx-1">&amp;</span>}
          </span>
        ))}
        <span className="text-xs text-zinc-600 mx-1">
          {parentNames.length === 1 ? "es padre/madre de" : "son padres de"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {group.children.map((child) => {
          if (!child.person) return null;
          const name = [child.person.given_name, child.person.paternal_surname].filter(Boolean).join(" ");
          const isConfirming = confirmingChildId === child.person.id;
          const canEdit = child.relationships.length === 1;

          return isConfirming ? (
            <div key={child.person.id} className="flex items-center gap-1">
              <span className="text-xs px-2.5 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-red-400">
                ¿Quitar a {name}?
              </span>
              <button
                type="button"
                onClick={() => handleRemoveChild(child)}
                disabled={isPending}
                className="text-xs px-2 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : "Sí"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingChildId(null)}
                disabled={isPending}
                className="text-xs px-2 py-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <span
              key={child.person.id}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300"
            >
              {name}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => openEditor(child)}
                  className="text-violet-400/60 hover:text-violet-300 transition-colors"
                  aria-label={`Editar vínculo con ${name}`}
                >
                  ✎
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmingChildId(child.person!.id)}
                className="text-violet-400/60 hover:text-red-400 transition-colors"
                aria-label={`Quitar a ${name}`}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>

      {editingRel && (
        <AddRelationshipSheet
          open={!!editingRel}
          onClose={() => setEditingRel(null)}
          persons={allPersons}
          editing={editingRel}
          onCreated={onDeleted}
        />
      )}
    </div>
  );
}
