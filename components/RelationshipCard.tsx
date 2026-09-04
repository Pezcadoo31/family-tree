"use client";

import { useState, useTransition } from "react";
import { deleteRelationship, deleteRelationshipGroup, updateSiblingGroup } from "@/lib/actions/relationships";
import { AddRelationshipSheet, type EditingRelationship } from "./AddRelationshipSheet";
import { DatePicker } from "./DatePicker";
import type { Relationship, Person, SiblingSubtype } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type PersonRef = { id: string; given_name: string; paternal_surname: string | null; nickname: string | null; birth_date: string | null } | null;

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
    // Oldest first — same convention as everywhere else this session
    // (the tree, the parent/children panel). Missing birth_date sorts
    // last rather than defaulting to "oldest".
    return Array.from(map.values()).sort((a, b) => {
      const dateA = a?.birth_date;
      const dateB = b?.birth_date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });
  })();

  const otherPerson = viewingPersonId
    ? (first.person_a?.id === viewingPersonId ? first.person_b : first.person_a)
    : null;

  // First relationship in the group that involves this person — a
  // reasonable single answer even though subtype is stored per pair,
  // since in practice every relationship a person gets in this clique is
  // created in one bulk action (adding them as a sibling to everyone
  // already in the group) and shares the same subtype at that moment.
  // Only reliable when the whole clique shares one subtype — see
  // `siblingClusters` below for the case where it doesn't.
  function personSiblingSubtype(personId: string): SiblingSubtype | undefined {
    const rel = relationships.find((r) => r.person_a_id === personId || r.person_b_id === personId);
    return rel?.sibling_subtype ?? undefined;
  }

  // A sibling clique can genuinely mix subtypes — e.g. two full-sibling
  // sub-families bridged by a shared parent, so every cross-family pair is
  // "half" while each sub-family is "full" internally. A single badge per
  // PERSON can't represent that (whichever pair happens to be first in
  // `relationships` wins, so a fully-full sub-family can end up labeled
  // "Medio hermanos" for everyone just because a bridging half-sibling edge
  // exists elsewhere in the clique). Cluster people into full-sibling
  // sub-groups instead — same criterion the tree's sibling-hub routing
  // already uses — and label each cluster once, plus the real relationship
  // connecting each pair of consecutive clusters.
  const siblingClusters = (() => {
    // isGroup, not just type — a lone (non-group) sibling pair renders
    // through the simple two-name branch below regardless of subtype;
    // without this, a standalone half/step/adoptive pair shown without a
    // viewingPersonId (e.g. on the home page) would have both people land
    // in separate singleton clusters and wrongly get the clustered layout.
    if (!isGroup || first.type !== "sibling_of") return null;

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

    for (const p of uniquePersons) if (p) find(p.id);
    for (const rel of relationships) {
      if (rel.sibling_subtype !== "full" || !rel.person_a || !rel.person_b) continue;
      union(rel.person_a_id, rel.person_b_id);
    }

    const byRoot = new Map<string, NonNullable<PersonRef>[]>();
    for (const p of uniquePersons) {
      if (!p) continue;
      const root = find(p.id);
      const arr = byRoot.get(root) ?? [];
      arr.push(p);
      byRoot.set(root, arr);
    }

    // Uniform clique (everyone in one full-sibling cluster, or no "full"
    // edges at all so every person is their own singleton) — the flat
    // per-person rendering below already gets this right, no need for the
    // clustered layout.
    if (byRoot.size <= 1) return null;

    // Chronological — oldest cluster (by its oldest member) first, same
    // convention as everywhere else this session. uniquePersons is already
    // sorted oldest-first, so each cluster's members come out sorted too.
    const clusters = Array.from(byRoot.values()).sort((a, b) => {
      const dateA = a[0]?.birth_date;
      const dateB = b[0]?.birth_date;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB);
    });

    const clusterIndexByPersonId = new Map<string, number>();
    clusters.forEach((cluster, i) => cluster.forEach((p) => clusterIndexByPersonId.set(p.id, i)));

    // Real subtype connecting two clusters, majority vote across every
    // cross-cluster pair (ties keep whichever subtype is encountered
    // first). With exactly 2 clusters — every case this app has produced
    // so far — this is exhaustive. With 3+, only bridges between
    // CONSECUTIVE clusters in the chronological layout above get a label;
    // a non-adjacent cluster pair whose real subtype differs from the
    // chain through the clusters between them won't get its own line.
    // Documented rather than silently assumed — revisit with a proper
    // matrix/legend if a real 3+-cluster case shows up.
    function bridgeLabel(i: number, j: number): string | null {
      const counts = new Map<SiblingSubtype, number>();
      for (const rel of relationships) {
        if (!rel.person_a || !rel.person_b || !rel.sibling_subtype) continue;
        const ia = clusterIndexByPersonId.get(rel.person_a.id);
        const ib = clusterIndexByPersonId.get(rel.person_b.id);
        if ((ia === i && ib === j) || (ia === j && ib === i)) {
          counts.set(rel.sibling_subtype, (counts.get(rel.sibling_subtype) ?? 0) + 1);
        }
      }
      let best: SiblingSubtype | null = null;
      let bestCount = -1;
      for (const [subtype, count] of counts) {
        if (count > bestCount) { best = subtype; bestCount = count; }
      }
      return best ? SIBLING_SUBTYPE_LABELS[best] : null;
    }

    return clusters.map((members, i) => ({
      members,
      bridgeToNext: i < clusters.length - 1 ? bridgeLabel(i, i + 1) : null,
    }));
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
          {siblingClusters ? (
            <div className="flex flex-col gap-1 w-full">
              {siblingClusters.map((cluster) => (
                <div key={cluster.members.map((p) => p.id).join("-")}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cluster.members.map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1.5">
                        <span className="text-sm text-zinc-200">
                          {[p.given_name, p.paternal_surname].filter(Boolean).join(' ')}
                        </span>
                        {p.nickname && (
                          <span className="text-xs text-violet-400" style={{ fontFamily: 'var(--font-script)' }}>
                            &quot;{p.nickname}&quot;
                          </span>
                        )}
                        {i < cluster.members.length - 1 && <span className="text-zinc-600">·</span>}
                      </span>
                    ))}
                    {cluster.members.length > 1 && (
                      <span className="inline-block text-center text-[10px] leading-tight px-1.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-lg text-violet-300">
                        {SIBLING_SUBTYPE_LABELS.full}
                      </span>
                    )}
                  </div>
                  {cluster.bridgeToNext && (
                    <div className="text-[11px] italic text-zinc-500 py-0.5">
                      — {cluster.bridgeToNext} —
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isGroup ? (
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
                      // inline-block (no el `inline` por defecto de un span) para
                      // que text-center sí controle su propio texto cuando envuelve
                      // a 2 líneas — un span inline normal no establece ese
                      // contexto de alineación por sí mismo. rounded-lg en vez de
                      // rounded-full porque una píldora totalmente redonda se ve
                      // deforme cuando la caja crece de alto por el wrap.
                      <span className="inline-block text-center text-[10px] leading-tight px-1.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-lg text-violet-300">
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
