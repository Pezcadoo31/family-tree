"use client";

import { useState, useTransition } from "react";
import {
  createRelationship,
  type CreateRelationshipInput,
} from "@/lib/actions/relationships";
import type { Person, RelationshipType, ParentSubtype, SpouseSubtype, SiblingSubtype } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  open: boolean;
  onClose: () => void;
  persons: Person[];
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddRelationshipSheet({ open, onClose, persons }: Props) {
  const [form, setForm] = useState<CreateRelationshipInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "type") {
        next.parent_subtype  = value === "parent_of"  ? "biological" : "";
        next.spouse_subtype  = value === "spouse_of"  ? "married"    : "";
        next.sibling_subtype = value === "sibling_of" ? "full"       : "";
      }
      return next;
    });
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createRelationship(form);
      if (result.success) {
        handleClose();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  const personName = (p: Person) =>
    [p.given_name, p.paternal_surname].filter(Boolean).join(" ");

  const canSubmit =
    form.person_a_id &&
    form.person_b_id &&
    form.person_a_id !== form.person_b_id &&
    (form.type === "parent_of"  ? !!form.parent_subtype  :
     form.type === "spouse_of"  ? !!form.spouse_subtype  :
     form.type === "sibling_of" ? !!form.sibling_subtype : false);

  // Labels dinámicos según tipo
  const labelA =
    form.type === "parent_of"  ? "Padre / Madre" :
    form.type === "sibling_of" ? "Hermano/a A"   : "Persona A";

  const labelB =
    form.type === "parent_of"  ? "Hijo / Hija"   :
    form.type === "sibling_of" ? "Hermano/a B"   : "Persona B";

  const labelConnector =
    form.type === "parent_of"  ? "es padre/madre de"   :
    form.type === "sibling_of" ? "es hermano/a de"      : "está vinculado/a con";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 flex flex-col bg-[#0f0f17] border-l border-violet-accent/20 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-medium text-zinc-50">Nueva relación</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Vincula dos personas del árbol</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Tipo de relación */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Tipo de relación</label>
            <div className="grid grid-cols-3 gap-2">
              {(["parent_of", "sibling_of", "spouse_of"] as RelationshipType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    handleChange({
                      target: { name: "type", value: t },
                    } as React.ChangeEvent<HTMLSelectElement>)
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

          {/* Personas */}
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

          {/* Subtipo */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              {form.type === "parent_of"  ? "Tipo de parentesco" :
               form.type === "sibling_of" ? "Tipo de hermandad"  :
                                            "Estado del vínculo"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {form.type === "parent_of" &&
                (Object.entries(PARENT_SUBTYPE_LABELS) as [ParentSubtype, string][]).map(
                  ([value, label]) => (
                    <SubtypeButton
                      key={value}
                      active={form.parent_subtype === value}
                      onClick={() => setForm((prev) => ({ ...prev, parent_subtype: value, spouse_subtype: "", sibling_subtype: "" }))}
                      label={label}
                    />
                  )
                )}
              {form.type === "spouse_of" &&
                (Object.entries(SPOUSE_SUBTYPE_LABELS) as [SpouseSubtype, string][]).map(
                  ([value, label]) => (
                    <SubtypeButton
                      key={value}
                      active={form.spouse_subtype === value}
                      onClick={() => setForm((prev) => ({ ...prev, spouse_subtype: value, parent_subtype: "", sibling_subtype: "" }))}
                      label={label}
                    />
                  )
                )}
              {form.type === "sibling_of" &&
                (Object.entries(SIBLING_SUBTYPE_LABELS) as [SiblingSubtype, string][]).map(
                  ([value, label]) => (
                    <SubtypeButton
                      key={value}
                      active={form.sibling_subtype === value}
                      onClick={() => setForm((prev) => ({ ...prev, sibling_subtype: value, parent_subtype: "", spouse_subtype: "" }))}
                      label={label}
                    />
                  )
                )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio">
              <Input type="date" name="start_date" value={form.start_date} onChange={handleChange} />
            </Field>
            <Field label="Fecha de fin">
              <Input type="date" name="end_date" value={form.end_date} onChange={handleChange} />
            </Field>
          </div>

          {/* Notas */}
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

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
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
            {isPending ? "Guardando..." : "Crear vínculo"}
          </button>
        </div>
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-accent/50 focus:ring-1 focus:ring-violet-accent/20 transition-colors"
    />
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
      {persons
        .filter((p) => p.id !== exclude)
        .map((p) => (
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