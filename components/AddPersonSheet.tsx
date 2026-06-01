"use client";

import { useState, useTransition } from "react";
import { createPerson, type CreatePersonInput } from "@/lib/actions/persons";
import type { Gender } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type SheetProps = {
  open: boolean;
  onClose: () => void;
};

const EMPTY_FORM: CreatePersonInput = {
  given_name: "",
  paternal_surname: "",
  maternal_surname: "",
  maiden_name: "",
  birth_name: "",
  nickname: "",
  gender: "unspecified" as Gender,
  birth_date: "",
  birth_place: "",
  occupation: "",
  religion: "",
  nationality: "",
  languages: "",
  bio: "",
  notable_quote: "",
  death_date: "",
  death_place: "",
  death_cause: "",
  photo_url: "",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddPersonSheet({ open, onClose }: SheetProps) {
  const [form, setForm] = useState<CreatePersonInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [openSections, setOpenSections] = useState({
    identity: true,
    birth: true,
    personal: false,
    history: false,
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
    setForm(EMPTY_FORM);
    setError(null);
    setOpenSections({ identity: true, birth: true, personal: false, history: false, death: false, photo: false });
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPerson(form);
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
      <div className="fixed top-0 right-0 h-full w-full max-w-lg z-50 flex flex-col bg-[#0f0f17] border-l border-violet-accent/20 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div>
            <h2 className="text-base font-medium text-zinc-50">Nueva persona</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Solo el nombre es obligatorio</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* SECTION 1 — Identity */}
          <Section
            title="Identidad"
            subtitle="Campos principales"
            open={openSections.identity}
            onToggle={() => toggleSection("identity")}
            required
          >
            <Field label="Nombre(s)" required>
              <Input name="given_name" value={form.given_name} onChange={handleChange} placeholder="Abdiel" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apellido paterno">
                <Input name="paternal_surname" value={form.paternal_surname} onChange={handleChange} placeholder="Vicencio" />
              </Field>
              <Field label="Apellido materno">
                <Input name="maternal_surname" value={form.maternal_surname} onChange={handleChange} placeholder="Antonio" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apodo / Alias">
                <Input name="nickname" value={form.nickname} onChange={handleChange} placeholder="Pez" />
              </Field>
              <Field label="Género">
                <Select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="unspecified">Sin especificar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="non_binary">No binario</option>
                  <option value="other">Otro</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre de soltera / soltero">
                <Input name="maiden_name" value={form.maiden_name} onChange={handleChange} placeholder="Apellido antes de casarse" />
              </Field>
              <Field label="Nombre de nacimiento">
                <Input name="birth_name" value={form.birth_name} onChange={handleChange} placeholder="Si cambió de nombre" />
              </Field>
            </div>
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
                <Input type="date" name="birth_date" value={form.birth_date} onChange={handleChange} />
              </Field>
              <Field label="Lugar de nacimiento">
                <Input name="birth_place" value={form.birth_place} onChange={handleChange} placeholder="Durango, Durango" />
              </Field>
            </div>
          </Section>

          {/* SECTION 3 — Personal */}
          <Section
            title="Información personal"
            subtitle="Profesión, idiomas y más"
            open={openSections.personal}
            onToggle={() => toggleSection("personal")}
          >
            <Field label="Ocupación">
              <Input name="occupation" value={form.occupation} onChange={handleChange} placeholder="Ingeniero en Robótica" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Religión">
                <Input name="religion" value={form.religion} onChange={handleChange} placeholder="Cristiana" />
              </Field>
              <Field label="Nacionalidad(es)">
                <Input name="nationality" value={form.nationality} onChange={handleChange} placeholder="Mexicana, Española" />
              </Field>
            </div>
            <Field label="Idiomas" hint="Separados por coma">
              <Input name="languages" value={form.languages} onChange={handleChange} placeholder="Español, Inglés" />
            </Field>
          </Section>

          {/* SECTION 4 — History */}
          <Section
            title="Historia"
            subtitle="Bio y cita memorable"
            open={openSections.history}
            onToggle={() => toggleSection("history")}
          >
            <Field label="Biografía">
              <Textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Una descripción libre..." rows={4} />
            </Field>
            <Field label="Cita memorable">
              <Input name="notable_quote" value={form.notable_quote} onChange={handleChange} placeholder="Su frase favorita" />
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
              <Input type="date" name="death_date" value={form.death_date} onChange={handleChange} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lugar">
                <Input name="death_place" value={form.death_place} onChange={handleChange} placeholder="Ciudad, País" />
              </Field>
              <Field label="Causa">
                <Input name="death_cause" value={form.death_cause} onChange={handleChange} placeholder="Natural, accidente..." />
              </Field>
            </div>
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
        </form>

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
            type="button" onClick={handleSubmit}
            disabled={isPending || !form.given_name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-accent/20 border border-violet-accent/40 text-violet-300 hover:bg-violet-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Guardando..." : "Guardar persona"}
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
    <div className="border border-surface-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-[#1a1a25] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{title}</span>
          {required && (
            <span className="text-[10px] px-1.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded text-violet-400">
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
        {required && <span className="text-violet-400">*</span>}
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

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-accent/50 focus:ring-1 focus:ring-violet-accent/20 transition-colors resize-none"
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
      className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-violet-accent/50 focus:ring-1 focus:ring-violet-accent/20 transition-colors"
    >
      {children}
    </select>
  );
}
