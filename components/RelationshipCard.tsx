"use client";

import { useState, useTransition } from "react";
import { deleteRelationship, deleteRelationshipGroup, updateSiblingGroup } from "@/lib/actions/relationships";
import { AddRelationshipSheet, type EditingRelationship } from "./AddRelationshipSheet";
import { DatePicker } from "./DatePicker";
import type { Relationship, Person, SiblingSubtype } from "@/lib/types";

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
  allPersons: Person[];
  onDeleted?: () => void;
  // Whose profile this card is shown on — excluded from the displayed
  // list so a person never appears listed as their own sibling/spouse.
  // Optional (falls back to showing everyone) so this stays safe if this
  // component is ever reused somewhere not tied to one specific profile.
  viewingPersonId?: string;
};

const SIBLING_SUBTYPE_LABELS: Record<SiblingSubtype, string> = {
  full:     "Hermanos completos",
  half:     "Medio hermanos",
  step:     "Hermanastros",
  adoptive: "Hermanos adoptivos",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function RelationshipCard({ relationships, allPersons, onDeleted, viewingPersonId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const first = relationships[0];
  const isGroup = relationships.length > 1;

  // Excludes viewingPersonId — this card lives on THEIR profile, so only
  // the other party/parties (their actual siblings/spouse) should show,
  // never themselves.
  const uniquePersons = (() => {
    const map = new Map<string, PersonRef>();
    for (const rel of relationships) {
      if (rel.person_a && rel.person_a.id !== viewingPersonId) map.set(rel.person_a.id, rel.person_a);
      if (rel.person_b && rel.person_b.id !== viewingPersonId) map.set(rel.person_b.id, rel.person_b);
    }
    return Array.from(map.values());
  })();

  const otherPerson = viewingPersonId
    ? (first.person_a?.id === viewingPersonId ? first.person_b : first.person_a)
    : null;

  // First relationship in the group that involves this person — a
  // reasonable single answer even though subtype is stored per pair,
  // since in practice every relationship a person gets in this clique is
  // created in one bulk action (adding them as a sibling to everyone
  // already in the group) and shares the same subtype at that moment.
  function personSiblingSubtype(personId: string): SiblingSubtype | undefined {
    const rel = relationships.find((r) => r.person_a_id === personId || r.person_b_id === personId);
    return rel?.sibling_subtype ?? undefined;
  }

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

  function handleRemoveFromGroup(personId: string) {
    const idsToRemove = relationships
      .filter((r) => r.person_a_id === personId || r.person_b_id === personId)
      .map((r) => r.id);
    if (idsToRemove.length === 0) return;

    setRemovingId(personId);
    startTransition(async () => {
      await deleteRelationshipGroup(idsToRemove);
      setRemovingId(null);
      onDeleted?.();
    });
  }

  const editingRelationship: EditingRelationship | null =
    !isGroup && (first.type === "spouse_of" || first.type === "sibling_of")
      ? {
          id: first.id,
          type: first.type,
          person_a_id: first.person_a_id,
          person_b_id: first.person_b_id,
          parent_subtype: first.parent_subtype ?? "",
          spouse_subtype: first.spouse_subtype ?? "",
          sibling_subtype: first.sibling_subtype ?? "",
          start_date: first.start_date ?? "",
          end_date: first.end_date ?? "",
          notes: first.notes ?? "",
        }
      : null;

  return (
    <div className="bg-surface-raised border border-violet-accent/10 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lg">{emoji}</span>

        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {isGroup ? (
            <>
              {uniquePersons.map((p, i) => {
                // Sibling subtype is stored PER PAIR, not once for the whole
                // clique — a group of 3+ can genuinely be mixed (some pairs
                // full, some half). Showing one shared label for everyone
                // was hiding that: it just displayed the first relationship's
                // subtype, so a mixed group silently looked uniform. This
                // shows each person's own subtype next to their name instead.
                const subtype = p ? personSiblingSubtype(p.id) : undefined;
                const subtypeLabel = subtype ? SIBLING_SUBTYPE_LABELS[subtype] : null;
                return (
                  <span key={p?.id} className="flex items-center gap-1.5">
                    <span className="text-sm text-zinc-200">
                      {p ? [p.given_name, p.paternal_surname].filter(Boolean).join(' ') : ''}
                    </span>
                    {p?.nickname && (
                      <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
                        &quot;{p.nickname}&quot;
                      </span>
                    )}
                    {first.type === "sibling_of" && subtypeLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300">
                        {subtypeLabel}
                      </span>
                    )}
                    {i < uniquePersons.length - 1 && <span className="text-zinc-600">·</span>}
                  </span>
                );
              })}
              {first.type !== "sibling_of" && (
                <>
                  <span className="text-xs text-zinc-600 mx-1">·</span>
                  <span className="text-xs px-2 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300">
                    {typeLabel}
                  </span>
                </>
              )}
            </>
          ) : viewingPersonId && otherPerson ? (
            <>
              <span className="text-sm text-zinc-200">
                {[otherPerson.given_name, otherPerson.paternal_surname].filter(Boolean).join(' ')}
              </span>
              {otherPerson.nickname && (
                <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
                  &quot;{otherPerson.nickname}&quot;
                </span>
              )}
              <span className="text-xs text-zinc-600 mx-1">·</span>
              <span className="text-xs px-2 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300">
                {typeLabel}
              </span>
            </>
          ) : (
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

        {/* Actions */}
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
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => (isGroup ? setGroupEditOpen((o) => !o) : setEditOpen(true))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-accent/10 transition-colors"
              aria-label="Editar vínculo"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Eliminar vínculo"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Group members with individual removal, shown when editing a group */}
      {isGroup && groupEditOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
          <div className="flex flex-wrap gap-1.5">
            {uniquePersons.map((p) => {
              if (!p) return null;
              const name = [p.given_name, p.paternal_surname].filter(Boolean).join(' ');
              const isRemoving = removingId === p.id;
              return (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-violet-300"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => handleRemoveFromGroup(p.id)}
                    disabled={isRemoving}
                    className="text-violet-400/60 hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label={`Quitar a ${name} del grupo`}
                  >
                    {isRemoving ? "..." : "✕"}
                  </button>
                </span>
              );
            })}
          </div>
          <GroupDetailsEditor relationships={relationships} onSaved={() => { setGroupEditOpen(false); onDeleted?.(); }} />
        </div>
      )}

      {editingRelationship && (
        <AddRelationshipSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          persons={allPersons}
          editing={editingRelationship}
          onCreated={onDeleted}
        />
      )}
    </div>
  );
}

// ============================================================================
// GroupDetailsEditor — inline editor for subtype/dates/notes of an entire
// sibling clique (3+ people). Membership changes happen via the ✕ chips
// above, not here.
// ============================================================================

function GroupDetailsEditor({
  relationships,
  onSaved,
}: {
  relationships: RelationshipWithPersons[];
  onSaved: () => void;
}) {
  const first = relationships[0];
  const [subtype, setSubtype] = useState<SiblingSubtype | "">(first.sibling_subtype ?? "");
  const [startDate, setStartDate] = useState(first.start_date ?? "");
  const [endDate, setEndDate] = useState(first.end_date ?? "");
  const [notes, setNotes] = useState(first.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateSiblingGroup(
        relationships.map((r) => r.id),
        { sibling_subtype: subtype, start_date: startDate, end_date: endDate, notes }
      );
      if (result.success) {
        onSaved();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3 bg-[#0f0f17] rounded-lg p-3 border border-surface-border">
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(SIBLING_SUBTYPE_LABELS) as [SiblingSubtype, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSubtype(value)}
            className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors text-left ${
              subtype === value
                ? "bg-violet-accent/20 border-violet-accent/50 text-violet-300"
                : "bg-surface-raised border-surface-border text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker value={startDate} onChange={setStartDate} placeholder="Fecha de inicio" />
        <DatePicker value={endDate} onChange={setEndDate} placeholder="Fecha de fin" />
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Notas..."
        className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-accent/50 transition-colors resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || !subtype}
        className="w-full py-1.5 rounded-lg text-xs font-medium bg-violet-accent/20 border border-violet-accent/40 text-violet-300 hover:bg-violet-accent/30 transition-colors disabled:opacity-40"
      >
        {isPending ? "Guardando..." : "Guardar cambios del grupo"}
      </button>
    </div>
  );
}
