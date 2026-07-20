"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PersonNode } from "./PersonNode";
import { PetNode } from "./PetNode";
import { FamilyGroupNode } from "./FamilyGroupNode";
import { FamilyContainerNode } from "./FamilyContainerNode";
import { buildTreeLayout } from "@/lib/tree/buildTreeLayout";
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

    const flowEdges: Edge[] = layout.edges.map((e) => {
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

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-right",
          targetHandle: "target-left",
          type: "smoothstep",
          animated: true,
          style: {
            strokeWidth: 1.5,
            stroke: color,
            strokeDasharray: dashByParentSubtype[subtype],
          },
        };
      }
      if (e.data.kind === "spouse_of") {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-bottom",
          targetHandle: "target-top",
          type: "smoothstep",
          pathOptions: { borderRadius: 8 },
          style: { strokeWidth: 1.5, stroke: "#71717a", strokeDasharray: "4 4" },
        };
      }
      if (e.data.kind === "sibling_of") {
        // Same-container siblings are stacked only ~10px apart — at that
        // length the connector handles at each end already eat almost the
        // whole line, so a dotted pattern has no room to read as "dotted"
        // no matter how it's tuned. Solid relies on the distinct lime
        // color to identify it instead. The dotted pattern is kept for the
        // cross-container case, where there's plenty of length for it.
        const sameContainer = containerByNodeId.get(e.source) === containerByNodeId.get(e.target);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-bottom",
          targetHandle: "target-top",
          type: sameContainer ? "straight" : "smoothstep",
          ...(sameContainer ? {} : { pathOptions: { borderRadius: 8 } }),
          style: {
            strokeWidth: 1.5,
            stroke: "#84cc16",
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
          fitView
          fitViewOptions={{ padding: 0.35, duration: 600 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <FitViewOnGroupToggle trigger={collapsedKeys} />
          <Background color="#2a2a35" gap={24} size={1} />
          <Controls className="!bg-surface-raised !border !border-surface-border [&>button]:!bg-surface-raised [&>button]:!border-surface-border [&>button]:!fill-zinc-400 [&>button:hover]:!bg-[#1a1a25]" />
          <MiniMap
            className="!bg-surface-raised !border !border-surface-border"
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
