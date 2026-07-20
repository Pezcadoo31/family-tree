"use client";

import Link from "next/link";
import { Handle, Position } from "@xyflow/react";
import type { Pet } from "@/lib/types";

// ============================================================================
// TYPES
// ============================================================================

type PetNodeProps = {
  data: {
    pet: Pet;
    generation: number;
  };
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PetNode({ data }: PetNodeProps) {
  const { pet, generation } = data;
  const isDeceased = !!pet.death_date;

  return (
    <>
      <Handle type="target" position={Position.Left} id="target-left" className="bg-cyan-accent/50! border-none! w-2! h-2!" />
      <Handle type="target" position={Position.Top} id="target-top" className="bg-cyan-accent/50! border-none! w-2! h-2!" />

      <Link
        href={`/mascota/${pet.id}`}
        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200 w-[200px] hover:scale-[1.03] hover:shadow-lg animate-node-in ${
          isDeceased
            ? "bg-surface-raised border-zinc-700/40 hover:border-zinc-600/60"
            : "bg-surface-raised border-cyan-accent/30 hover:border-cyan-accent/60"
        }`}
        style={{ animationDelay: `${generation * 90}ms` }}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            isDeceased
              ? "bg-zinc-700/30 border border-zinc-600/40 text-zinc-400"
              : "bg-cyan-accent/15 border border-cyan-accent/40 text-cyan-300"
          }`}
        >
          🐾
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-100 truncate">{pet.name}</p>
          {pet.nickname && (
            <p
              className="text-xs text-cyan-400 truncate leading-tight"
              style={{ fontFamily: "var(--font-script)" }}
            >
              &ldquo;{pet.nickname}&rdquo;
            </p>
          )}
        </div>
      </Link>

      <Handle type="source" position={Position.Right} id="source-right" className="bg-cyan-accent/50! border-none! w-2! h-2!" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="bg-cyan-accent/50! border-none! w-2! h-2!" />
    </>
  );
}
