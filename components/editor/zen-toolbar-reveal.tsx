"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  ZEN_TOOLBAR_HIDE_DELAY_MS,
  ZEN_TOOLBAR_POLL_MS,
  shouldHideZenToolbar,
} from "@/lib/zen-toolbar"

type ZenToolbarRevealProps = {
  children: ReactNode
  hideDelayMs?: number
}

/**
 * Contenedor del menú de herramientas en modo Zen.
 *
 * - Una zona fina arriba de la hoja lo muestra al pasar el mouse (o al recibir
 *   foco con el teclado).
 * - Al abrirse ocupa su lugar en el flujo: la hoja baja y el menú no la tapa.
 * - Tiene fondo opaco, así no se ve el texto de la hoja a través del menú.
 * - Se oculta solo unos segundos después de que el mouse sale de la zona, y
 *   nunca mientras un desplegable del menú está abierto.
 */
export function ZenToolbarReveal({
  children,
  hideDelayMs = ZEN_TOOLBAR_HIDE_DELAY_MS,
}: Readonly<ZenToolbarRevealProps>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const isEngaged = useCallback(() => {
    const root = rootRef.current
    if (!root) return false
    // El foco solo cuenta si es de teclado: al cerrar un desplegable con el
    // mouse el foco vuelve al botón y no debe dejar el menú abierto para siempre.
    const active = document.activeElement
    const keyboardFocus =
      active instanceof HTMLElement &&
      root.contains(active) &&
      active.matches(":focus-visible")
    return (
      root.matches(":hover") ||
      keyboardFocus ||
      root.querySelector('[aria-expanded="true"]') !== null
    )
  }, [])

  useEffect(() => {
    if (!open) return

    let lastEngagedAt = Date.now()
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const engaged = isEngaged()
      if (engaged) lastEngagedAt = now
      if (
        shouldHideZenToolbar({
          engaged,
          idleMs: now - lastEngagedAt,
          delayMs: hideDelayMs,
        })
      ) {
        setOpen(false)
      }
    }, ZEN_TOOLBAR_POLL_MS)

    return () => window.clearInterval(intervalId)
  }, [open, hideDelayMs, isEngaged])

  return (
    <div
      ref={rootRef}
      data-zen-toolbar
      data-state={open ? "open" : "closed"}
      className="relative z-20 shrink-0"
      onPointerEnter={() => setOpen(true)}
      onFocusCapture={() => setOpen(true)}
    >
      <div
        aria-hidden="true"
        data-zen-toolbar-zone
        className={cn(
          "absolute inset-x-0 top-0 z-10 h-8",
          open && "pointer-events-none",
        )}
      />
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-b border-border bg-background shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
