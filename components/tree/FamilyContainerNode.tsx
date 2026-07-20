"use client";

import type { FamilyGroup } from "@/lib/family/detectFamilyGroups";

// ============================================================================
// TYPES
// ============================================================================

type FamilyContainerNodeProps = {
  data: {
    group: FamilyGroup;
    width: number;
    height: number;
    onExpand: (key: string) => void;
  };
};

// ============================================================================
// COMPONENT — background container that visually encloses an expanded
// family cluster (parents + children + pets). Purely presentational: the
// actual person/pet nodes are separate React Flow nodes with
// parentId={this node's id} + extent="parent", so they render on top and
// are individually clickable/draggable within these bounds.
// ============================================================================

export function FamilyContainerNode({ data }: FamilyContainerNodeProps) {
  const { group, width, height, onExpand } = data;
  const totalPeople = group.parents.length + group.children.length;

  return (
    <div
      style={{ width, height }}
      className="relative rounded-2xl border border-dashed border-violet-accent/40 bg-violet-accent/[0.04] animate-node-in"
    >
      <button
        type="button"
        onClick={() => onExpand(group.key)}
        className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-violet-accent/30 hover:border-violet-accent/60 hover:bg-violet-accent/10 transition-all duration-200 z-10"
      >
        <span className="text-sm">🏠</span>
        <span className="text-xs font-medium text-zinc-100">{group.name}</span>
        <span className="text-[10px] text-zinc-500">
          {totalPeople} {totalPeople === 1 ? "persona" : "personas"}
          {group.pets.length > 0 && ` · ${group.pets.length} 🐾`}
        </span>
        <span className="text-[10px] text-violet-400 ml-1">▲</span>
      </button>
    </div>
  );
}
