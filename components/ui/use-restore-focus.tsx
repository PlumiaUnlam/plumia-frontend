import * as React from "react"

type FocusEventHandler = (event: Event) => void

function currentFocusedElement(): HTMLElement | null {
  const active = document.activeElement
  return active instanceof HTMLElement && active !== document.body ? active : null
}

/**
 * Radix solo devuelve el foco a un `DialogTrigger`. Los modales de la app se
 * abren por estado (sin trigger), así que al cerrarlos el foco caía en `body`
 * y quien navega con teclado o lector de pantalla perdía su lugar.
 *
 * Recuerda el elemento enfocado cuando el contenido se monta (ver
 * `RestoreFocusMarker`) y lo vuelve a enfocar al cerrar, si sigue en la página.
 * No se usa `onOpenAutoFocus`: Radix no emite ese evento cuando un campo con
 * `autoFocus` ya tomó el foco, que es el caso de casi todos los formularios.
 * Respeta los manejadores que pase cada modal.
 */
export function useRestoreFocus(handlers?: {
  onOpenAutoFocus?: FocusEventHandler
  onCloseAutoFocus?: FocusEventHandler
}) {
  const previouslyFocused = React.useRef<HTMLElement | null>(null)
  const { onOpenAutoFocus, onCloseAutoFocus } = handlers ?? {}

  return {
    previouslyFocused,
    onOpenAutoFocus: (event: Event) => {
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

/**
 * Va como primer hijo del contenido del modal: su efecto corre al montarse, antes
 * de que un `autoFocus` de los campos de adentro mueva el foco.
 */
export function RestoreFocusMarker({
  previouslyFocusedRef,
}: Readonly<{ previouslyFocusedRef: React.RefObject<HTMLElement | null> }>) {
  React.useLayoutEffect(() => {
    previouslyFocusedRef.current = currentFocusedElement()
  }, [previouslyFocusedRef])
  return null
}
