"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// ============================================================================
// TYPES
// ============================================================================

type ProfileModalProps = {
  children: React.ReactNode;
  actions?: React.ReactNode;
  accent?: "violet" | "cyan";
};

// ============================================================================
// COMPONENT — floating card chrome shared by the person and pet modal
// routes (Paso 9/10). Purely the shell: backdrop, close behavior, scroll
// container. The actual info design lives in PersonProfileContent /
// PetProfileContent (Pasos 3-4) and is passed in as children, unchanged.
// ============================================================================

export function ProfileModal({ children, actions, accent = "violet" }: ProfileModalProps) {
  const router = useRouter();

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  const borderClass = accent === "cyan" ? "border-cyan-accent/20" : "border-violet-accent/20";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={close} />

      {/* Floating card — click outside the panel closes it, click inside does not */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto px-4 py-10 sm:py-16"
        onClick={close}
      >
        <div className="flex min-h-full items-start justify-center">
          <div
            className={`relative w-full max-w-2xl bg-[#0f0f17] border ${borderClass} rounded-2xl shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — close button + actions (Editar/Eliminar) */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-surface-border bg-[#0f0f17] rounded-t-2xl">
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-surface-raised transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">{actions}</div>
            </div>

            {/* Scrollable content — same info design as la página completa,
                sin cambios (PersonProfileContent / PetProfileContent) */}
            <div className="px-6 py-6">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
