import { useSyncExternalStore } from "react"

import { BREAKPOINTS } from "@/lib/breakpoints"

export type ViewportKind = "mobile" | "desktop"

const MOBILE_QUERY = `(max-width: ${BREAKPOINTS.tablet - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getSnapshot = (): ViewportKind =>
  window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop"

const getServerSnapshot = (): ViewportKind | null => null

/**
 * Tamaño de pantalla para decidir qué árbol renderizar. Devuelve `null` hasta
 * que se conoce (render de servidor), así no se monta la versión equivocada
 * ni se redirige antes de tiempo. Usa el mismo corte que `useIsMobile`.
 */
export function useViewportKind(): ViewportKind | null {
  return useSyncExternalStore<ViewportKind | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
}
