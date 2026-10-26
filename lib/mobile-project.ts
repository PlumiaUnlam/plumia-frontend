import {
  BarChart3,
  Earth,
  GitBranch,
  Home,
  Layers3,
  MessageSquare,
  PenLine,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * Qué parte del proyecto se ofrece en mobile (< 768px) y qué queda solo para
 * escritorio. Lo comparten el hub, la barra inferior, el aviso y la redirección
 * del editor, para que el recorte viva en un único lugar.
 */

export type MobileProjectSection = {
  segment: "worldbuilding" | "storyboard" | "statistics" | "shares"
  label: string
  /** Etiqueta corta para la barra inferior. */
  navLabel: string
  description: string
  icon: LucideIcon
}

export const MOBILE_PROJECT_SECTIONS: readonly MobileProjectSection[] = [
  {
    segment: "worldbuilding",
    label: "Worldbuilding",
    navLabel: "Mundo",
    description: "Tu universo narrativo",
    icon: Earth,
  },
  {
    segment: "storyboard",
    label: "Notas e ideas",
    navLabel: "Notas",
    description: "Ideas y notas por voz",
    icon: Layers3,
  },
  {
    segment: "shares",
    label: "Lectores y comentarios",
    navLabel: "Lectores",
    description: "Lo que comentaron tus lectores",
    icon: MessageSquare,
  },
  {
    segment: "statistics",
    label: "Estadísticas",
    navLabel: "Stats",
    description: "Palabras, metas y ritmo",
    icon: BarChart3,
  },
]

export const MOBILE_HOME_NAV = { navLabel: "Inicio", icon: Home } as const

export type DesktopOnlyFeature = {
  id: "editor" | "versions"
  label: string
  description: string
  icon: LucideIcon
}

export const DESKTOP_ONLY_FEATURES: readonly DesktopOnlyFeature[] = [
  {
    id: "editor",
    label: "Editor",
    description: "Escribí tu manuscrito",
    icon: PenLine,
  },
  {
    id: "versions",
    label: "Control de versiones",
    description: "Compará y restaurá escenas",
    icon: GitBranch,
  },
]

export const DESKTOP_ONLY_QUERY_PARAM = "desktop"

export function getProjectHomeHref(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}`
}

export function getProjectSectionHref(projectId: string, segment: string) {
  return `${getProjectHomeHref(projectId)}/${segment}`
}

export function getDesktopOnlyHref(projectId: string, featureId: string) {
  return `${getProjectHomeHref(projectId)}?${DESKTOP_ONLY_QUERY_PARAM}=${featureId}`
}

export function findDesktopOnlyFeature(featureId: string | null | undefined) {
  return DESKTOP_ONLY_FEATURES.find((feature) => feature.id === featureId) ?? null
}

/** Tabs de worldbuilding que no se ofrecen en mobile (el grafo no es usable con el dedo). */
export const MOBILE_HIDDEN_WORLDBUILDING_TABS: readonly string[] = ["relationships"]

export function filterWorldbuildingTabsForViewport<T extends { id: string }>(
  tabs: readonly T[],
  isMobile: boolean,
): T[] {
  return isMobile
    ? tabs.filter((tab) => !MOBILE_HIDDEN_WORLDBUILDING_TABS.includes(tab.id))
    : [...tabs]
}
