// ============================================================================
// default.tsx — required by Next.js for every parallel route slot (@modal).
// Rendered whenever the current URL doesn't match a route INSIDE this slot
// (i.e. almost always) — so el slot queda vacío y no aparece nada flotando
// cuando no hay ninguna tarjeta que mostrar.
// ============================================================================

export default function Default() {
  return null;
}
