"use client";

import { useState } from "react";
import Link from "next/link";
import type { FamilyGroup } from "@/lib/family/detectFamilyGroups";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  group: FamilyGroup;
};

// ============================================================================
// HELPERS
// ============================================================================

function personName(p: { given_name: string; paternal_surname: string | null }) {
  return [p.given_name, p.paternal_surname].filter(Boolean).join(" ");
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FamilyGroupCard({ group }: Props) {
  const [expanded, setExpanded] = useState(true);
  const totalCount = group.parents.length + group.children.length;

  return (
    <div className="bg-surface-raised border border-violet-accent/15 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1a1a25] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🏠</span>
          <div>
            <p className="text-sm font-medium text-zinc-100">{group.name}</p>
            {!expanded && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {totalCount} {totalCount === 1 ? "persona" : "personas"}
                {group.pets.length > 0 && ` · ${group.pets.length} ${group.pets.length === 1 ? "mascota" : "mascotas"}`}
              </p>
            )}
          </div>
        </div>
        <span className="text-zinc-500 text-xs shrink-0">{expanded ? "▲ Colapsar" : "▼ Expandir"}</span>
      </button>

      {/* Body — only when expanded */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {group.parents.length > 0 && (
            <MemberRow label="Padres" people={group.parents} />
          )}
          {group.children.length > 0 && (
            <MemberRow label="Hijos" people={group.children} />
          )}
          {group.pets.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Mascotas</div>
              <div className="flex flex-wrap gap-2">
                {group.pets.map((pet) => (
                  <Link
                    key={pet.id}
                    href={`/mascota/${pet.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-accent/10 border border-cyan-accent/20 rounded-full text-xs text-cyan-300 hover:bg-cyan-accent/20 transition-colors"
                  >
                    🐾 {pet.name}
                    {pet.nickname && (
                      <span style={{ fontFamily: "var(--font-script)" }}>&quot;{pet.nickname}&quot;</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENT
// ============================================================================

function MemberRow({
  label,
  people,
}: {
  label: string;
  people: { id: string; given_name: string; paternal_surname: string | null; nickname: string | null }[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <Link
            key={p.id}
            href={`/persona/${p.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-accent/10 border border-violet-accent/20 rounded-full text-xs text-violet-300 hover:bg-violet-accent/20 transition-colors"
          >
            {personName(p)}
            {p.nickname && (
              <span style={{ fontFamily: "var(--font-script)" }}>&quot;{p.nickname}&quot;</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
