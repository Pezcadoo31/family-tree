"use client";

import { useState } from "react";
import { EditPetSheet } from "./EditPetSheet";
import type { Pet } from "@/lib/types";

type Props = {
  pet: Pet;
};

export function PetProfileActions({ pet }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setEditOpen(true)}
        className="px-3.5 py-1.5 rounded-full text-xs font-medium text-cyan-300 border border-cyan-accent/40 bg-cyan-accent/10 hover:bg-cyan-accent/20 transition-colors"
      >
        Editar
      </button>

      <EditPetSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        pet={pet}
      />
    </>
  );
}
