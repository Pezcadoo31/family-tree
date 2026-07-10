"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PersonNode } from "./PersonNode";
import { PetNode } from "./PetNode";
import { buildTreeLayout } from "@/lib/tree/buildTreeLayout";
import type { Person, Pet } from "@/lib/types";
import type { RelationshipWithPersons } from "@/lib/actions/relationships";
import type { PetRelationshipWithRefs } from "@/lib/actions/petRelationships";

// ============================================================================
// STATIC CONFIG — must live outside the component to avoid re-creation warnings
// ============================================================================

const nodeTypes = {
  personNode: PersonNode,
  petNode: PetNode,
};

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  persons: Person[];
  pets: Pet[];
  relationships: RelationshipWithPersons[];
  petRelationships: PetRelationshipWithRefs[];
};

// ============================================================================
// COMPONENT
// ============================================================================

export function FamilyTreeView({ persons, pets, relationships, petRelationships }: Props) {
  const { nodes, edges } = useMemo(() => {
    const layout = buildTreeLayout(persons, pets, relationships, petRelationships);

    const flowNodes: Node[] = layout.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data:
        n.type === "petNode"
          ? { pet: n.data.pet, generation: n.data.generation }
          : { person: n.data.person, generation: n.data.generation },
    }));

    const flowEdges: Edge[] = layout.edges.map((e) => {
      if (e.data.kind === "parent_of") {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-right",
          targetHandle: "target-left",
          type: "smoothstep",
          animated: true,
          style: { strokeWidth: 1.5, stroke: "#a855f7" },
        };
      }
      if (e.data.kind === "spouse_of") {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-bottom",
          targetHandle: "target-top",
          type: "straight",
          style: { strokeWidth: 1.5, stroke: "#71717a", strokeDasharray: "4 4" },
        };
      }
      if (e.data.kind === "sibling_of") {
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "source-bottom",
          targetHandle: "target-top",
          type: "straight",
          style: { strokeWidth: 1, stroke: "#52525b", strokeDasharray: "1 4" },
        };
      }

      // pet_relationship — person owns/cares for a pet
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: "source-right",
        targetHandle: "target-left",
        type: "smoothstep",
        style: { strokeWidth: 1.5, stroke: "#00c2b0" },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [persons, pets, relationships, petRelationships]);

  return (
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
        <Background color="#2a2a35" gap={24} size={1} />
        <Controls className="!bg-surface-raised !border !border-surface-border [&>button]:!bg-surface-raised [&>button]:!border-surface-border [&>button]:!fill-zinc-400 [&>button:hover]:!bg-[#1a1a25]" />
        <MiniMap
          className="!bg-surface-raised !border !border-surface-border"
          nodeColor="#a855f7"
          maskColor="rgba(10,10,15,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
