"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditPersonSheet } from "./EditPersonSheet";
import { deletePerson } from "@/lib/actions/persons";
import type { Person } from "@/lib/types";

type Props = {
  person: Person;
  allPersons: Person[];
};

export function PersonProfileActions({ person, allPersons }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePerson(person.id);
      if (result.success) {
        router.push("/");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">¿Eliminar a {person.given_name}?</span>
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
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
        >
          Editar
        </button>
      </div>

      <EditPersonSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={person}
        allPersons={allPersons}
      />
    </>
  );
}
