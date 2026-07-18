"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import { ExternalLink, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type HoveredLink = {
  element: HTMLElement
  entityId: string | null
  rect: DOMRect
}

type EntityLinkHoverTooltipProps = {
  editor: Editor
  onGoToEntity: (entityId: string) => void
}

const HIDE_DELAY_MS = 150

/**
 * Tooltip que aparece al pasar el mouse sobre un link (URL o entidad) ya
 * existente en el manuscrito, con acciones "Ver entidad" y "Eliminar
 * asociación". Usa `position: fixed` sobre el rect del <a> hovereado, sin
 * depender de la selección de ProseMirror (evita que quede "pegado").
 */
export function EntityLinkHoverTooltip({
  editor,
  onGoToEntity,
}: EntityLinkHoverTooltipProps) {
  const [hovered, setHovered] = useState<HoveredLink | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimer.current = setTimeout(() => setHovered(null), HIDE_DELAY_MS)
  }, [clearHideTimer])

  useEffect(() => {
    const root = editor.view.dom as HTMLElement

    function findLink(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      return target?.closest<HTMLElement>("a[href], a[data-entity-id]") ?? null
    }

    function handleMouseOver(event: MouseEvent) {
      const link = findLink(event)
      if (!link) return

      clearHideTimer()
      setHovered({
        element: link,
        entityId: link.getAttribute("data-entity-id"),
        rect: link.getBoundingClientRect(),
      })
    }

    function handleMouseOut(event: MouseEvent) {
      if (findLink(event)) scheduleHide()
    }

    root.addEventListener("mouseover", handleMouseOver)
    root.addEventListener("mouseout", handleMouseOut)
    return () => {
      root.removeEventListener("mouseover", handleMouseOver)
      root.removeEventListener("mouseout", handleMouseOut)
    }
  }, [editor, clearHideTimer, scheduleHide])

  if (!hovered) return null

  function removeLink() {
    if (!hovered) return
    const markName = hovered.entityId ? "entityLink" : "link"
    const pos = editor.view.posAtDOM(hovered.element, 0)

    editor
      .chain()
      .setTextSelection(pos)
      .extendMarkRange(markName)
      .unsetMark(markName)
      .run()
    setHovered(null)
  }

  return (
    <div
      style={{
        position: "fixed",
        top: hovered.rect.bottom + 6,
        left: hovered.rect.left,
      }}
      className="z-50 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
      onMouseEnter={clearHideTimer}
      onMouseLeave={scheduleHide}
    >
      {hovered.entityId && (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => {
            onGoToEntity(hovered.entityId as string)
            setHovered(null)
          }}
        >
          <ExternalLink className="size-3.5" />
          Ver
        </Button>
      )}
      <Button type="button" size="xs" variant="ghost" onClick={removeLink}>
        <X className="size-3.5" />
        Eliminar
      </Button>
    </div>
  )
}
