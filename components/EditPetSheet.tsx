"use client";

import { useState, useTransition } from "react";
import { updatePet, type CreatePetInput } from "@/lib/actions/pets";
import type { Species, AdoptionSourceType, Pet } from "@/lib/types";
import { DatePicker } from "./DatePicker";
import { EditPetRelationshipsPanel } from "./EditPetRelationshipsPanel";
import type { Person } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type SheetProps = {
  open: boolean;
  onClose: () => void;
  pet: Pet;
  allPersons: Person[];
  allPets: Pet[];
};

// ============================================================================
// HELPERS
// ============================================================================

function petToFormInput(pet: Pet): CreatePetInput {
  return {
    name: pet.name ?? "",
    nickname: pet.nickname ?? "",
    species: pet.species,
    breed: pet.breed ?? "",
    color: pet.color ?? "",
    gender: pet.gender,
    birth_date: pet.birth_date ?? "",
    birth_place: pet.birth_place ?? "",
    adoption_date: pet.adoption_date ?? "",
    adoption_source: pet.adoption_source ?? "",
    adoption_source_type: pet.adoption_source_type ?? "",
    adoption_notes: pet.adoption_notes ?? "",
    death_date: pet.death_date ?? "",
    death_place: pet.death_place ?? "",
    death_cause: pet.death_cause ?? "",
    memorial_note: pet.memorial_note ?? "",
    favorite_thing: pet.favorite_thing ?? "",
    photo_url: pet.photo_url ?? "",
    bio: pet.bio ?? "",
  };
}

// ============================================================================
// LABELS
// ============================================================================

const SPECIES_LABELS: Record<Species, string> = {
  dog: "🐶 Perro",
  cat: "🐱 Gato",
  bird: "🐦 Ave",
  fish: "🐟 Pez",
  rabbit: "🐰 Conejo",
  rodent: "🐹 Roedor",
  reptile: "🦎 Reptil",
  horse: "🐴 Caballo",
  farm_animal: "🐄 Animal de granja",
  other: "🐾 Otro",
};

const ADOPTION_SOURCE_LABELS: Record<AdoptionSourceType, string> = {
  shelter: "Refugio",
  breeder: "Criador",
  family: "Familia",
  street: "Calle",
  friend: "Amigo/a",
  born_at_home: "Nació en casa",
  other: "Otro",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EditPetSheet({ open, onClose, pet, allPersons, allPets }: SheetProps) {
  const [form, setForm] = useState<CreatePetInput>(() => petToFormInput(pet));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [openSections, setOpenSections] = useState({
    identity: true,
    family: true,
    birth: false,
    adoption: false,
    memory: false,
    death: false,
    photo: false,
  });

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleClose() {
    setForm(petToFormInput(pet));
    setError(null);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updatePet(pet.id, form);
      if (result.success) {
        handleClose();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 flex flex-col bg-[#0f0f17] border-l border-cyan-accent/20 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-medium text-zinc-50">Editar mascota</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Actualiza la información de {pet.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* SECTION 1 — Identity */}
          <Section
            title="Identidad"
            subtitle="Campos principales"
            open={openSections.identity}
            onToggle={() => toggleSection("identity")}
            required
          >
            <Field label="Nombre" required>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="Firulais" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apodo / Alias">
                <Input name="nickname" value={form.nickname} onChange={handleChange} placeholder="Fifi" />
              </Field>
              <Field label="Especie">
                <Select name="species" value={form.species} onChange={handleChange}>
                  {(Object.entries(SPECIES_LABELS) as [Species, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Raza">
                <Input name="breed" value={form.breed} onChange={handleChange} placeholder="Golden Retriever" />
              </Field>
              <Field label="Color">
                <Input name="color" value={form.color} onChange={handleChange} placeholder="Café" />
              </Field>
            </div>
            <Field label="Género">
              <Select name="gender" value={form.gender} onChange={handleChange}>
                <option value="unknown">Sin especificar</option>
                <option value="male">Macho</option>
                <option value="female">Hembra</option>
              </Select>
            </Field>
          </Section>

          {/* SECTION — Family */}
          <Section
            title="Familia"
            subtitle="Personas vinculadas"
            open={openSections.family}
            onToggle={() => toggleSection("family")}
          >
            <EditPetRelationshipsPanel petId={pet.id} allPersons={allPersons} allPets={allPets} />
          </Section>

          {/* SECTION 2 — Birth */}
          <Section
            title="Nacimiento"
            subtitle="Fecha y lugar"
            open={openSections.birth}
            onToggle={() => toggleSection("birth")}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento">
                <DatePicker
                  value={form.birth_date}
                  onChange={(val) => setForm((prev) => ({ ...prev, birth_date: val }))}
                  placeholder="Fecha de nacimiento"
                />
              </Field>
              <Field label="Lugar de nacimiento">
                <Input name="birth_place" value={form.birth_place} onChange={handleChange} placeholder="Ciudad de México" />
              </Field>
            </div>
          </Section>

          {/* SECTION 3 — Adoption */}
          <Section
            title="Adopción"
            subtitle="Cómo llegó a la familia"
            open={openSections.adoption}
            onToggle={() => toggleSection("adoption")}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de adopción">
                <DatePicker
                  value={form.adoption_date}
                  onChange={(val) => setForm((prev) => ({ ...prev, adoption_date: val }))}
                  placeholder="Fecha de adopción"
                />
              </Field>
              <Field label="Tipo de origen">
                <Select name="adoption_source_type" value={form.adoption_source_type} onChange={handleChange}>
                  <option value="">— Selecciona —</option>
                  {(Object.entries(ADOPTION_SOURCE_LABELS) as [AdoptionSourceType, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Origen" hint="Nombre del refugio, criador, etc.">
              <Input name="adoption_source" value={form.adoption_source} onChange={handleChange} placeholder="Refugio Patitas Felices" />
            </Field>
            <Field label="Notas de adopción">
              <Textarea name="adoption_notes" value={form.adoption_notes} onChange={handleChange} rows={2} placeholder="Cómo fue el proceso..." />
            </Field>
          </Section>

          {/* SECTION 4 — Memory & Personality */}
          <Section
            title="Personalidad"
            subtitle="Bio y recuerdos"
            open={openSections.memory}
            onToggle={() => toggleSection("memory")}
          >
            <Field label="Biografía">
              <Textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Una descripción libre..." rows={4} />
            </Field>
            <Field label="Cosa favorita" hint="Comida, juguete, actividad">
              <Input name="favorite_thing" value={form.favorite_thing} onChange={handleChange} placeholder="Perseguir la pelota" />
            </Field>
          </Section>

          {/* SECTION 5 — Death */}
          <Section
            title="Fallecimiento"
            subtitle="Solo si aplica"
            open={openSections.death}
            onToggle={() => toggleSection("death")}
          >
            <Field label="Fecha de fallecimiento">
              <DatePicker
                value={form.death_date}
                onChange={(val) => setForm((prev) => ({ ...prev, death_date: val }))}
                placeholder="Fecha de fallecimiento"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lugar">
                <Input name="death_place" value={form.death_place} onChange={handleChange} placeholder="Ciudad" />
              </Field>
              <Field label="Causa">
                <Input name="death_cause" value={form.death_cause} onChange={handleChange} placeholder="Natural, accidente..." />
              </Field>
            </div>
            <Field label="Nota memorial">
              <Textarea name="memorial_note" value={form.memorial_note} onChange={handleChange} rows={3} placeholder="Un tributo a su memoria..." />
            </Field>
          </Section>

          {/* SECTION 6 — Photo */}
          <Section
            title="Foto"
            subtitle="URL de imagen principal"
            open={openSections.photo}
            onToggle={() => toggleSection("photo")}
          >
            <Field label="URL de foto" hint="Enlace directo a una imagen">
              <Input name="photo_url" value={form.photo_url} onChange={handleChange} placeholder="https://..." />
            </Field>
          </Section>

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
            disabled={isPending || !form.name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-cyan-accent/20 border border-cyan-accent/40 text-cyan-300 hover:bg-cyan-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
  required = false,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="border border-surface-border rounded-xl overflow-visible">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-[#1a1a25] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{title}</span>
          {required && (
            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-accent/10 border border-cyan-accent/20 rounded text-cyan-400">
              requerido
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">{subtitle}</span>
          <span className="text-zinc-500 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="px-4 py-4 space-y-3 bg-[#0f0f17]">{children}</div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
        {label}
        {required && <span className="text-cyan-400">*</span>}
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
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/20 transition-colors"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/20 transition-colors resize-none"
    />
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-cyan-accent/50 focus:ring-1 focus:ring-cyan-accent/20 transition-colors"
    >
      {children}
    </select>
  );
}
