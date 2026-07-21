import { Handle, Position } from "@xyflow/react";

// ============================================================================
// SiblingJunctionNode — a synthetic, purely visual node representing
// "the group" as a shared convergence point. Not a real person/pet —
// just a small dot where multiple siblings' individual spokes visibly
// meet before a single bridge line continues on to another family.
// React Flow requires every edge to have a real node at each end, so
// this exists to give the convergence point something concrete to
// attach to.
// ============================================================================

export function SiblingJunctionNode() {
  return (
    <>
      <Handle type="target" position={Position.Left} id="target-left" className="opacity-0!" />
      <div className="w-2.5 h-2.5 rounded-full bg-zinc-500/70 border border-zinc-400/40" />
      <Handle type="source" position={Position.Right} id="source-right" className="opacity-0!" />
    </>
  );
}
