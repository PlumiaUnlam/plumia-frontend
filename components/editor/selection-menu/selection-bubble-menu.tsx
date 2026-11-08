"use client"

import { useEffect, useMemo, useState } from "react"
import { TextSelection } from "@tiptap/pm/state"
import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/react"
import { Link2, MessageSquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AddLinkPopover } from "./add-link-popover"

type SelectionBubbleMenuProps = {
  editor: Editor
  projectId: string
  onAddAnnotation?: () => void
  /** Oculta el menú (p. ej. mientras se redacta una anotación) para que no tape el panel que se está usando. */
  hidden?: boolean
}

export function SelectionBubbleMenu({ editor, projectId, onAddAnnotation, hidden = false }: Readonly<SelectionBubbleMenuProps>) {
  const [open, setOpen] = useState(false)
  const scrollTarget = editor.view.dom.closest<HTMLElement>("[data-editor-scroll-container]") ?? undefined
  const bubbleMenuOptions = useMemo(() => ({ scrollTarget }), [scrollTarget])

  useEffect(() => {
    const closePopover = () => setOpen(false)
    editor.on("selectionUpdate", closePopover)
    return () => {
      editor.off("selectionUpdate", closePopover)
    }
  }, [editor])

  if (hidden) return null

  return (
    <BubbleMenu
      editor={editor}
      className="z-50"
      // Solo se muestra mientras el foco está en el editor (o dentro del propio menú): si el foco pasa a otro panel,
      // por ejemplo el campo de una anotación, el menú no debe quedar flotando encima.
      shouldShow={({ state, view, element }) =>
        state.selection instanceof TextSelection &&
        !state.selection.empty &&
        (view.hasFocus() || element.contains(document.activeElement))
      }
      options={bubbleMenuOptions}
    >
      {open ? (
        <AddLinkPopover
          editor={editor}
          projectId={projectId}
          onDone={() => setOpen(false)}
        />
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {onAddAnnotation && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onAddAnnotation}
            >
              <MessageSquarePlus className="size-3.5" />
              Comentar
            </Button>
          )}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen(true)}
          >
            <Link2 className="size-3.5" />
            Agregar enlace
          </Button>
        </div>
      )}
    </BubbleMenu>
  )
}
