import * as React from "react"

type FocusEventHandler = (event: Event) => void

/**
 * Radix solo devuelve el foco a un `DialogTrigger`. Los modales de la app se
 * abren por estado (sin trigger), así que al cerrarlos el foco caía en `body`
 * y quien navega con teclado o lector de pantalla perdía su lugar.
 *
 * Recuerda el elemento enfocado al abrir y lo vuelve a enfocar al cerrar, si
 * sigue en la página. Respeta los manejadores que pase cada modal.
 */
export function useRestoreFocus(handlers?: {
  onOpenAutoFocus?: FocusEventHandler
  onCloseAutoFocus?: FocusEventHandler
}) {
  const previouslyFocused = React.useRef<HTMLElement | null>(null)
  const { onOpenAutoFocus, onCloseAutoFocus } = handlers ?? {}

  return {
    onOpenAutoFocus: (event: Event) => {
      const active = document.activeElement
      previouslyFocused.current =
        active instanceof HTMLElement && active !== document.body ? active : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      const target = previouslyFocused.current
      previouslyFocused.current = null
      if (!event.defaultPrevented && target?.isConnected) {
        event.preventDefault()
        target.focus()
      }
    },
  }
}
