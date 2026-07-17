"use client";

import { useState, useRef, useEffect } from "react";
import { AddPersonSheet } from "./AddPersonSheet";
import { AddRelationshipSheet } from "./AddRelationshipSheet";
import { AddPetSheet } from "./AddPetSheet";
import { AddPetRelationshipSheet } from "./AddPetRelationshipSheet";
import type { Person, Pet } from "@/lib/types";

type Props = {
  persons: Person[];
  pets: Pet[];
};

export function HomeClient({ persons, pets }: Props) {
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [relationshipSheetOpen, setRelationshipSheetOpen] = useState(false);
  const [petSheetOpen, setPetSheetOpen] = useState(false);
  const [petRelationshipSheetOpen, setPetRelationshipSheetOpen] = useState(false);

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) {
        setLinkMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* + Vincular dropdown */}
        <div ref={linkMenuRef} className="relative">
          <button
            onClick={() => setLinkMenuOpen((o) => !o)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 border border-surface-border bg-surface-raised hover:text-zinc-200 hover:bg-[#1a1a25] transition-colors"
          >
            + Vincular
          </button>

          {linkMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-44 z-50 bg-[#0f0f17] border border-violet-accent/20 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={() => { setRelationshipSheetOpen(true); setLinkMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs text-violet-300 hover:bg-violet-accent/10 transition-colors flex items-center gap-2"
              >
                👥 Entre personas
              </button>
              <button
                onClick={() => { setPetRelationshipSheetOpen(true); setLinkMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs text-cyan-300 hover:bg-cyan-accent/10 transition-colors flex items-center gap-2"
              >
                🐾 Mascota a persona
              </button>
            </div>
          )}
        </div>

        {/* + Agregar dropdown */}
        <div ref={addMenuRef} className="relative">
          <button
            onClick={() => setAddMenuOpen((o) => !o)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
          >
            + Agregar
          </button>

          {addMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-40 z-50 bg-[#0f0f17] border border-violet-accent/20 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={() => { setPersonSheetOpen(true); setAddMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs text-violet-300 hover:bg-violet-accent/10 transition-colors flex items-center gap-2"
              >
                👤 Persona
              </button>
              <button
                onClick={() => { setPetSheetOpen(true); setAddMenuOpen(false); }}
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
        persons={persons}
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

      <AddPetRelationshipSheet
        open={petRelationshipSheetOpen}
        onClose={() => setPetRelationshipSheetOpen(false)}
        persons={persons}
        pets={pets}
      />
    </>
  );
}
