"use client";

import { useState } from "react";
import { EditPersonSheet } from "./EditPersonSheet";
import type { Person } from "@/lib/types";

type Props = {
  person: Person;
};

export function PersonProfileActions({ person }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
      >
        Editar
      </button>

      <EditPersonSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={person}
      />
    </>
  );
}