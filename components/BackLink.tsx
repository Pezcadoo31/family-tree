"use client";

import { useRouter } from "next/navigation";

export function BackLink() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      ← Volver
    </button>
  );
}
