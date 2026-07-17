import { supabase } from '@/lib/supabase';
import type { Person, Pet } from '@/lib/types';
import { HomeClient } from '@/components/HomeClient';
import { RelationshipCard } from '@/components/RelationshipCard';
import { ParentGroupCard } from '@/components/ParentGroupCard';
import { FamilyGroupCard } from '@/components/FamilyGroupCard';
import { groupParentChildRelationships } from '@/lib/relationships/groupParentRelationships';
import { groupRelationships } from '@/lib/relationships/groupRelationships';
import { detectFamilyGroups } from '@/lib/family/detectFamilyGroups';
import { getAllPetRelationships } from '@/lib/actions/petRelationships';
import Link from 'next/link';

// ============================================================================
// HELPERS — pure functions for formatting
// ============================================================================

/** Calculates age in years from a birth date string */
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** Returns initials from a person's given name and paternal surname */
function getInitials(person: Person): string {
  const first = person.given_name?.[0] ?? '';
  const last = person.paternal_surname?.[0] ?? '';
  return (first + last).toUpperCase();
}

/** Formats a date string into a Spanish short format (e.g., "3 ene 2004") */
function formatDateShort(date: string | null): string | null {
  if (!date) return null;
  // Parse as UTC to avoid timezone shifting the day backwards
  const [year, month, day] = date.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// PAGE COMPONENT — Server Component
// ============================================================================

export default async function Home() {
  // Fetch persons, pets y relationships en paralelo
  const [personsResult, petsResult, relationshipsResult, petRelationships] = await Promise.all([
    supabase.from('persons').select('*').order('given_name'),
    supabase.from('pets').select('*').order('name'),
    supabase.from('relationships').select(`
      *,
      person_a:persons!relationships_person_a_id_fkey(id, given_name, paternal_surname, nickname),
      person_b:persons!relationships_person_b_id_fkey(id, given_name, paternal_surname, nickname)
    `).order('created_at', { ascending: false }),
    getAllPetRelationships(),
  ]);

  const persons: Person[] = personsResult.data ?? [];
  const pets: Pet[] = petsResult.data ?? [];
  const relationships = relationshipsResult.data ?? [];
  const parentGroups = groupParentChildRelationships(relationships);
  const nonParentRelationships = relationships.filter((r) => r.type !== 'parent_of');

  const { groups: familyGroups, groupedPersonIds, groupedPetIds } =
    detectFamilyGroups(persons, pets, relationships, petRelationships);
  const loosePersons = persons.filter((p) => !groupedPersonIds.has(p.id));
  const loosePets = pets.filter((p) => !groupedPetIds.has(p.id));
  const error = personsResult.error ?? petsResult.error ?? relationshipsResult.error;

  // Error state — graceful fallback
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-medium text-red-400 mb-2">
            Error al cargar el ecosistema familiar
          </h1>
          <p className="text-zinc-500 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      {/* ====================================================================
          HEADER — minimalist, with pulsing violet anchor
          ==================================================================== */}
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full bg-violet-accent"
            style={{ boxShadow: '0 0 12px rgba(168, 85, 247, 0.6)' }}
          />
          <span className="text-sm font-medium tracking-wide text-zinc-50">
            Family Tree
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/arbol"
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 border border-surface-border bg-surface-raised hover:text-zinc-200 hover:bg-[#1a1a25] transition-colors"
          >
            Ver árbol
          </Link>
          <HomeClient persons={persons} />
        </div>
      </header>

      {/* ====================================================================
          HERO — page title with tracked typography
          ==================================================================== */}
      <section className="mb-12">
        <h1 className="font-historic text-5xl text-zinc-50 mb-2 leading-tight uppercase">
          tu ecosistema familiar
        </h1>
        <p className="text-zinc-500 text-base uppercase tracking-wide">
          una constelación viva de quienes te formaron y acompañan.
        </p>
      </section>

      {/* ====================================================================
          METRICS — 3 surface cards
          ==================================================================== */}
      <section className="grid grid-cols-3 gap-2.5 mb-12">
        <MetricCard label="PERSONAS" value={persons.length} />
        <MetricCard label="MASCOTAS" value={pets.length} />
        <MetricCard label="GENERACIONES" value={persons.length > 0 ? 1 : 0} />
      </section>

      {/* ====================================================================
          PERSONS SECTION
          ==================================================================== */}
      <section className="mb-12">
        <SectionHeader
          title="personas"
          meta={`${persons.length} ${persons.length === 1 ? 'registrada' : 'registradas'}`}
        />
        {persons.length === 0 ? (
          <EmptyState
            accent="violet"
            message="Aún no hay personas registradas."
          />
        ) : (
          <div className="space-y-3">
            {familyGroups.map((group) => (
              <FamilyGroupCard key={group.key} group={group} />
            ))}
            {loosePersons.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        )}
      </section>

      {/* ====================================================================
          RELATIONSHIPS SECTION
          ==================================================================== */}
      <section className="mb-12">
        <SectionHeader
          title="relaciones"
          meta={`${relationships.length} ${relationships.length === 1 ? 'vínculo' : 'vínculos'}`}
        />
        {relationships.length === 0 ? (
          <EmptyState
            accent="violet"
            message="Aún no hay vínculos registrados."
          />
        ) : (
          <div className="space-y-2">
            {parentGroups.map((group) => (
              <ParentGroupCard key={group.children.map((c) => c.person?.id).join("-")} group={group} />
            ))}
            {groupRelationships(nonParentRelationships).map((group) => (
              <RelationshipCard key={group[0].id} relationships={group} />
            ))}
          </div>
        )}
      </section>

      {/* ====================================================================
          PETS SECTION
          ==================================================================== */}
      <section className="mb-12">
        <SectionHeader
          title="mascotas"
          meta={`${pets.length} ${pets.length === 1 ? 'registrada' : 'registradas'}`}
        />
        {loosePets.length === 0 ? (
          <EmptyState
            accent="cyan"
            message="Aún no hay mascotas sueltas fuera de una familia."
          />
        ) : (
          <div className="space-y-3">
            {loosePets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        )}
      </section>

      {/* ====================================================================
          FOOTER — phase indicator + pulsing dots
          ==================================================================== */}
      <footer className="pt-6 border-t border-surface-border/50 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600">
          Fase A · vista de lista · próximo: la red visual
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-accent/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-accent/60" />
        </div>
      </footer>
    </main>
  );
}

// ============================================================================
// SUBCOMPONENTS — local to this file
// ============================================================================

/** Small metric card used in the metrics row */
function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3">
      <div className="text-[11px] tracking-wider text-zinc-500 mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-medium text-zinc-50">{value}</div>
    </div>
  );
}

/** Section header with title + meta */
function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[13px] font-medium tracking-widest uppercase text-zinc-50">
        {title}
      </h2>
      <span className="text-xs text-zinc-600">{meta}</span>
    </div>
  );
}

/** Empty state for sections without data */
function EmptyState({
  accent,
  message,
}: {
  accent: 'violet' | 'cyan';
  message: string;
}) {
  const accentClasses =
    accent === 'violet'
      ? 'border-violet-accent/15'
      : 'border-cyan-accent/15';

  return (
    <div
      className={`bg-surface-raised border ${accentClasses} rounded-2xl p-8 text-center`}
    >
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}

/** Person card with violet accent and Great Vibes nickname */
function PersonCard({ person }: { person: Person }) {
  const age = calculateAge(person.birth_date);
  const birthFormatted = formatDateShort(person.birth_date);
  const initials = getInitials(person);

  return (
    <Link
      href={`/persona/${person.id}`}
      className="relative block bg-surface-raised border border-violet-accent/15 rounded-2xl p-5 overflow-hidden hover:border-violet-accent/30 transition-colors"
    >
      {/* Glowing left bar */}
      <div
        className="absolute top-0 left-0 w-0.75 h-full bg-violet-accent"
        style={{ boxShadow: '0 0 16px rgba(168, 85, 247, 0.5)' }}
      />

      <div className="flex gap-4 items-start">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-violet-accent/15 border border-violet-accent/40 flex items-center justify-center text-violet-300 text-lg font-medium shrink-0">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
            <span className="text-zinc-50 text-base font-medium">
              {person.given_name} {person.paternal_surname} {person.maternal_surname}
            </span>
            {person.nickname && (
              <span
                className="text-xl text-violet-300 leading-none"
                style={{ fontFamily: 'var(--font-script)' }}
              >
                &ldquo;{person.nickname}&rdquo;
              </span>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex gap-3 text-zinc-500 text-xs mb-2 flex-wrap">
            {birthFormatted && <span>📅 {birthFormatted}</span>}
            {person.birth_place && <span>📍 {person.birth_place}</span>}
            {person.languages?.length > 0 && (
              <span>🌐 {person.languages.length} idiomas</span>
            )}
          </div>

          {/* Bio / occupation */}
          {person.occupation && (
            <p className="text-zinc-400 text-sm mb-3 leading-relaxed">
              {person.occupation}
              {person.nationality?.length > 0 && (
                <span className="text-zinc-600">
                  {' · '}
                  {person.nationality.join(', ')}
                </span>
              )}
            </p>
          )}

          {/* Chips */}
          <div className="flex gap-1.5 flex-wrap">
            {age !== null && (
              <span className="px-2.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-[11px] text-violet-300">
                {age} años
              </span>
            )}
            {person.religion && (
              <span className="px-2.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-[11px] text-violet-300">
                {person.religion}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Pet card with cyan accent (placeholder for future use) */
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

function PetCard({ pet }: { pet: Pet }) {
  const age = calculateAge(pet.birth_date);
  const isDeceased = !!pet.death_date;
  const speciesLabel = SPECIES_LABELS[pet.species] ?? pet.species;

  return (
    <Link
      href={`/mascota/${pet.id}`}
      className="relative block bg-surface-raised border border-cyan-accent/15 rounded-2xl p-5 overflow-hidden hover:border-cyan-accent/30 transition-colors"
    >
      <div
        className="absolute top-0 left-0 w-0.75 h-full bg-cyan-accent"
        style={{ boxShadow: '0 0 16px rgba(0, 255, 212, 0.5)' }}
      />
      <div className="flex gap-4 items-start">
        <div className="w-14 h-14 rounded-full bg-cyan-accent/15 border border-cyan-accent/40 flex items-center justify-center text-cyan-300 text-2xl shrink-0">
          🐾
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-zinc-50 text-base font-medium">{pet.name}</span>
            {pet.nickname && (
              <span
                className="text-xl text-cyan-300 leading-none"
                style={{ fontFamily: 'var(--font-script)' }}
              >
                &ldquo;{pet.nickname}&rdquo;
              </span>
            )}
          </div>
          <div className="text-zinc-500 text-xs mb-2">{speciesLabel}</div>
          <div className="flex gap-1.5 flex-wrap">
            {age !== null && (
              <span className="px-2.5 py-0.5 bg-cyan-accent/10 border border-cyan-accent/20 rounded-full text-[11px] text-cyan-300">
                {isDeceased ? `Vivió ${age} años` : `${age} años`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
// RelationshipCard moved to components/RelationshipCard.tsx