import Link from "next/link";
import type { Pet } from "@/lib/types";
import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  pet: Pet;
  petRelationships: PetRelationshipWithRefs[];
};

// ============================================================================
// HELPERS
// ============================================================================

function calculateAge(birthDate: string | null, deathDate: string | null): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const end = deathDate ? (() => {
    const [dy, dm, dd] = deathDate.split('-').map(Number);
    return new Date(dy, dm - 1, dd);
  })() : new Date();

  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDateShort(date: string | null): string | null {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  const isApproximate = day === 1;
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('es-MX', {
    day: isApproximate ? undefined : 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const PET_PERSON_RELATIONSHIP_LABELS: Record<string, string> = {
  owner: "Dueño/a",
  primary_caregiver: "Cuidador/a principal",
  family_pet: "Mascota familiar",
  beloved_by: "Querido/a por",
  adopter: "Adoptante",
};

const SPECIES_LABELS: Record<string, string> = {
  dog: "Perro",
  cat: "Gato",
  bird: "Ave",
  fish: "Pez",
  rabbit: "Conejo",
  rodent: "Roedor",
  reptile: "Reptil",
  horse: "Caballo",
  farm_animal: "Animal de granja",
  other: "Otro",
};

// ============================================================================
// COMPONENT — pure presentational read-view, shared by the full page and
// the floating modal.
// ============================================================================

export function PetProfileContent({ pet, petRelationships }: Props) {
  const age = calculateAge(pet.birth_date, pet.death_date);
  const isDeceased = !!pet.death_date;
  const speciesLabel = SPECIES_LABELS[pet.species] ?? pet.species;

  return (
    <>
      {/* Header card */}
      <div className="relative bg-surface-raised border border-cyan-accent/15 rounded-2xl p-8 mb-8 overflow-hidden">
        <div
          className="absolute top-0 left-0 w-0.75 h-full bg-cyan-accent"
          style={{ boxShadow: '0 0 16px rgba(0, 255, 212, 0.5)' }}
        />

        <div className="flex gap-5 items-start">
          <div className="w-20 h-20 rounded-full bg-cyan-accent/15 border border-cyan-accent/40 flex items-center justify-center text-cyan-300 text-3xl shrink-0">
            🐾
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              <h1 className="text-zinc-50 text-2xl font-medium">{pet.name}</h1>
              {pet.nickname && (
                <span
                  className="text-2xl text-cyan-300 leading-none"
                  style={{ fontFamily: 'var(--font-script)' }}
                >
                  “{pet.nickname}”
                </span>
              )}
            </div>

            <p className="text-zinc-400 text-sm mb-3">
              {speciesLabel}
              {pet.breed && <span className="text-zinc-600"> · {pet.breed}</span>}
              {pet.color && <span className="text-zinc-600"> · {pet.color}</span>}
            </p>

            <div className="flex gap-1.5 flex-wrap">
              {age !== null && (
                <span className="px-2.5 py-0.5 bg-cyan-accent/10 border border-cyan-accent/20 rounded-full text-[11px] text-cyan-300">
                  {isDeceased ? `Vivió ${age} años` : `${age} años`}
                </span>
              )}
              {isDeceased && (
                <span className="px-2.5 py-0.5 bg-zinc-500/10 border border-zinc-500/20 rounded-full text-[11px] text-zinc-400">
                  ✝ Fallecido/a
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nacimiento y fallecimiento */}
      {(pet.birth_date || pet.birth_place || pet.death_date) && (
        <Section title="Nacimiento y fallecimiento">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Nacimiento" value={formatDateShort(pet.birth_date)} />
            <InfoRow label="Lugar" value={pet.birth_place} />
            {isDeceased && (
              <>
                <InfoRow label="Fallecimiento" value={formatDateShort(pet.death_date)} />
                <InfoRow label="Causa" value={pet.death_cause} />
              </>
            )}
          </div>
          {pet.memorial_note && (
            <blockquote className="mt-4 text-zinc-300 text-sm italic border-l-2 border-cyan-accent/40 pl-4">
              “{pet.memorial_note}”
            </blockquote>
          )}
        </Section>
      )}

      {/* Adopción */}
      {(pet.adoption_date || pet.adoption_source) && (
        <Section title="Adopción">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Fecha" value={formatDateShort(pet.adoption_date)} />
            <InfoRow label="Origen" value={pet.adoption_source} />
          </div>
          {pet.adoption_notes && (
            <p className="mt-4 text-zinc-400 text-sm leading-relaxed">{pet.adoption_notes}</p>
          )}
        </Section>
      )}

      {/* Personalidad */}
      {(pet.bio || pet.favorite_thing) && (
        <Section title="Personalidad">
          {pet.favorite_thing && (
            <p className="text-zinc-300 text-sm mb-3">
              <span className="text-zinc-600">Le encanta: </span>
              {pet.favorite_thing}
            </p>
          )}
          {pet.bio && (
            <p className="text-zinc-400 text-sm leading-relaxed">{pet.bio}</p>
          )}
        </Section>
      )}

      {/* Familia */}
      {petRelationships.length > 0 && (
        <Section title="Familia">
          <PetFamilyGroups relationships={petRelationships} />
        </Section>
      )}
    </>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[13px] font-medium tracking-widest uppercase text-zinc-50 mb-4">
        {title}
      </h2>
      <div className="bg-surface-raised border border-surface-border rounded-2xl p-6">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">{label}</div>
      <div className="text-sm text-zinc-200">{value}</div>
    </div>
  );
}

function PetFamilyGroups({ relationships }: { relationships: PetRelationshipWithRefs[] }) {
  const byType = new Map<string, PetRelationshipWithRefs[]>();
  for (const rel of relationships) {
    const list = byType.get(rel.relationship) ?? [];
    list.push(rel);
    byType.set(rel.relationship, list);
  }

  return (
    <div className="space-y-4">
      {Array.from(byType.entries()).map(([type, rels]) => (
        <div key={type}>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
            {PET_PERSON_RELATIONSHIP_LABELS[type] ?? type}
          </div>
          <div className="flex flex-wrap gap-2">
            {rels.map((rel) => {
              if (!rel.person) return null;
              const name = [rel.person.given_name, rel.person.paternal_surname].filter(Boolean).join(' ');
              return (
                <Link
                  key={rel.id}
                  href={`/persona/${rel.person.id}`}
                  className="px-3 py-1.5 bg-cyan-accent/10 border border-cyan-accent/20 rounded-full text-xs text-cyan-300 hover:bg-cyan-accent/20 transition-colors"
                >
                  {name}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
