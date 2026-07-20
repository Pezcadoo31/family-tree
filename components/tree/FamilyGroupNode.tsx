"use client";

import { Handle, Position } from "@xyflow/react";
import type { FamilyGroup } from "@/lib/family/detectFamilyGroups";

// ============================================================================
// TYPES
// ============================================================================

type FamilyGroupNodeProps = {
  data: {
    group: FamilyGroup;
    onExpand: (key: string) => void;
  };
};

// ============================================================================
// COMPONENT — collapsed representation of a family cluster
// ============================================================================

export function FamilyGroupNode({ data }: FamilyGroupNodeProps) {
  const { group, onExpand } = data;
  const totalPeople = group.parents.length + group.children.length;

  return (
    <>
      <Handle type="target" position={Position.Left} id="target-left" className="bg-violet-accent/50! border-none! w-2! h-2!" />
      <Handle type="target" position={Position.Top} id="target-top" className="bg-violet-accent/50! border-none! w-2! h-2!" />

      <button
        type="button"
        onClick={() => onExpand(group.key)}
        className="group flex flex-col gap-1 px-4 py-3 rounded-xl border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-all duration-200 w-[220px] hover:scale-[1.02] text-left animate-node-in"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏠</span>
          <span className="text-sm font-medium text-zinc-100 truncate">{group.name}</span>
        </div>
        <p className="text-xs text-zinc-500">
          {totalPeople} {totalPeople === 1 ? "persona" : "personas"}
          {group.pets.length > 0 && ` · ${group.pets.length} 🐾`}
        </p>
        <p className="text-[10px] text-violet-400 mt-0.5">Click para expandir</p>
      </button>

      <Handle type="source" position={Position.Right} id="source-right" className="bg-violet-accent/50! border-none! w-2! h-2!" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="bg-violet-accent/50! border-none! w-2! h-2!" />
    </>
  );
}
