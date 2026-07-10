"use client";

import { useState, useRef, useEffect } from "react";
import { AddPersonSheet } from "./AddPersonSheet";
import { AddRelationshipSheet } from "./AddRelationshipSheet";
import { AddPetSheet } from "./AddPetSheet";
import type { Person } from "@/lib/types";

type Props = {
  persons: Person[];
};

export function HomeClient({ persons }: Props) {
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [relationshipSheetOpen, setRelationshipSheetOpen] = useState(false);
  const [petSheetOpen, setPetSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRelationshipSheetOpen(true)}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 border border-surface-border bg-surface-raised hover:text-zinc-200 hover:bg-[#1a1a25] transition-colors"
        >
          + Vincular
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
          >
            + Agregar
          </button>

          {menuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-40 z-50 bg-[#0f0f17] border border-violet-accent/20 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={() => { setPersonSheetOpen(true); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs text-violet-300 hover:bg-violet-accent/10 transition-colors flex items-center gap-2"
              >
                👤 Persona
              </button>
              <button
                onClick={() => { setPetSheetOpen(true); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs text-cyan-300 hover:bg-cyan-accent/10 transition-colors flex items-center gap-2"
              >
                🐾 Mascota
              </button>
            </div>
          )}
        </div>
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

      <AddPetSheet
        open={petSheetOpen}
        onClose={() => setPetSheetOpen(false)}
      />
    </>
  );
}