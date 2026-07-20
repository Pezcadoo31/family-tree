"use client";

import Link from "next/link";
import { Handle, Position } from "@xyflow/react";
import type { Person } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type PersonNodeProps = {
  data: {
    person: Person;
    generation: number;
  };
};

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(person: Person): string {
  const first = person.given_name?.[0] ?? "";
  const last = person.paternal_surname?.[0] ?? "";
  return (first + last).toUpperCase();
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PersonNode({ data }: PersonNodeProps) {
  const { person, generation } = data;
  const isDeceased = !!person.death_date;
  const initials = getInitials(person);

  return (
    <>
      <Handle type="target" position={Position.Left} id="target-left" className="bg-violet-accent/50! border-none! w-2! h-2!" />
      <Handle type="target" position={Position.Top} id="target-top" className="bg-violet-accent/50! border-none! w-2! h-2!" />

      <Link
        href={`/persona/${person.id}`}
        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200 w-[200px] hover:scale-[1.03] hover:shadow-lg animate-node-in ${
          isDeceased
            ? "bg-surface-raised border-zinc-700/40 hover:border-zinc-600/60"
            : "bg-surface-raised border-violet-accent/30 hover:border-violet-accent/60"
        }`}
        style={{
          animationDelay: `${generation * 90}ms`,
          boxShadow: isDeceased ? undefined : "0 0 0 rgba(168, 85, 247, 0)",
        }}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            isDeceased
              ? "bg-zinc-700/30 border border-zinc-600/40 text-zinc-400"
              : "bg-violet-accent/15 border border-violet-accent/40 text-violet-300"
          }`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-100 truncate">
            {person.given_name} {person.paternal_surname}
          </p>
          {person.nickname && (
            <p
              className="text-xs text-violet-400 truncate leading-tight"
              style={{ fontFamily: "var(--font-script)" }}
            >
              &ldquo;{person.nickname}&rdquo;
            </p>
          )}
        </div>
      </Link>

      <Handle type="source" position={Position.Right} id="source-right" className="bg-violet-accent/50! border-none! w-2! h-2!" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="bg-violet-accent/50! border-none! w-2! h-2!" />
    </>
  );
}
