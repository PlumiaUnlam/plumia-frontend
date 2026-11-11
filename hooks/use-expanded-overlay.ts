import { useEffect } from "react"

const OTHER_LAYER = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

/**
 * Comportamiento común de un panel expandido a pantalla completa: Escape lo cierra
 * (salvo que haya un modal, menú o lista abierta encima) y el fondo no se desplaza.
 */
export function useExpandedOverlay(expanded: boolean, onClose: () => void) {
  useEffect(() => {
    if (!expanded) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (document.querySelector(OTHER_LAYER)) return
      onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [expanded, onClose])
}
