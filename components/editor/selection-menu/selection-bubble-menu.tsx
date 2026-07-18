"use client"

import { useEffect, useState } from "react"
import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/react"
import { Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AddLinkPopover } from "./add-link-popover"

type SelectionBubbleMenuProps = {
  editor: Editor
  projectId: string
}

export function SelectionBubbleMenu({ editor, projectId }: SelectionBubbleMenuProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const closePopover = () => setOpen(false)
    editor.on("selectionUpdate", closePopover)
    return () => {
      editor.off("selectionUpdate", closePopover)
    }
  }, [editor])

  return (
    <BubbleMenu editor={editor} shouldShow={({ state }) => !state.selection.empty}>
      {open ? (
        <AddLinkPopover
          editor={editor}
          projectId={projectId}
          onDone={() => setOpen(false)}
        />
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
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
