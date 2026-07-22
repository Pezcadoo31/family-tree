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
import { SiblingJunctionNode } from "./SiblingJunctionNode";
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
  siblingJunctionNode: SiblingJunctionNode,
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
// same row as one of the endpoints.
//
// That row-crossing risk is why this used to detour through a "safe
// lane" Y clear of every row in both containers before crossing over —
// but that's no longer needed now that turnX1 exits at the SOURCE
// CONTAINER'S OWN right edge (not a local column position inside it):
// every source, regardless of which internal column it starts in,
// already clears every card in its own family before the horizontal
// leg even begins. The horizontal leg then travels entirely through the
// empty gap between the two containers — nothing lives there to cross,
// at any Y — so the extra vertical detour was pure overhead. Reads
// { turnX1, turnX2 } from edge `data`, precomputed in crossClusterRoute()
// below. Falls back to a plain smoothstep if that data is missing (e.g.
// neither endpoint is inside a container).
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
  const route = data as
    | { turnX1?: number; turnX2?: number; junctionY?: number; sourceGutterX?: number; sourceSafeY?: number }
    | undefined;
  if (route?.turnX1 === undefined || route?.turnX2 === undefined) {
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
  const { turnX1, turnX2, junctionY, sourceGutterX, sourceSafeY } = route;
  // The initial exit must always move the line AWAY from source (right,
  // toward turnX1) — never backward. turnX1 normally sits well past the
  // source (a real card), so this is a no-op for every ordinary edge.
  // But the sibling hub's junction node has its own source-right handle
  // positioned slightly to the RIGHT of the node's own X (React Flow
  // places Position.Left and Position.Right handles at opposite edges of
  // a node's box) — for that one bridge edge, sourceX can end up already
  // past turnX1, and tracing to turnX1 from there means briefly doubling
  // back leftward first. That backward blip was the stray loose segment.
  // Clamping to whichever is further out removes it without touching
  // node sizing (which turned out to make React Flow silently stop
  // rendering connected edges below a measurable size — confirmed via
  // DOM diffing, not a fix worth relying on).
  const exitX1 = Math.max(turnX1, sourceX);

  // Build the path as an ordered list of waypoints instead of nested
  // ternaries — the safe-exit detour (gutter hop + rise clear of the
  // source container) is now an optional prefix that composes cleanly
  // with whichever route the rest of the path already takes.
  const points: [number, number][] = [[sourceX, sourceY]];
  if (sourceGutterX !== undefined && sourceSafeY !== undefined) {
    points.push([sourceGutterX, sourceY]);
    points.push([sourceGutterX, sourceSafeY]);
    points.push([exitX1, sourceSafeY]);
  } else {
    points.push([exitX1, sourceY]);
  }
  // The vertical change to the target's row must happen HERE, at exitX1,
  // before ever moving toward turnX2 — this is the point that went
  // missing in the array rewrite (the original template-string path had
  // it as `L ${exitX1},${targetY}`, right after the exit segment). Without
  // it, the path jumped straight from exitX1 to turnX2 while ALSO
  // changing Y in the same segment — a diagonal, not the intended
  // right-angle turn.
  if (junctionY !== undefined) {
    points.push([exitX1, junctionY]);
    points.push([turnX2, junctionY]);
  } else {
    points.push([exitX1, targetY]);
  }
  points.push([turnX2, targetY]);
  points.push([targetX, targetY]);

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}

// Straight two-segment step for sibling hub spokes: exit horizontally to
// the junction's own X (== targetX, since the invisible junction node
// sits exactly at turnX1), then a vertical run at THAT shared X into the
// junction. Guarantees every spoke bends at the identical X regardless
// of how far its member's row is from the junction — the built-in
// `type: "smoothstep"` was picking its own bend point per edge
// independently, so spokes from far-away rows (Eduardo, Mateo) could
// overshoot past where the others converged.
function SiblingSpokeEdge({ sourceX, sourceY, targetX, targetY, style, markerEnd }: EdgeProps) {
  const path = `M ${sourceX},${sourceY} L ${targetX},${sourceY} L ${targetX},${targetY}`;
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}

const edgeTypes = {
  parentTrunk: ParentTrunkEdge,
  crossClusterStep: CrossClusterEdge,
  siblingTrunk: SiblingTrunkEdge,
  siblingSpoke: SiblingSpokeEdge,
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

    // ==========================================================================
    // Collapsed-pair relationship priority — when BOTH families involved in
    // a relationship are collapsed to a pill, showing every real DB row
    // between them (spouse + each parent_of + each sibling_of + every pet)
    // clutters the diagram fast as the tree grows. Instead, show exactly
    // ONE line per pair of pills: whichever relationship kind ranks
    // highest below. This is purely visual — no relationship is deleted or
    // altered, and expanding EITHER family restores every real connection
    // (this filter only ever matches when both endpoints are still
    // "group-" pills, which stops being true the instant one expands).
    //
    // To add a new relationship kind later: add one line here with its
    // rank. Unlisted kinds sort last automatically (nullish fallback), so
    // nothing breaks if a kind is added elsewhere before its priority is.
    // ==========================================================================
    const COLLAPSED_PAIR_PRIORITY: Record<string, number> = {
      spouse_of: 1,
      parent_of: 2,
      sibling_of: 3,
      pet_relationship: 4,
    };
    function collapsedPairPriority(kind: string): number {
      return COLLAPSED_PAIR_PRIORITY[kind] ?? 99;
    }
    function collapsedPairKey(a: string, b: string): string {
      return [a, b].sort().join("::");
    }

    const collapsedPairWinnerId = new Map<string, string>();
    const collapsedPairBestPriority = new Map<string, number>();
    for (const e of layout.edges) {
      if (!e.source.startsWith("group-") || !e.target.startsWith("group-")) continue;
      if (e.source === e.target) continue;
      const key = collapsedPairKey(e.source, e.target);
      const priority = collapsedPairPriority(e.data.kind);
      const currentBest = collapsedPairBestPriority.get(key);
      if (currentBest === undefined || priority < currentBest) {
        collapsedPairBestPriority.set(key, priority);
        collapsedPairWinnerId.set(key, e.id);
      }
    }
    function isSuppressedByCollapsedPairPriority(e: (typeof layout.edges)[number]): boolean {
      if (!e.source.startsWith("group-") || !e.target.startsWith("group-")) return false;
      return collapsedPairWinnerId.get(collapsedPairKey(e.source, e.target)) !== e.id;
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

    // Exit right after the SOURCE CONTAINER'S OWN right edge (not a local
    // column position inside it — every member, whether parent or child,
    // clears the whole family this way, not just their own column) and
    // enter just before the target container's left edge. The whole
    // horizontal + vertical journey between those two points travels
    // through the empty gap between families — nowhere a card could be —
    // so no extra "safe lane" detour is needed to dodge anything; turnX1
    // and turnX2 alone are already enough to guarantee a clean path.
    const GUTTER_HALF = (CLUSTER_COLUMN_WIDTH - NODE_WIDTH) / 2;
    const SOURCE_CLEAR_MARGIN = 16;

    function crossClusterRoute(
      source: string,
      target: string,
      laneOffset: number = 0,
      sourceLaneOffset: number = 0
    ): { turnX1: number; turnX2: number; sourceGutterX: number; sourceSafeY: number } | undefined {
      // A collapsed group renders as a single pill, not a column of member
      // rows — there's no gutter to route through on that side. Bail out
      // here and let CrossClusterEdge fall back to its plain smoothstep
      // instead.
      if (source.startsWith("group-") || target.startsWith("group-")) return undefined;

      const sourceNode = nodeById.get(source);
      const targetNode = nodeById.get(target);
      if (!sourceNode || !targetNode) return undefined;

      const sourceContainerId = containerByNodeId.get(source);
      const targetContainerId = containerByNodeId.get(target);
      const sourceBounds = sourceContainerId ? containerBoundsById.get(sourceContainerId) : undefined;
      const targetBounds = targetContainerId ? containerBoundsById.get(targetContainerId) : undefined;
      if (!sourceBounds && !targetBounds) return undefined;

      const turnX1 = sourceBounds ? sourceBounds.right + GUTTER_HALF : sourceNode.position.x + NODE_WIDTH + GUTTER_HALF;
      const turnX2 = targetBounds
        ? targetBounds.left + targetNode.position.x - GUTTER_HALF
        : targetNode.position.x - GUTTER_HALF;

      // A straight exit at the source's own row can cut through an
      // unrelated card in a DIFFERENT local column (e.g. a parent's row
      // coinciding, by pure coincidence of independent per-column
      // stacking, with a sibling's row in the children column) on its way
      // to turnX1 — confirmed via fiber: Mateo's row landed exactly on
      // Mayra's. Route around it: hop into the narrow gutter right after
      // the source's OWN local column (safe — before entering any other
      // column's X range), rise/fall clear of every row in the whole
      // source container, THEN travel the long stretch to turnX1 at that
      // safe height. Always exits toward the top — a fixed, member-
      // independent choice, so every edge from this same container still
      // travels together for their shared leg regardless of which
      // specific person is the source.
      // sourceLaneOffset gives the escape point its OWN lane, distinct
      // from wherever this same source's SAME-container trunk (e.g.
      // Mateo's fan-out to his own biological children) already runs —
      // otherwise a cross-container line to a stepchild leaves through
      // nearly the same spot as the trunk to his legitimate children,
      // reading as one tangled bundle right at the source card. Unlike
      // laneOffset (which nudges turnX2, near the TARGET), this only
      // affects the exit near the SOURCE — the shared travel-together
      // behavior with another parent heading to the same target
      // (turnX1/turnX2) is untouched.
      const sourceGutterX = sourceBounds
        ? sourceBounds.left + sourceNode.position.x + NODE_WIDTH + GUTTER_HALF + sourceLaneOffset
        : turnX1;

      // Which margin to clear (above vs below the source container)
      // depends on where the TARGET actually sits — not a fixed "always
      // above" choice. A fixed choice made every edge from the same
      // source look identical regardless of destination (Mateo's line to
      // Eduardo and his line to Elida shared the exact same exit and
      // barely diverged until the very last stretch, even though they
      // head to two unrelated families). Basing it on the target's
      // position gives genuine separation for different destinations —
      // while still fusing correctly for the SAME destination, since two
      // sources sharing one target (Celia and Mateo, both to Elida) will
      // always compute the identical answer here.
      const sourceCenterY = sourceBounds ? (sourceBounds.top + sourceBounds.bottom) / 2 : sourceNode.position.y;
      const targetCenterY = targetBounds ? (targetBounds.top + targetBounds.bottom) / 2 : targetNode.position.y;
      const aboveY = sourceBounds ? sourceBounds.top - SOURCE_CLEAR_MARGIN : sourceNode.position.y;
      const belowY = sourceBounds ? sourceBounds.bottom + SOURCE_CLEAR_MARGIN : sourceNode.position.y;
      const sourceSafeY = targetCenterY <= sourceCenterY ? aboveY : belowY;

      // turnX1 stays IDENTICAL for every edge sharing this same
      // source/target container pair — that's what makes them travel as
      // one visible trunk for the shared leg, exactly like within a
      // single family. The lane offset only nudges turnX2 — where the
      // line turns to descend into the target — so a different subtype
      // still splits off, but only in a short final fork right before
      // reaching the target.
      return { turnX1, turnX2: turnX2 + laneOffset, sourceGutterX, sourceSafeY };
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

    // Vertical center of EVERY sibling-clique member who shares nodeId's
    // container — run AFTER the spanning tree loop above so union-find
    // roots are fully settled. Used so a cross-container sibling
    // connection travels through the family's shared midpoint instead of
    // whichever specific member happened to win the MST's arbitrary tie
    // (Guadalupe, right now) — the crossing should read as coming from
    // the group, not from one person in particular.
    function containerJunctionY(nodeId: string): number | undefined {
      const containerId = containerByNodeId.get(nodeId);
      const bounds = containerId ? containerBoundsById.get(containerId) : undefined;
      if (!containerId || !bounds) return undefined;

      const root = findSpanningRoot(nodeId);
      const ys: number[] = [];
      const seen = new Set<string>();
      for (const e of siblingEdges) {
        for (const candidate of [e.source, e.target]) {
          if (seen.has(candidate)) continue;
          if (containerByNodeId.get(candidate) === containerId && findSpanningRoot(candidate) === root) {
            const y = nodeById.get(candidate)?.position.y;
            if (y !== undefined) ys.push(y);
            seen.add(candidate);
          }
        }
      }
      if (ys.length === 0) return undefined;
      return bounds.top + (Math.min(...ys) + Math.max(...ys)) / 2;
    }

    // For a sibling clique with real cross-container connections, build
    // a visible "hub" — ONE PER SOURCE FAMILY, not one per (source,
    // destination) pair. A source family can bridge to MULTIPLE
    // different destination families at once (e.g. one sibling moved to
    // family B, another to family C) — treating each destination as its
    // own separate hub duplicated the same junction and the same spokes
    // once per destination, since junction position only ever depended
    // on the source family, never the target. With two destinations that
    // meant two junctions stacked exactly on top of each other and 8
    // spoke lines converging where only 4 unique members exist. Grouping
    // by source family first fixes that: one junction, one spoke per
    // member (drawn once, colored by whichever of their real
    // relationships connects to this hub), and one combined bridge line
    // per distinct destination fanning out from that same shared point.
    const crossContainerSiblingEdges = siblingEdges.filter(
      (e) => keepSiblingEdgeId.has(e.id) && containerByNodeId.get(e.source) !== containerByNodeId.get(e.target)
    );

    const colorBySiblingSubtype: Record<string, string> = {
      full: "#84cc16",
      half: "#facc15",
      step: "#fb7185",
      adoptive: "#818cf8",
    };

    const junctionNodes: Node[] = [];
    const junctionEdges: Edge[] = [];
    const suppressedSiblingEdgeIds = new Set<string>();

    const crossEdgesBySourceContainer = new Map<string, typeof crossContainerSiblingEdges>();
    for (const e of crossContainerSiblingEdges) {
      const sourceContainerId = containerByNodeId.get(e.source);
      if (!sourceContainerId) continue;
      const list = crossEdgesBySourceContainer.get(sourceContainerId) ?? [];
      list.push(e);
      crossEdgesBySourceContainer.set(sourceContainerId, list);
    }

    for (const [sourceContainerId, edgesFromThisSource] of crossEdgesBySourceContainer.entries()) {
      for (const e of edgesFromThisSource) suppressedSiblingEdgeIds.add(e.id);

      const bounds = containerBoundsById.get(sourceContainerId);
      if (!bounds) continue;

      // NOTE: same-container edges among hub members are deliberately
      // NOT suppressed here (an earlier version of this code did, and it
      // was wrong). A member's spoke to the junction represents THEIR
      // relationship to the EXTERNAL destination (e.g. Bernardina→Eduardo,
      // genuinely "half") — that is a completely different, independently
      // true relationship from her internal same-container sibling chain
      // (Bernardina↔Guadalupe↔Mayra↔Mateo, genuinely "full"). They aren't
      // redundant just because they touch the same person; hiding the
      // internal chain was silently discarding a correct "full siblings"
      // relationship in order to avoid a duplication that was never
      // actually there — confirmed against real stored sibling_subtype
      // rows, not assumed.
      const root = findSpanningRoot(edgesFromThisSource[0].source);
      const members = new Set<string>();
      for (const e of siblingEdges) {
        for (const cand of [e.source, e.target]) {
          if (containerByNodeId.get(cand) === sourceContainerId && findSpanningRoot(cand) === root) {
            members.add(cand);
          }
        }
      }
      if (members.size === 0) continue;

      const junctionY = containerJunctionY(edgesFromThisSource[0].source) ?? (bounds.top + bounds.bottom) / 2;
      const turnX1 = bounds.right + GUTTER_HALF;
      const junctionId = `sibling-junction-${sourceContainerId}`;

      junctionNodes.push({
        id: junctionId,
        type: "siblingJunctionNode",
        position: { x: turnX1, y: junctionY },
        data: {},
      });

      // Every distinct destination this source family bridges to, in
      // this render — used both to pick each member's representative
      // color and to know how many bridge lines to fan out below.
      const hubTargets = new Set(edgesFromThisSource.map((e) => e.target));

      for (const memberId of members) {
        const representativeEdge = siblingEdges.find(
          (e) =>
            (e.source === memberId && hubTargets.has(e.target)) ||
            (e.target === memberId && hubTargets.has(e.source))
        );
        if (!representativeEdge) continue; // no real row to any hub destination — don't invent one
        const subtype = representativeEdge.data.siblingSubtype ?? "full";
        junctionEdges.push({
          id: `${junctionId}-spoke-${memberId}`,
          source: memberId,
          target: junctionId,
          sourceHandle: "source-right",
          targetHandle: "target-left",
          type: "siblingSpoke",
          style: {
            strokeWidth: 1.5,
            stroke: colorBySiblingSubtype[subtype] ?? colorBySiblingSubtype.full,
            strokeDasharray: "1 4",
          },
        });
      }

      const distinctTargetEdges = new Map<string, (typeof edgesFromThisSource)[number]>();
      for (const e of edgesFromThisSource) {
        if (!distinctTargetEdges.has(e.target)) distinctTargetEdges.set(e.target, e);
      }

      for (const [target, crossEdge] of distinctTargetEdges.entries()) {
        const targetContainerId = containerByNodeId.get(target);
        const targetBounds = targetContainerId ? containerBoundsById.get(targetContainerId) : undefined;
        const targetNode = nodeById.get(target);
        const bridgeSubtype = crossEdge.data.siblingSubtype ?? "full";
        // This bridge is a SIBLING connection, not a parent one — it was
        // never asked to fuse with a parent's line into the same person
        // (only parent-with-parent was asked to fuse). Without its own
        // subtype lane here, it defaulted to the exact same zero-offset
        // entry point parent_of intentionally uses, so a sibling bridge
        // and a parent line converging on the same person could land on
        // an identical final approach.
        const turnX2 = targetNode
          ? (targetBounds
              ? targetBounds.left + targetNode.position.x - GUTTER_HALF
              : targetNode.position.x - GUTTER_HALF) + (SIBLING_SUBTYPE_OFFSET[bridgeSubtype] ?? 0)
          : turnX1;

        junctionEdges.push({
          id: `${crossEdge.id}-bridge`,
          source: junctionId,
          target,
          sourceHandle: "source-right",
          targetHandle: "target-left",
          type: "crossClusterStep",
          data: { turnX1, turnX2 },
          style: {
            strokeWidth: 1.5,
            stroke: colorBySiblingSubtype[bridgeSubtype] ?? colorBySiblingSubtype.full,
            strokeDasharray: "1 4",
          },
        });
      }
    }

    const flowEdges: Edge[] = layout.edges
      .filter((e) => e.data.kind !== "sibling_of" || (keepSiblingEdgeId.has(e.id) && !suppressedSiblingEdgeIds.has(e.id)))
      .filter((e) => !isSuppressedByCollapsedPairPriority(e))
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
        // undefined === undefined is true in JS — two collapsed pills (or
        // any two nodes with no real container) would otherwise be
        // wrongly treated as "the same family" just because BOTH lack a
        // container, instead of correctly being treated as unrelated.
        // Require an actual shared, defined container id.
        const sourceContainer1 = containerByNodeId.get(e.source);
        const targetContainer1 = containerByNodeId.get(e.target);
        const sameContainer = sourceContainer1 !== undefined && sourceContainer1 === targetContainer1;

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
            : crossClusterRoute(e.source, e.target, undefined, PARENT_SUBTYPE_OFFSET[subtype] ?? 0),
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
        // Same false-positive as parent_of above: two collapsed pills
        // both lack a container, so undefined === undefined was making
        // them read as "the same family" — this is exactly what produced
        // the raw diagonal line cutting across unrelated pills.
        const sourceContainer2 = containerByNodeId.get(e.source);
        const targetContainer2 = containerByNodeId.get(e.target);
        const sameContainer = sourceContainer2 !== undefined && sourceContainer2 === targetContainer2;
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
        // Same false-positive as parent_of/spouse_of above.
        const sourceContainer3 = containerByNodeId.get(e.source);
        const targetContainer3 = containerByNodeId.get(e.target);
        const sameContainer = sourceContainer3 !== undefined && sourceContainer3 === targetContainer3;

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
            : {
                ...crossClusterRoute(e.source, e.target, SIBLING_SUBTYPE_OFFSET[e.data.siblingSubtype ?? "full"] ?? 0),
                junctionY: containerJunctionY(e.source),
              },
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

    return { nodes: [...flowNodes, ...junctionNodes], edges: [...flowEdges, ...junctionEdges] };
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
