"use client";

import { useState, useTransition } from "react";
import { createPetRelationship, type CreatePetRelationshipInput } from "@/lib/actions/petRelationships";
import type { Person, Pet, PetPersonRelationship } from "@/lib/types";
import { DatePicker } from "./DatePicker";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  open: boolean;
  onClose: () => void;
  persons: Person[];
  pets: Pet[];
  presetPersonId?: string;
  presetPetId?: string;
  onCreated?: () => void;
};

const EMPTY_FORM: CreatePetRelationshipInput = {
  pet_id: "",
  person_id: "",
  relationship: "owner",
  start_date: "",
  end_date: "",
  notes: "",
};

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
// MAIN COMPONENT
// ============================================================================

export function AddPetRelationshipSheet({
  open, onClose, persons, pets, presetPersonId, presetPetId, onCreated,
}: Props) {
  const initialForm: CreatePetRelationshipInput = {
    ...EMPTY_FORM,
    person_id: presetPersonId ?? "",
    pet_id: presetPetId ?? "",
  };

  const [form, setForm] = useState<CreatePetRelationshipInput>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleClose() {
    setForm(initialForm);
    setError(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createPetRelationship(form);
      if (result.success) {
        onCreated?.();
        handleClose();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  const personName = (p: Person) => [p.given_name, p.paternal_surname].filter(Boolean).join(" ");
  const canSubmit = !!form.pet_id && !!form.person_id && !!form.relationship;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 flex flex-col bg-[#0f0f17] border-l border-cyan-accent/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-medium text-zinc-50">Vincular mascota</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Conecta una mascota con una persona</p>
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
          <Field label="Mascota">
            <select
              name="pet_id"
              value={form.pet_id}
              onChange={handleChange}
              disabled={!!presetPetId}
              className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/20 transition-colors disabled:opacity-60"
            >
              <option value="">Selecciona una mascota</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}{pet.nickname ? ` "${pet.nickname}"` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-xs text-zinc-600">vinculada con</span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <Field label="Persona">
            <select
              name="person_id"
              value={form.person_id}
              onChange={handleChange}
              disabled={!!presetPersonId}
              className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/20 transition-colors disabled:opacity-60"
            >
              <option value="">Selecciona una persona</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {personName(p)}{p.nickname ? ` "${p.nickname}"` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">Tipo de vínculo</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(RELATIONSHIP_LABELS) as [PetPersonRelationship, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, relationship: value }))}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors text-left ${
                      form.relationship === value
                        ? "bg-cyan-accent/20 border-cyan-accent/50 text-cyan-300"
                        : "bg-surface-raised border-surface-border text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio">
              <DatePicker
                value={form.start_date}
                onChange={(val) => setForm((prev) => ({ ...prev, start_date: val }))}
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
              className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/20 transition-colors resize-none"
            />
          </Field>

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
            className="px-5 py-2 rounded-lg text-sm font-medium bg-cyan-accent/20 border border-cyan-accent/40 text-cyan-300 hover:bg-cyan-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
