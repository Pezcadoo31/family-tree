import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRelationshipsForPerson, type RelationshipWithPersons } from "@/lib/actions/relationships";
import type { Person } from "@/lib/types";
import { PersonProfileActions } from "@/components/PersonProfileActions";

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

function getInitials(person: Person): string {
  const first = person.given_name?.[0] ?? '';
  const last = person.paternal_surname?.[0] ?? '';
  return (first + last).toUpperCase();
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

// ============================================================================
// PAGE — Server Component
// ============================================================================

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonaProfile({ params }: PageProps) {
  const { id } = await params;

  const [personResult, relationships] = await Promise.all([
    supabase.from('persons').select('*').eq('id', id).single(),
    getRelationshipsForPerson(id),
  ]);

  const person: Person | null = personResult.data;

  if (!person) {
    notFound();
  }

  const age = calculateAge(person.birth_date, person.death_date);
  const isDeceased = !!person.death_date;
  const initials = getInitials(person);

  // Clasificar relaciones por tipo y rol
  const parents = relationships.filter(
    (r) => r.type === 'parent_of' && r.person_b_id === person.id
  );
  const children = relationships.filter(
    (r) => r.type === 'parent_of' && r.person_a_id === person.id
  );
  const spouses = relationships.filter((r) => r.type === 'spouse_of');
  const siblings = relationships.filter((r) => r.type === 'sibling_of');

  const otherPerson = (rel: typeof relationships[number]) =>
    rel.person_a_id === person.id ? rel.person_b : rel.person_a;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">

      {/* Back link + actions */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Volver al ecosistema
        </Link>
        <PersonProfileActions person={person} />
      </div>

      {/* Header card */}
      <div className="relative bg-surface-raised border border-violet-accent/15 rounded-2xl p-8 mb-8 overflow-hidden">
        <div
          className="absolute top-0 left-0 w-0.75 h-full bg-violet-accent"
          style={{ boxShadow: '0 0 16px rgba(168, 85, 247, 0.5)' }}
        />

        <div className="flex gap-5 items-start">
          <div className="w-20 h-20 rounded-full bg-violet-accent/15 border border-violet-accent/40 flex items-center justify-center text-violet-300 text-2xl font-medium shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
              <h1 className="text-zinc-50 text-2xl font-medium">
                {person.given_name} {person.paternal_surname} {person.maternal_surname}
              </h1>
              {person.nickname && (
                <span
                  className="text-2xl text-violet-300 leading-none"
                  style={{ fontFamily: 'var(--font-script)' }}
                >
                  “{person.nickname}”
                </span>
              )}
            </div>

            {person.occupation && (
              <p className="text-zinc-400 text-sm mb-3">
                {person.occupation}
                {person.nationality?.length > 0 && (
                  <span className="text-zinc-600"> · {person.nationality.join(', ')}</span>
                )}
              </p>
            )}

            <div className="flex gap-1.5 flex-wrap">
              {age !== null && (
                <span className="px-2.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-[11px] text-violet-300">
                  {isDeceased ? `Vivió ${age} años` : `${age} años`}
                </span>
              )}
              {person.religion && (
                <span className="px-2.5 py-0.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-[11px] text-violet-300">
                  {person.religion}
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
      {(person.birth_date || person.birth_place || person.death_date) && (
        <Section title="Nacimiento y fallecimiento">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Nacimiento" value={formatDateShort(person.birth_date)} />
            <InfoRow label="Lugar" value={person.birth_place} />
            {isDeceased && (
              <>
                <InfoRow label="Fallecimiento" value={formatDateShort(person.death_date)} />
                <InfoRow label="Causa" value={person.death_cause} />
              </>
            )}
          </div>
        </Section>
      )}

      {/* Información personal */}
      {(person.languages?.length > 0 || person.nationality?.length > 0) && (
        <Section title="Información personal">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Idiomas" value={person.languages?.join(', ')} />
            <InfoRow label="Nacionalidad" value={person.nationality?.join(', ')} />
          </div>
        </Section>
      )}

      {/* Historia */}
      {(person.bio || person.notable_quote) && (
        <Section title="Historia">
          {person.notable_quote && (
            <blockquote className="text-zinc-300 text-sm italic border-l-2 border-violet-accent/40 pl-4 mb-3">
              “{person.notable_quote}”
            </blockquote>
          )}
          {person.bio && (
            <p className="text-zinc-400 text-sm leading-relaxed">{person.bio}</p>
          )}
        </Section>
      )}

      {/* Relaciones familiares */}
      {(parents.length > 0 || children.length > 0 || spouses.length > 0 || siblings.length > 0) && (
        <Section title="Familia">
          <div className="space-y-4">
            {parents.length > 0 && (
              <RelationGroup label="Padres" relations={parents} otherPerson={otherPerson} />
            )}
            {children.length > 0 && (
              <RelationGroup label="Hijos" relations={children} otherPerson={otherPerson} />
            )}
            {spouses.length > 0 && (
              <RelationGroup label="Pareja" relations={spouses} otherPerson={otherPerson} />
            )}
            {siblings.length > 0 && (
              <RelationGroup label="Hermanos" relations={siblings} otherPerson={otherPerson} />
            )}
          </div>
        </Section>
      )}
    </main>
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

type PersonRef = { id: string; given_name: string; paternal_surname: string | null; nickname: string | null };

type RelationForGroup = RelationshipWithPersons;

function RelationGroup({
  label,
  relations,
  otherPerson,
}: {
  label: string;
  relations: RelationForGroup[];
  otherPerson: (rel: RelationForGroup) => PersonRef;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {relations.map((rel) => {
          const p = otherPerson(rel);
          const name = [p.given_name, p.paternal_surname].filter(Boolean).join(' ');
          return (
            <Link
              key={rel.id}
              href={`/persona/${p.id}`}
              className="px-3 py-1.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-xs text-violet-300 hover:bg-violet-accent/20 transition-colors"
            >
              {name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
