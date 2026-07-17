import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRelationships } from "@/lib/actions/relationships";
import { getAllPetRelationships } from "@/lib/actions/petRelationships";
import { detectFamilyGroups } from "@/lib/family/detectFamilyGroups";
import { FamilyTreeView } from "@/components/tree/FamilyTreeView";
import type { Person, Pet } from "@/lib/types";

// ============================================================================
// PAGE — Server Component
// ============================================================================

export default async function ArbolPage() {
  const [personsResult, petsResult, relationships, petRelationships] = await Promise.all([
    supabase.from("persons").select("*").order("given_name"),
    supabase.from("pets").select("*").order("name"),
    getRelationships(),
    getAllPetRelationships(),
  ]);

  const persons: Person[] = personsResult.data ?? [];
  const pets: Pet[] = petsResult.data ?? [];
  const { groups: familyGroups } = detectFamilyGroups(persons, pets, relationships, petRelationships);

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Volver al ecosistema
        </Link>
      </div>

      <section className="mb-8">
        <h1 className="font-historic text-4xl text-zinc-50 mb-2 leading-tight uppercase">
          el árbol
        </h1>
        <p className="text-zinc-500 text-sm uppercase tracking-wide">
          arrastra para explorar, usa scroll o pellizca para zoom.
        </p>
      </section>

      {persons.length === 0 ? (
        <div className="bg-surface-raised border border-violet-accent/15 rounded-2xl p-8 text-center">
          <p className="text-zinc-500 text-sm">Aún no hay personas registradas para mostrar en el árbol.</p>
        </div>
      ) : (
        <FamilyTreeView
          persons={persons}
          pets={pets}
          relationships={relationships}
          petRelationships={petRelationships}
          familyGroups={familyGroups}
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 flex-wrap">
        <LegendItem color="#a855f7" label="Padre / Hijo · Biológico/a" />
        <LegendItem color="#f59e0b" label="Adoptivo/a" dashed />
        <LegendItem color="#ec4899" label="Padrastro/Madrastra" dotted />
        <LegendItem color="#38bdf8" label="Tutor/a temporal" dotted />
        <LegendItem color="#71717a" label="Cónyuge" dashed />
        <LegendItem color="#52525b" label="Hermanos" dotted />
        <LegendItem color="#00c2b0" label="Mascota" />
      </div>
    </main>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function LegendItem({ color, label, dashed, dotted }: { color: string; label: string; dashed?: boolean; dotted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="2" className="shrink-0">
        <line
          x1="0" y1="1" x2="24" y2="1"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray={dashed ? "4 4" : dotted ? "1 4" : undefined}
        />
      </svg>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}
