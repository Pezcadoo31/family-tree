"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  BaseEdge,
  getSmoothStepPath,
  Position,
  type Node,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PersonNode } from "./PersonNode";
import { PetNode } from "./PetNode";
import { FamilyGroupNode } from "./FamilyGroupNode";
import { FamilyContainerNode } from "./FamilyContainerNode";
import { buildTreeLayout } from "@/lib/tree/buildTreeLayout";
import { NODE_WIDTH, CLUSTER_COLUMN_WIDTH } from "@/lib/family/layoutFamilyCluster";
import type { Person, Pet } from "@/lib/types";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";
import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";
import type { FamilyGroup } from "@/lib/family/detectFamilyGroups";

// ============================================================================
// STATIC CONFIG
// ============================================================================

const nodeTypes = {
  personNode: PersonNode,
  petNode: PetNode,
  familyGroupNode: FamilyGroupNode,
  familyContainerNode: FamilyContainerNode,
};

// ============================================================================
// ParentTrunkEdge — EXPERIMENTAL. Routes same-container parent→child lines
// through a shared vertical "trunk" positioned exactly halfway between the
// parents' column and the children's column. Both parents sit in the same
// column (same X), and all their children sit in the same column too (same
// X) — so that halfway point works out identical for every parent→child
// line in the family, which is what makes the two parents' lines visually
// merge into one trunk before branching out to each child.
// ============================================================================

// Small per-subtype horizontal nudge so two DIFFERENT relationship types
// sharing the same trunk/column don't sit exactly on top of each other —
// same subtype still fuses into one clean line (offset 0, unchanged from
// before), only a different subtype shifts a few px to its own lane.
const PARENT_SUBTYPE_OFFSET: Record<string, number> = {
  biological: 0,
  adoptive: 8,
  step: -8,
  foster: 16,
};
// Wider spacing than the parent-trunk lanes above — this isn't a brief
// kink on a short adjacent line anymore, it's a full parallel lane
// running the height of the sibling trunk, so it needs enough separation
// to read as clearly distinct at normal zoom.
const SIBLING_SUBTYPE_OFFSET: Record<string, number> = {
  full: 0,
  half: 12,
  step: -12,
  adoptive: 24,
};

function ParentTrunkEdge({ sourceX, sourceY, targetX, targetY, style, markerEnd, data }: EdgeProps) {
  const offset = (data as { offset?: number } | undefined)?.offset ?? 0;
  const trunkX = sourceX + (targetX - sourceX) / 2 + offset;
  const path = `M ${sourceX},${sourceY} L ${trunkX},${sourceY} L ${trunkX},${targetY} L ${targetX},${targetY}`;
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}

// Same idea as ParentTrunkEdge, rotated 90°: the shared spine here runs
// VERTICAL (siblings are stacked in one column, not side by side across
// two), positioned via a per-subtype lane offset from the column's own X
// instead of a horizontal midpoint. Consecutive same-subtype edges share
// the exact same trunkX, so their vertical segments line up end-to-end
// and read as one continuous trunk — a different subtype gets its own
// parallel lane instead of overlapping it.
function SiblingTrunkEdge({ sourceX, sourceY, targetX, targetY, style, markerEnd, data }: EdgeProps) {
  const trunkOffset = (data as { trunkOffset?: number } | undefined)?.trunkOffset ?? 0;
  const trunkX = sourceX + trunkOffset;
  const path = `M ${sourceX},${sourceY} L ${trunkX},${sourceY} L ${trunkX},${targetY} L ${targetX},${targetY}`;
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}

// ============================================================================
// CrossClusterEdge — for connections whose two ends live in different
// family containers. The built-in `type: "smoothstep"` string edge only
// exposes { offset, borderRadius, stepPosition } — no absolute centerX —
// so passing centerX through `pathOptions` on that built-in type is
// silently ignored (confirmed against @xyflow/system's
// SmoothStepPathOptions type). getSmoothStepPath() does accept centerX
// directly (confirmed via ParentTrunkEdge) — but a single X turning
// point only relocates WHERE the line changes height, it can't stop the
// line from crossing an unrelated card that happens to share the exact
// same row as one of the endpoints (e.g. a sibling left behind in the
// target's row: no height change is even needed to reach the target, so
// there's no bend to relocate — the straight shot passes right through
// whoever else is in that row).
//
// This instead routes through a "safe lane": a Y clear of every row in
// BOTH containers involved (just above the topmost row or just below
// the bottommost, whichever is the shorter detour from source), so the
// long horizontal leg never travels through a card's row at all. Reads
// { turnX1, turnX2, safeY } from edge `data`, precomputed in
// crossClusterRoute() below. Falls back to a plain smoothstep if that
// data is missing (e.g. neither endpoint is inside a container).
// ============================================================================

function CrossClusterEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const route = data as { turnX1?: number; turnX2?: number; safeY?: number } | undefined;
  if (route?.turnX1 === undefined || route?.turnX2 === undefined || route?.safeY === undefined) {
    const [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition: sourcePosition ?? Position.Right,
      targetX,
      targetY,
      targetPosition: targetPosition ?? Position.Left,
      borderRadius: 8,
    });
    return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
  }
  const { turnX1, turnX2, safeY } = route;
  const path = `M ${sourceX},${sourceY} L ${turnX1},${sourceY} L ${turnX1},${safeY} L ${turnX2},${safeY} L ${turnX2},${targetY} L ${targetX},${targetY}`;
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}

const edgeTypes = {
  parentTrunk: ParentTrunkEdge,
  crossClusterStep: CrossClusterEdge,
  siblingTrunk: SiblingTrunkEdge,
};

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  persons: Person[];
  pets: Pet[];
  relationships: RelationshipWithPersons[];
  petRelationships: PetRelationshipWithRefs[];
  familyGroups: FamilyGroup[];
};

// ============================================================================
// COMPONENT
// ============================================================================

export function FamilyTreeView({ persons, pets, relationships, petRelationships, familyGroups }: Props) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(
    () => new Set(familyGroups.map((g) => g.key))
  );

  function toggleGroup(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const { nodes, edges } = useMemo(() => {
    const layout = buildTreeLayout(
      persons,
      pets,
      relationships,
      petRelationships,
      familyGroups,
      collapsedKeys
    );

    const flowNodes: Node[] = layout.nodes.map((n) => {
      if (n.type === "familyGroupNode") {
        return {
          id: n.id,
          type: n.type,
          position: n.position,
          data: { group: n.data.group, onExpand: toggleGroup },
        };
      }
      if (n.type === "familyContainerNode") {
        return {
          id: n.id,
          type: n.type,
          position: n.position,
          style: n.style,
          data: {
            group: n.data.group,
            width: n.data.width,
            height: n.data.height,
            onExpand: toggleGroup,
          },
        };
      }
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        ...(n.parentId ? { parentId: n.parentId } : {}),
        ...(n.extent ? { extent: n.extent } : {}),
        data:
          n.type === "petNode"
            ? { pet: n.data.pet, generation: n.data.generation }
            : { person: n.data.person, generation: n.data.generation },
      };
    });

    // Sibling/spouse lines route differently depending on distance: a clean
    // short straight line when both people share the same family container
    // (the common case), or an angled route when they've landed in
    // different containers (e.g. a sibling who stayed in their family of
    // origin while the other formed their own household) — so it never has
    // to detour awkwardly for a short adjacent pair, but also never cuts
    // diagonally across unrelated cards for a long-distance one.
    const containerByNodeId = new Map<string, string | undefined>();
    for (const n of layout.nodes) {
      containerByNodeId.set(n.id, n.parentId);
    }

    // For a cross-container connection, force the smoothstep's turning
    // point at the SOURCE container's real right edge (the empty gap
    // between families) instead of letting it default to an arbitrary
    // midpoint that can land right on top of an unrelated sibling's card
    // still inside that same container (e.g. Celia's line to Elida, who
    // moved to Vicencio, was turning mid-way through Bernardina/Eduardo's
    // column). Falls back to the target container's left edge if the
    // source isn't inside a container itself.
    const nodeById = new Map<string, (typeof layout.nodes)[number]>();
    for (const n of layout.nodes) {
      nodeById.set(n.id, n);
    }

    const containerBoundsById = new Map<string, { left: number; right: number; top: number; bottom: number }>();
    for (const n of layout.nodes) {
      if (n.type === "familyContainerNode" && n.style) {
        containerBoundsById.set(n.id, {
          left: n.position.x,
          right: n.position.x + n.style.width,
          top: n.position.y,
          bottom: n.position.y + n.style.height,
        });
      }
    }

    // Route through a "safe lane" instead of picking a single turning
    // point: exit right after the SOURCE's own card (the narrow gutter
    // between its local column and the next one), travel to a Y clear of
    // EVERY row in both containers involved — just above the topmost row
    // or just below the bottommost, whichever is the shorter detour from
    // source — cross at that height, then descend/ascend into the
    // target's row only once there's nothing left to cross. A single X
    // turning point (tried first) only relocates WHERE the line changes
    // height — it can't help when source and target already share a row
    // (no height change needed at all), which is exactly what was
    // happening: Celia and Elida ended up in the same row as Bernardina,
    // so the straight shot between them passed right through her card
    // regardless of any turning point.
    const GUTTER_HALF = (CLUSTER_COLUMN_WIDTH - NODE_WIDTH) / 2;
    const CROSS_CLUSTER_MARGIN = 16;

    function crossClusterRoute(
      source: string,
      target: string,
      laneOffset: number = 0
    ): { turnX1: number; turnX2: number; safeY: number } | undefined {
      // A collapsed group renders as a single pill, not a column of member
      // rows — there's nothing for the safe-lane detour to protect against
      // on that side. Without this check, the OTHER side's real container
      // bounds were still used as a fallback reference (meant for "real
      // container → loose person" cases), so even a connection to a
      // collapsed pill took the same big detour. Bail out here and let
      // CrossClusterEdge fall back to its plain smoothstep instead.
      if (source.startsWith("group-") || target.startsWith("group-")) return undefined;

      const sourceNode = nodeById.get(source);
      const targetNode = nodeById.get(target);
      if (!sourceNode || !targetNode) return undefined;

      const sourceContainerId = containerByNodeId.get(source);
      const targetContainerId = containerByNodeId.get(target);
      const sourceBounds = sourceContainerId ? containerBoundsById.get(sourceContainerId) : undefined;
      const targetBounds = targetContainerId ? containerBoundsById.get(targetContainerId) : undefined;
      if (!sourceBounds && !targetBounds) return undefined;

      // The container's own RIGHT EDGE, not the source's own local column
      // position. A child (rightmost local column) happens to already
      // sit near that edge, so their turn point looked fine before — but
      // a parent (leftmost local column) would only clear ITS OWN column,
      // landing the turn — and the vertical run after it — in the narrow
      // gutter between parents and children, hugging right past the
      // children's cards instead of exiting past the whole family. Every
      // source, regardless of which internal column it starts in, has to
      // reach the container's true edge to cross over anyway.
      const turnX1 = sourceBounds ? sourceBounds.right + GUTTER_HALF : sourceNode.position.x + NODE_WIDTH + GUTTER_HALF;
      const turnX2 = targetBounds
        ? targetBounds.left + targetNode.position.x - GUTTER_HALF
        : targetNode.position.x - GUTTER_HALF;

      // Clear only the SOURCE container's own rows — that's where the
      // "an unrelated sibling shares this row" problem actually
      // originates, and the horizontal safe-lane travel never enters
      // either container's internal column space anyway (turnX1/turnX2
      // sit in the gutter just outside each one). Clearing the TARGET's
      // full span too — as this first did — over-detours whenever the
      // two containers differ a lot in height, since it then has to clear
      // whichever one is taller even when only the source side actually
      // needs it. Falls back to target's bounds only when source isn't
      // inside a container at all.
      const referenceBounds = sourceBounds ?? targetBounds!;
      const aboveY = referenceBounds.top - CROSS_CLUSTER_MARGIN;
      const belowY = referenceBounds.bottom + CROSS_CLUSTER_MARGIN;

      // Lane choice is decided at the CONTAINER level, not per individual
      // member — otherwise two people from the same family (e.g. both
      // parents) heading to the same destination can each pick their
      // OWN nearest lane based on their own row, and end up diverging
      // instead of traveling together as one bundle (this is exactly
      // what was happening: Celia sits near the top of Antonio so her
      // line went "above", Mateo sits near the bottom so his went
      // "below" — same source family, same destination, two different
      // paths). Comparing the two CONTAINERS' centers instead gives one
      // consistent answer for every edge sharing that container pair,
      // regardless of which specific member is the actual source.
      const sourceCenterY = (referenceBounds.top + referenceBounds.bottom) / 2;
      const targetCenterY = targetBounds
        ? (targetBounds.top + targetBounds.bottom) / 2
        : targetNode.position.y;
      const safeY = targetCenterY <= sourceCenterY ? aboveY : belowY;

      // safeY and turnX1 stay IDENTICAL for every edge sharing this same
      // source/target container pair — that's what makes them travel as
      // one visible trunk for the long shared leg, exactly like within a
      // single family. The lane offset only nudges turnX2 — where the
      // line turns to descend into the target — so a different subtype
      // still splits off, but only in a short final fork right before
      // reaching the target, not as two parallel highways for the whole
      // route (which is what offsetting safeY did instead, undoing the
      // "one shared trunk" behavior this was supposed to preserve).
      return { turnX1, turnX2: turnX2 + laneOffset, safeY };
    }

    // A sibling clique stores a pairwise DB row for EVERY combination (a
    // new sibling gets linked individually to everyone already in the
    // group, not just their nearest neighbor) — with 6 siblings that's up
    // to 15 rows. Drawing all of them in the same stacked column is fine
    // when they're all the same subtype (they fuse into one clean line),
    // but once subtypes differ, several overlapping lines pile up in the
    // same band with no way to tell which specific pair each one
    // connects. The adjacent-in-birth-order chain already conveys the
    // full picture — A-B full + B-C half implies A-C is at least half —
    // so only THOSE edges need to render; every "skip" edge between
    // non-adjacent siblings is pure redundant clutter. Restricted to the
    // same-container case, where the stacked-column overlap actually
    // happens; cross-container sibling edges are already sparse.
    // Same redundancy problem as before, but it doesn't stop at a
    // container's edge: a sibling clique stores a DB row for every
    // combination regardless of where each member ends up rendered, so
    // once one sibling (Elida) moves to her own container, EVERY leftover
    // combination row between her and an origin-family sibling was being
    // treated as "cross-container, assume sparse, keep as-is" — when
    // there could be several of those pointing at her, each drawing its
    // own full safe-lane detour stacked on top of the others (that's the
    // giant box: several correct-but-redundant routes overlapping, not
    // one route calculated wrong).
    //
    // Fix: group by the REAL sibling clique (union-find over every
    // sibling_of edge, regardless of container), not by container. Sort
    // each clique by actual birth_date — position.y isn't comparable
    // once members span different containers (nested coordinates are
    // relative to their own container's origin) — and keep only
    // chain-adjacent pairs, same as before, just clique-wide instead of
    // container-wide.
    const siblingEdges = layout.edges.filter((e) => e.data.kind === "sibling_of");

    // Keep only a MINIMUM SPANNING TREE of the real edges that exist —
    // not a chain reconstructed from an external sort. Trying to infer
    // "who's adjacent" via birth_date (or Y position, before that) is
    // fragile: if a date is missing, or the DB's actual sibling_of rows
    // don't happen to connect people in that exact inferred order, the
    // pair we THINK is adjacent may not be a real row at all — so it
    // simply doesn't render, silently dropping a connection that was
    // needed. A spanning tree only ever discards an edge when a DIFFERENT
    // real edge already connects those two people through someone else —
    // so nothing that's actually needed can be lost, and it needs no
    // assumption about container, birth date, or any other ordering.
    const spanningUF = new Map<string, string>();
    function findSpanningRoot(x: string): string {
      if (!spanningUF.has(x)) spanningUF.set(x, x);
      let root = x;
      while (spanningUF.get(root) !== root) root = spanningUF.get(root)!;
      let cur = x;
      while (spanningUF.get(cur) !== root) {
        const next = spanningUF.get(cur)!;
        spanningUF.set(cur, root);
        cur = next;
      }
      return root;
    }

    // Union-Find alone picks edges in whatever order they happen to
    // appear (DB insertion order) — it correctly avoids CYCLES, but has
    // no preference for which valid tree it builds, so it can just as
    // easily keep a long "skip" edge (Eduardo↔Mateo, cutting through 3
    // cards in between) as the short adjacent ones, as long as it
    // connects two components it hasn't joined yet. This is Kruskal's
    // MST algorithm: sort edges by "visual distance" cost first, THEN
    // run the same Union-Find — cheap adjacent-in-column pairs get
    // first pick, so the chain reconstructs itself naturally, and an
    // expensive edge (a big row gap, or crossing containers entirely)
    // only gets used as a last resort when nothing cheaper can connect
    // that part of the clique.
    function siblingEdgeCost(e: (typeof siblingEdges)[number]): number {
      const c1 = containerByNodeId.get(e.source);
      const c2 = containerByNodeId.get(e.target);
      const comparablePositions = c1 === c2; // same container, or both loose top-level
      if (comparablePositions) {
        const y1 = nodeById.get(e.source)?.position.y ?? 0;
        const y2 = nodeById.get(e.target)?.position.y ?? 0;
        return Math.abs(y1 - y2);
      }
      return Number.MAX_SAFE_INTEGER; // cross-container: last resort only
    }

    const sortedSiblingEdges = [...siblingEdges].sort(
      (a, b) => siblingEdgeCost(a) - siblingEdgeCost(b)
    );

    const keepSiblingEdgeId = new Set<string>();
    for (const e of sortedSiblingEdges) {
      const ra = findSpanningRoot(e.source);
      const rb = findSpanningRoot(e.target);
      if (ra !== rb) {
        spanningUF.set(ra, rb);
        keepSiblingEdgeId.add(e.id);
      }
    }

    const flowEdges: Edge[] = layout.edges
      .filter((e) => e.data.kind !== "sibling_of" || keepSiblingEdgeId.has(e.id))
      .map((e) => {
      if (e.data.kind === "parent_of") {
        const subtype = e.data.parentSubtype ?? "biological";

        const dashByParentSubtype: Record<string, string | undefined> = {
          biological: undefined,      // solid line
          adoptive:   "6 3",
          step:       "2 3",
          foster:     "1 3 5 3",
        };
        const colorByParentSubtype: Record<string, string> = {
          biological: "#a855f7", // violet
          adoptive:   "#f59e0b", // amber
          step:       "#ec4899", // pink
          foster:     "#38bdf8", // sky blue
        };
        const color = colorByParentSubtype[subtype] ?? colorByParentSubtype.biological;

        // Same-container parent/child pairs (the common case) sit very
        // close, often several fanning between the same two tight columns
        // (both parents → both children). A straight line lets that read
        // as a clean X-fan, same convention any genealogy chart uses —
        // smoothstep's boxy step routing was tangling those short segments
        // into an overlapping zigzag instead. Cross-container pairs (rare
        // for parent_of, but possible) keep the angled routing so a
        // distant connection still avoids cutting through unrelated cards.
        const sameContainer = containerByNodeId.get(e.source) === containerByNodeId.get(e.target);

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-right",
          targetHandle: "target-left",
          type: sameContainer ? "parentTrunk" : "crossClusterStep",
          // Cross-container parent lines to the same target now share
          // IDENTICAL turnX1/turnX2/safeY regardless of subtype — fully
          // fused, no fork at all. Distinguishing biological vs. step
          // visually here was explicitly traded away in favor of one
          // clean shared connection; each edge keeps its own color in
          // `style` below even though the paths overlap exactly.
          data: sameContainer
            ? { offset: PARENT_SUBTYPE_OFFSET[subtype] ?? 0 }
            : crossClusterRoute(e.source, e.target),
          animated: true,
          style: {
            strokeWidth: 1.5,
            stroke: color,
            strokeDasharray: dashByParentSubtype[subtype],
          },
        };
      }
      if (e.data.kind === "spouse_of") {
        // Same-container couples (the common case) are stacked directly
        // above/below each other — vertical handles give a clean short
        // line. Once the pair crosses into different containers (e.g. one
        // side stayed in their family of origin, collapsed, far from the
        // other), vertical handles force an up-and-over loop that can clip
        // through an unrelated card on the way — horizontal handles face
        // directly toward the target instead.
        const sameContainer = containerByNodeId.get(e.source) === containerByNodeId.get(e.target);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: sameContainer ? "source-bottom" : "source-right",
          targetHandle: sameContainer ? "target-top" : "target-left",
          type: sameContainer ? "straight" : "crossClusterStep",
          data: sameContainer ? undefined : crossClusterRoute(e.source, e.target),
          style: { strokeWidth: 1.5, stroke: "#71717a", strokeDasharray: "4 4" },
        };
      }
      if (e.data.kind === "sibling_of") {
        // Same-container siblings are stacked only ~10px apart — at that
        // length the connector handles at each end already eat almost the
        // whole line, so a dotted pattern has no room to read as "dotted"
        // no matter how it's tuned. Solid relies on color to identify it
        // instead. The dotted pattern is kept for the cross-container
        // case, where there's plenty of length for it. Same reasoning as
        // spouse_of above for the handle switch.
        const sameContainer = containerByNodeId.get(e.source) === containerByNodeId.get(e.target);

        // Distinct color PER sibling subtype — full/half/step/adoptive all
        // read as "sibling" (same family of dash treatment) but shouldn't
        // be visually indistinguishable from one another.
        const colorBySiblingSubtype: Record<string, string> = {
          full:     "#84cc16", // lime
          half:     "#facc15", // yellow
          step:     "#fb7185", // rose
          adoptive: "#818cf8", // indigo
        };
        const color = colorBySiblingSubtype[e.data.siblingSubtype ?? "full"] ?? colorBySiblingSubtype.full;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: sameContainer ? "source-bottom" : "source-right",
          targetHandle: sameContainer ? "target-top" : "target-left",
          type: sameContainer ? "siblingTrunk" : "crossClusterStep",
          data: sameContainer
            ? { trunkOffset: SIBLING_SUBTYPE_OFFSET[e.data.siblingSubtype ?? "full"] ?? 0 }
            : crossClusterRoute(e.source, e.target, SIBLING_SUBTYPE_OFFSET[e.data.siblingSubtype ?? "full"] ?? 0),
          style: {
            strokeWidth: 1.5,
            stroke: color,
            strokeDasharray: sameContainer ? undefined : "1 4",
          },
        };
      }
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: "source-right",
        targetHandle: "target-left",
        type: "default",
        style: { strokeWidth: 1.5, stroke: "#00c2b0" },
      };
      });

    return { nodes: flowNodes, edges: flowEdges };
  }, [persons, pets, relationships, petRelationships, familyGroups, collapsedKeys]);

  return (
    <div className="space-y-3">
      {familyGroups.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {familyGroups.map((g) => {
            const isCollapsed = collapsedKeys.has(g.key);
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => toggleGroup(g.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isCollapsed
                    ? "bg-violet-accent/10 border-violet-accent/30 text-violet-300"
                    : "bg-surface-raised border-surface-border text-zinc-400"
                }`}
              >
                🏠 {g.name} {isCollapsed ? "▼" : "▲"}
              </button>
            );
          })}
        </div>
      )}

      <div className="w-full h-[70vh] rounded-2xl border border-surface-border bg-surface-raised overflow-hidden animate-tree-in">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.35, duration: 600 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <FitViewOnGroupToggle trigger={collapsedKeys} />
          <Background color="#2a2a35" gap={24} size={1} />
          <Controls className="bg-surface-raised! border! border-surface-border! [&>button]:bg-surface-raised! [&>button]:border-surface-border! [&>button]:fill-zinc-400! [&>button:hover]:bg-[#1a1a25]!" />
          <MiniMap
            className="bg-surface-raised! border! border-surface-border!"
            nodeColor="#a855f7"
            maskColor="rgba(10,10,15,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// ============================================================================
// FitViewOnGroupToggle — re-runs fitView whenever a group is expanded or
// collapsed, since React Flow's `fitView` prop only applies on first mount.
// ============================================================================

function FitViewOnGroupToggle({ trigger }: { trigger: Set<string> }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    fitView({ padding: 0.35, duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
}
