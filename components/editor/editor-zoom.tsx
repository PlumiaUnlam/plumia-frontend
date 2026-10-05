"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const EDITOR_ZOOM_LEVELS = [
  50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200,
] as const

const DEFAULT_EDITOR_ZOOM = 100

type EditorZoomContextValue = {
  zoom: number
  zoomFactor: number
  canZoomIn: boolean
  canZoomOut: boolean
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

const EditorZoomContext = createContext<EditorZoomContextValue | null>(null)

function findZoomLevelIndex(zoom: number) {
  const exactIndex = EDITOR_ZOOM_LEVELS.indexOf(
    zoom as (typeof EDITOR_ZOOM_LEVELS)[number],
  )
  if (exactIndex >= 0) return exactIndex

  return EDITOR_ZOOM_LEVELS.reduce((closestIndex, level, index) => {
    const closestDistance = Math.abs(EDITOR_ZOOM_LEVELS[closestIndex] - zoom)
    return Math.abs(level - zoom) < closestDistance ? index : closestIndex
  }, 0)
}

export function EditorZoomProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [zoom, setZoom] = useState(DEFAULT_EDITOR_ZOOM)
  const zoomIndex = findZoomLevelIndex(zoom)

  const setValidZoom = useCallback((nextZoom: number) => {
    if (
      !EDITOR_ZOOM_LEVELS.includes(
        nextZoom as (typeof EDITOR_ZOOM_LEVELS)[number],
      )
    ) return
    setZoom(nextZoom)
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((currentZoom) => {
      const currentIndex = findZoomLevelIndex(currentZoom)
      return EDITOR_ZOOM_LEVELS[
        Math.min(currentIndex + 1, EDITOR_ZOOM_LEVELS.length - 1)
      ]
    })
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((currentZoom) => {
      const currentIndex = findZoomLevelIndex(currentZoom)
      return EDITOR_ZOOM_LEVELS[Math.max(currentIndex - 1, 0)]
    })
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_EDITOR_ZOOM)
  }, [])

  useEffect(() => {
    const handleZoomShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (!document.activeElement?.closest("[data-editor-workspace]")) return

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        zoomIn()
      } else if (event.key === "-") {
        event.preventDefault()
        zoomOut()
      } else if (event.key === "0") {
        event.preventDefault()
        resetZoom()
      }
    }

    window.addEventListener("keydown", handleZoomShortcut)
    return () => window.removeEventListener("keydown", handleZoomShortcut)
  }, [resetZoom, zoomIn, zoomOut])

  const value = useMemo<EditorZoomContextValue>(
    () => ({
      zoom,
      zoomFactor: zoom / 100,
      canZoomIn: zoomIndex < EDITOR_ZOOM_LEVELS.length - 1,
      canZoomOut: zoomIndex > 0,
      setZoom: setValidZoom,
      zoomIn,
      zoomOut,
      resetZoom,
    }),
    [resetZoom, setValidZoom, zoom, zoomIn, zoomIndex, zoomOut],
  )

  return (
    <EditorZoomContext.Provider value={value}>
      {children}
    </EditorZoomContext.Provider>
  )
}

export function useEditorZoom() {
  const value = useContext(EditorZoomContext)
  if (!value) {
    throw new Error("useEditorZoom debe usarse dentro de EditorZoomProvider")
  }
  return value
}
