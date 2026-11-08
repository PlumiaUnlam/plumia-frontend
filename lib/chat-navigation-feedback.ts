/**
 * Qué pasa al tocar un acceso directo del chat. Si el destino ya está a la vista no hay
 * navegación y la persona creería que el botón no hizo nada: se le avisa o, cuando se puede,
 * se muestra lo que busca (por ejemplo la barra de herramientas de formato).
 */

import type { ChatSection } from "@/types/chat"

export type NavigationAction = {
  readonly route: string
  readonly label: string
  readonly section?: ChatSection
}

export type RightPanelSection = Extract<ChatSection, `editor-right-${string}`>

export type NavigationFeedback =
  | { readonly kind: "navigate" }
  | { readonly kind: "reveal-toolbar"; readonly message: string }
  | { readonly kind: "reveal-history"; readonly message: string }
  | {
      readonly kind: "reveal-panel"
      readonly tab: "wiki" | "chat" | "stats"
      readonly message: string
    }
  | { readonly kind: "already-here"; readonly message: string }

const TOOLBAR_LABEL = /barra de herramientas|herramientas de formato|mostrar herramientas/i

function parseRoute(route: string) {
  const url = new URL(route, "https://plumia.invalid")
  return { pathname: url.pathname.replace(/\/$/, "") || "/", params: url.searchParams }
}

/** El destino ya está abierto: misma ruta y, si el acceso trae parámetros, los mismos valores. */
function isCurrentLocation(route: string, currentPathname: string, currentSearch: string) {
  const target = parseRoute(route)
  if (target.pathname !== (currentPathname.replace(/\/$/, "") || "/")) return false
  const current = new URLSearchParams(currentSearch)
  for (const [key, value] of target.params) {
    if (current.get(key) !== value) return false
  }
  return true
}

const TOOLBAR_MESSAGE = "La barra de herramientas de formato está visible arriba del texto."

const PANEL_SECTIONS = {
  "editor-right-wiki": { tab: "wiki", message: "La Wiki está a la vista en el panel derecho." },
  "editor-right-chat": { tab: "chat", message: "El Chat IA está a la vista en el panel derecho." },
  "editor-right-stats": { tab: "stats", message: "Las estadísticas están a la vista en el panel derecho." },
  "editor-right-review": { tab: "wiki", message: "La Wiki está abierta en modo Revisión." },
} as const

/** Pestaña del panel derecho que corresponde a la sección, si es una de sus pestañas. */
export function rightPanelTabFor(section: ChatSection | undefined) {
  return section && section in PANEL_SECTIONS
    ? PANEL_SECTIONS[section as RightPanelSection].tab
    : null
}

export function resolveNavigationFeedback(
  action: NavigationAction,
  currentPathname: string,
  currentSearch = "",
): NavigationFeedback {
  if (!isCurrentLocation(action.route, currentPathname, currentSearch)) {
    return { kind: "navigate" }
  }
  const isEditor = parseRoute(action.route).pathname.endsWith("/editor")
  if (isEditor && action.section === "editor-history") {
    return { kind: "reveal-history", message: "El historial de la escena está abierto." }
  }
  const panelTab = rightPanelTabFor(action.section)
  if (isEditor && panelTab) {
    return {
      kind: "reveal-panel",
      tab: panelTab,
      message: PANEL_SECTIONS[action.section as RightPanelSection].message,
    }
  }
  // Los mensajes guardados antes de que existiera `section` solo traen la etiqueta.
  if (isEditor && (action.section === "editor-toolbar" || TOOLBAR_LABEL.test(action.label))) {
    return { kind: "reveal-toolbar", message: TOOLBAR_MESSAGE }
  }
  return {
    kind: "already-here",
    message: `Estás en la pantalla indicada. Seguí los pasos de la respuesta para «${action.label}».`,
  }
}
