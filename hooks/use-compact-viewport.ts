import { useSyncExternalStore } from "react"

import { BREAKPOINTS } from "@/lib/breakpoints"

const COMPACT_QUERY = `(max-width: ${BREAKPOINTS.desktop - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(COMPACT_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/**
 * true por debajo del breakpoint de escritorio (< 1024px). En el servidor
 * devuelve false para no cambiar el HTML inicial.
 */
export function useCompactViewport(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  )
}
