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
// routes. The card itself owns its scroll (flex column + internal
// overflow-y-auto), same pattern as EditPersonSheet — the header is a
// normal flex item that never moves and is never covered, instead of a
// `sticky` element fighting an unrelated outer scroll container.
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

      {/* Centers a height-capped card — this outer layer does NOT scroll */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10"
        onClick={close}
      >
        <div
          className={`relative w-full max-w-2xl max-h-full flex flex-col bg-[#0f0f17] border ${borderClass} rounded-2xl shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — plain flex item, fixed in place, never covered */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
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

          {/* Scrollable content — owns its OWN scroll, independent of the backdrop layer */}
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        </div>
      </div>
    </>
  );
}
