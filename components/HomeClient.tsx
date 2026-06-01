"use client";

import { useState } from "react";
import { AddPersonSheet } from "./AddPersonSheet";

export function HomeClient() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="px-3.5 py-1.5 rounded-full text-xs font-medium text-violet-300 border border-violet-accent/40 bg-violet-accent/10 hover:bg-violet-accent/20 transition-colors"
      >
        + Agregar
      </button>

      <AddPersonSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}