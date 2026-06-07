"use client";

import { useState } from "react";
import { AddPersonSheet } from "./AddPersonSheet";
import { AddRelationshipSheet } from "./AddRelationshipSheet";
import type { Person } from "@/lib/types";

type Props = {
  persons: Person[];
};

export function HomeClient({ persons }: Props) {
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [relationshipSheetOpen, setRelationshipSheetOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRelationshipSheetOpen(true)}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 border border-surface-border bg-surface-raised hover:text-zinc-200 hover:bg-[#1a1a25] transition-colors"
        >
          + Vincular
        </button>
        <button
          onClick={() => setPersonSheetOpen(true)}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
        >
          + Agregar
        </button>
      </div>

      <AddPersonSheet
        open={personSheetOpen}
        onClose={() => setPersonSheetOpen(false)}
      />

      <AddRelationshipSheet
        open={relationshipSheetOpen}
        onClose={() => setRelationshipSheetOpen(false)}
        persons={persons}
      />
    </>
  );
}