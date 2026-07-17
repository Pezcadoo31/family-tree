"use client";

import { useState, useTransition } from "react";
import {
  createRelationship,
  createSiblingGroup,
  updateRelationship,
  getRelationships,
  type CreateRelationshipInput,
  type CreateSiblingGroupInput,
} from "@/lib/actions/relationships";
import { groupParentChildRelationships } from "@/lib/relationships/groupParentRelationships";
import type { Person, RelationshipType, ParentSubtype, SpouseSubtype, SiblingSubtype } from "@/lib/types";
import { DatePicker } from "./DatePicker";

// ============================================================================
// TYPES
// ============================================================================

export type EditingRelationship = {
  id: string;
  type: "parent_of" | "spouse_of" | "sibling_of";
  person_a_id: string;
  person_b_id: string;
  parent_subtype: ParentSubtype | "";
  spouse_subtype: SpouseSubtype | "";
  sibling_subtype: SiblingSubtype | "";
  start_date: string;
  end_date: string;
  notes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  persons: Person[];
  presetPersonId?: string;
  onCreated?: () => void;
  editing?: EditingRelationship;
};

const EMPTY_FORM: CreateRelationshipInput = {
  person_a_id: "",
  person_b_id: "",
  type: "parent_of",
  parent_subtype: "biological",
  spouse_subtype: "",
  sibling_subtype: "",
  start_date: "",
  end_date: "",
  notes: "",
};

// ============================================================================
// LABELS
// ============================================================================

const PARENT_SUBTYPE_LABELS: Record<ParentSubtype, string> = {
  biological: "Biológico/a",
  adoptive:   "Adoptivo/a",
  step:       "Padrastro / Madrastra",
  foster:     "Tutor/a temporal",
};

const SPOUSE_SUBTYPE_LABELS: Record<SpouseSubtype, string> = {
  married:   "Casados",
  divorced:  "Divorciados",
  separated: "Separados",
  widowed:   "Viudo/a",
  partner:   "Pareja / Unión libre",
};

const SIBLING_SUBTYPE_LABELS: Record<SiblingSubtype, string> = {
  full:     "Hermanos completos",
  half:     "Medio hermanos",
  step:     "Hermanastros",
  adoptive: "Hermanos adoptivos",
};

const TYPE_LABEL: Record<"parent_of" | "spouse_of" | "sibling_of", string> = {
  parent_of: "👨‍👧 Padre / Hijo",
  spouse_of: "💑 Cónyuge",
  sibling_of: "👫 Hermanos",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddRelationshipSheet({ open, onClose, persons, presetPersonId, onCreated, editing }: Props) {
  const isEditing = !!editing;

  function computeInitialForm(): CreateRelationshipInput {
    if (editing) {
      return {
        person_a_id: editing.person_a_id,
        person_b_id: editing.person_b_id,
        type: editing.type,
        parent_subtype: editing.parent_subtype,
        spouse_subtype: editing.spouse_subtype,
        sibling_subtype: editing.sibling_subtype,
        start_date: editing.start_date,
        end_date: editing.end_date,
        notes: editing.notes,
      };
    }
    return presetPersonId ? { ...EMPTY_FORM, person_a_id: presetPersonId } : EMPTY_FORM;
  }

  const initialForm = computeInitialForm();

  const [form, setForm] = useState<CreateRelationshipInput>(initialForm);
  const [siblingIds, setSiblingIds] = useState<string[]>(
    !isEditing && presetPersonId ? [presetPersonId] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [startAutoFilled, setStartAutoFilled] = useState(false);

  // Post-creation sibling suggestion phase (only relevant when creating)
  const [phase, setPhase] = useState<"form" | "sibling-suggestions">("form");
  const [siblingCandidates, setSiblingCandidates] = useState<Person[]>([]);
  const [newChildId, setNewChildId] = useState<string | null>(null);
  const [processingCandidateId, setProcessingCandidateId] = useState<string | null>(null);

  function computeSiblingStartDate(ids: string[]): string | null {
    const birthDates = ids
      .map((id) => persons.find((p) => p.id === id)?.birth_date)
      .filter((d): d is string => !!d);

    if (birthDates.length < 2) return null;
    return birthDates.reduce((latest, d) => (d > latest ? d : latest));
  }

  async function findMissingSiblingsForChild(childId: string): Promise<Person[]> {
    const all = await getRelationships();
    const parentGroups = groupParentChildRelationships(all);
    const group = parentGroups.find((g) => g.children.some((c) => c.person?.id === childId));
    if (!group) return [];

    const existingSiblingPairs = new Set(
      all
        .filter((r) => r.type === "sibling_of")
        .map((r) => [r.person_a_id, r.person_b_id].sort().join("|"))
    );

    const missing: Person[] = [];
    for (const c of group.children) {
      if (!c.person || c.person.id === childId) continue;
      const key = [c.person.id, childId].sort().join("|");
      if (existingSiblingPairs.has(key)) continue;
      const fullPerson = persons.find((p) => p.id === c.person!.id);
      if (fullPerson) missing.push(fullPerson);
    }
    return missing;
  }

  function toggleSibling(id: string) {
    setSiblingIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!form.start_date || startAutoFilled) {
        const suggested = computeSiblingStartDate(next);
        if (suggested) {
          setForm((f) => ({ ...f, start_date: suggested }));
          setStartAutoFilled(true);
        }
      }
      return next;
    });
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    const next: CreateRelationshipInput = { ...form, [name]: value };

    if (name === "type" && !isEditing) {
      next.parent_subtype  = value === "parent_of"  ? "biological" : "";
      next.spouse_subtype  = value === "spouse_of"  ? "married"    : "";
      next.sibling_subtype = value === "sibling_of" ? "full"       : "";
    }

    const relevantChange = name === "type" || name === "person_a_id" || name === "person_b_id";
    let nextAutoFilled = name === "type" ? false : startAutoFilled;

    if (!isEditing && relevantChange && (!form.start_date || startAutoFilled)) {
      if (next.type === "parent_of") {
        const child = persons.find((p) => p.id === next.person_b_id);
        if (child?.birth_date) {
          next.start_date = child.birth_date;
          nextAutoFilled = true;
        }
      }
    }

    setForm(next);
    setStartAutoFilled(nextAutoFilled);
  }

  function handleClose() {
    setForm(initialForm);
    setSiblingIds(!isEditing && presetPersonId ? [presetPersonId] : []);
    setError(null);
    setStartAutoFilled(false);
    setPhase("form");
    setSiblingCandidates([]);
    setNewChildId(null);
    setProcessingCandidateId(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);

    if (isEditing && editing) {
      startTransition(async () => {
        const result = await updateRelationship(editing.id, editing.type, {
          person_a_id: form.person_a_id,
          person_b_id: form.person_b_id,
          parent_subtype: form.parent_subtype,
          spouse_subtype: form.spouse_subtype,
          sibling_subtype: form.sibling_subtype,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes,
        });
        if (result.success) {
          onCreated?.();
          handleClose();
        } else {
          setError(result.error);
        }
      });
      return;
    }

    if (form.type === "sibling_of") {
      const input: CreateSiblingGroupInput = {
        person_ids: siblingIds,
        sibling_subtype: form.sibling_subtype,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes,
      };
      startTransition(async () => {
        const result = await createSiblingGroup(input);
        if (result.success) {
          onCreated?.();
          handleClose();
        } else {
          setError(result.error);
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await createRelationship(form);
      if (result.success) {
        onCreated?.();
        if (form.type === "parent_of") {
          const missing = await findMissingSiblingsForChild(form.person_b_id);
          if (missing.length > 0) {
            setNewChildId(form.person_b_id);
            setSiblingCandidates(missing);
            setPhase("sibling-suggestions");
            return;
          }
        }
        handleClose();
      } else {
        setError(result.error);
      }
    });
  }

  function handleConfirmSibling(candidateId: string) {
    if (!newChildId) return;
    setProcessingCandidateId(candidateId);
    startTransition(async () => {
      await createSiblingGroup({
        person_ids: [candidateId, newChildId],
        sibling_subtype: "full",
        start_date: "",
        end_date: "",
        notes: "",
      });
      setSiblingCandidates((prev) => prev.filter((p) => p.id !== candidateId));
      setProcessingCandidateId(null);
      onCreated?.();
    });
  }

  function handleDismissSibling(candidateId: string) {
    setSiblingCandidates((prev) => prev.filter((p) => p.id !== candidateId));
  }

  if (!open) return null;

  const personName = (p: Person) => [p.given_name, p.paternal_surname].filter(Boolean).join(" ");

  function subtypeOk(): boolean {
    if (form.type === "parent_of") return !!form.parent_subtype;
    if (form.type === "spouse_of") return !!form.spouse_subtype;
    return !!form.sibling_subtype; // sibling_of
  }

  const canSubmit = isEditing
    ? !!form.person_a_id && !!form.person_b_id && form.person_a_id !== form.person_b_id && subtypeOk()
    : form.type === "sibling_of"
      ? siblingIds.length >= 2 && !!form.sibling_subtype
      : !!form.person_a_id && !!form.person_b_id && form.person_a_id !== form.person_b_id && subtypeOk();

  const labelA =
    form.type === "parent_of"  ? "Padre / Madre" :
    form.type === "sibling_of" ? "Hermano/a A"   : "Persona A";
  const labelB =
    form.type === "parent_of"  ? "Hijo / Hija"   :
    form.type === "sibling_of" ? "Hermano/a B"   : "Persona B";
  const labelConnector =
    form.type === "parent_of"  ? "es padre/madre de" :
    form.type === "sibling_of" ? "es hermano/a de"    : "está vinculado/a con";

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={handleClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 flex flex-col bg-[#0f0f17] border-l border-violet-accent/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-medium text-zinc-50">
              {phase !== "form" ? "Vínculo creado" : isEditing ? "Editar relación" : "Nueva relación"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {phase !== "form"
                ? "Detectamos hermanos por completar"
                : isEditing
                  ? "Actualiza este vínculo"
                  : "Vincula personas del árbol"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised transition-colors"
          >
            ✕
          </button>
        </div>

        {phase === "form" ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Tipo de relación */}
              {isEditing ? (
                <div className="px-3 py-2.5 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-300">
                  {TYPE_LABEL[editing!.type]}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Tipo de relación</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["parent_of", "sibling_of", "spouse_of"] as RelationshipType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          handleChange({ target: { name: "type", value: t } } as React.ChangeEvent<HTMLSelectElement>)
                        }
                        className={`py-3 rounded-xl border text-xs font-medium transition-colors ${
                          form.type === t
                            ? "bg-violet-accent/20 border-violet-accent/50 text-violet-300"
                            : "bg-surface-raised border-surface-border text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {t === "parent_of"  ? "👨‍👧 Padre / Hijo" :
                         t === "sibling_of" ? "👫 Hermanos"       :
                                              "💑 Cónyuge"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Personas */}
              {form.type === "sibling_of" && !isEditing ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">
                    Selecciona a todos los hermanos ({siblingIds.length} seleccionados)
                  </label>
                  <div className="border border-surface-border rounded-xl divide-y divide-surface-border max-h-56 overflow-y-auto">
                    {persons.map((p) => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-raised transition-colors">
                        <input
                          type="checkbox"
                          checked={siblingIds.includes(p.id)}
                          onChange={() => toggleSibling(p.id)}
                          className="w-4 h-4 accent-violet-500"
                        />
                        <span className="text-sm text-zinc-200">
                          {personName(p)}
                          {p.nickname && <span className="text-violet-400"> &quot;{p.nickname}&quot;</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  {siblingIds.length === 1 && (
                    <p className="text-[11px] text-zinc-600">Selecciona al menos otro hermano/a para vincular.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label={labelA}>
                    <PersonSelect
                      name="person_a_id"
                      value={form.person_a_id}
                      onChange={handleChange}
                      persons={persons}
                      exclude={form.person_b_id}
                      placeholder={`Selecciona ${labelA.toLowerCase()}`}
                      personName={personName}
                    />
                  </Field>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-xs text-zinc-600">{labelConnector}</span>
                    <div className="flex-1 h-px bg-surface-border" />
                  </div>
                  <Field label={labelB}>
                    <PersonSelect
                      name="person_b_id"
                      value={form.person_b_id}
                      onChange={handleChange}
                      persons={persons}
                      exclude={form.person_a_id}
                      placeholder={`Selecciona ${labelB.toLowerCase()}`}
                      personName={personName}
                    />
                  </Field>
                </div>
              )}

              {/* Subtipo */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  {form.type === "parent_of"  ? "Tipo de parentesco" :
                   form.type === "sibling_of" ? "Tipo de hermandad"  :
                                                "Estado del vínculo"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {form.type === "parent_of" &&
                    (Object.entries(PARENT_SUBTYPE_LABELS) as [ParentSubtype, string][]).map(([value, label]) => (
                      <SubtypeButton
                        key={value}
                        active={form.parent_subtype === value}
                        onClick={() => setForm((prev) => ({ ...prev, parent_subtype: value, spouse_subtype: "", sibling_subtype: "" }))}
                        label={label}
                      />
                    ))}
                  {form.type === "spouse_of" &&
                    (Object.entries(SPOUSE_SUBTYPE_LABELS) as [SpouseSubtype, string][]).map(([value, label]) => (
                      <SubtypeButton
                        key={value}
                        active={form.spouse_subtype === value}
                        onClick={() => setForm((prev) => ({ ...prev, spouse_subtype: value, parent_subtype: "", sibling_subtype: "" }))}
                        label={label}
                      />
                    ))}
                  {form.type === "sibling_of" &&
                    (Object.entries(SIBLING_SUBTYPE_LABELS) as [SiblingSubtype, string][]).map(([value, label]) => (
                      <SubtypeButton
                        key={value}
                        active={form.sibling_subtype === value}
                        onClick={() => setForm((prev) => ({ ...prev, sibling_subtype: value, parent_subtype: "", spouse_subtype: "" }))}
                        label={label}
                      />
                    ))}
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Fecha de inicio"
                  hint={
                    startAutoFilled
                      ? form.type === "parent_of" ? "auto: nacimiento del hijo/a" : "auto: nacimiento del hermano más joven"
                      : undefined
                  }
                >
                  <DatePicker
                    value={form.start_date}
                    onChange={(val) => {
                      setForm((prev) => ({ ...prev, start_date: val }));
                      setStartAutoFilled(false);
                    }}
                    placeholder="Fecha de inicio"
                  />
                </Field>
                <Field label="Fecha de fin">
                  <DatePicker
                    value={form.end_date}
                    onChange={(val) => setForm((prev) => ({ ...prev, end_date: val }))}
                    placeholder="Fecha de fin"
                  />
                </Field>
              </div>

              <Field label="Notas" hint="Opcional">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Cualquier detalle adicional..."
                  className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-accent/50 focus:ring-1 focus:ring-violet-accent/20 transition-colors resize-none"
                />
              </Field>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-surface-raised transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !canSubmit}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-accent/20 border border-violet-accent/40 text-violet-300 hover:bg-violet-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear vínculo"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              <p className="text-sm text-zinc-400">
                El vínculo se creó correctamente. Encontramos personas que ahora comparten los mismos
                padres confirmados — ¿son hermanos?
              </p>

              {siblingCandidates.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">No quedan sugerencias pendientes.</p>
              ) : (
                <div className="space-y-2">
                  {siblingCandidates.map((candidate) => {
                    const name = personName(candidate);
                    const isProcessing = processingCandidateId === candidate.id;
                    return (
                      <div key={candidate.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-raised border border-violet-accent/15 rounded-xl">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-100 truncate">
                            {name}
                            {candidate.nickname && <span className="text-violet-400"> &quot;{candidate.nickname}&quot;</span>}
                          </p>
                          <p className="text-xs text-zinc-500">Comparte ambos padres confirmados</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleConfirmSibling(candidate.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-accent/20 border border-violet-accent/40 text-violet-300 hover:bg-violet-accent/30 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? "..." : "Sí, vincular"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissSibling(candidate.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-accent/20 border border-violet-accent/40 text-violet-300 hover:bg-violet-accent/30 transition-colors"
              >
                Listo
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
        {label}
        {hint && <span className="text-zinc-600 font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function PersonSelect({ name, value, onChange, persons, exclude, placeholder, personName }: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  persons: Person[];
  exclude: string;
  placeholder: string;
  personName: (p: Person) => string;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-accent/50 focus:ring-1 focus:ring-violet-accent/20 transition-colors"
    >
      <option value="">{placeholder}</option>
      {persons.filter((p) => p.id !== exclude).map((p) => (
        <option key={p.id} value={p.id}>
          {personName(p)}{p.nickname ? ` "${p.nickname}"` : ""}
        </option>
      ))}
    </select>
  );
}

function SubtypeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors text-left ${
        active
          ? "bg-violet-accent/20 border-violet-accent/50 text-violet-300"
          : "bg-surface-raised border-surface-border text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
