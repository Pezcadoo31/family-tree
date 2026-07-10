"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditPetSheet } from "./EditPetSheet";
import { deletePet } from "@/lib/actions/pets";
import type { Pet } from "@/lib/types";

type Props = {
  pet: Pet;
};

export function PetProfileActions({ pet }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePet(pet.id);
      if (result.success) {
        router.push("/");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">¿Eliminar a {pet.name}?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {isPending ? "Eliminando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setConfirming(true)}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors"
        >
          Eliminar
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-cyan-300 border border-cyan-accent/40 bg-cyan-accent/10 hover:bg-cyan-accent/20 transition-colors"
        >
          Editar
        </button>
      </div>

      <EditPetSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        pet={pet}
      />
    </>
  );
}
