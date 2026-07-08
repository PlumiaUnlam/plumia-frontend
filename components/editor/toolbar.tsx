import type { Editor } from "@tiptap/react"
import { Bold, Italic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaveStatusIndicator } from "./save-status-indicator"

interface EditorToolbarProps {
  editor: Editor
}

export function EditorToolbar({
  editor,
}: EditorToolbarProps) {
  return (
    <div className="flex w-full items-center gap-2 bg-white px-4 py-1">
      <Button
        size="icon"
        variant={
          editor.isActive("bold")
            ? "default"
            : "ghost"
        }
        onClick={() =>
          editor.chain().focus().toggleBold().run()
        }
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant={
          editor.isActive("italic")
            ? "default"
            : "ghost"
        }
        onClick={() =>
          editor.chain().focus().toggleItalic().run()
        }
      >
        <Italic className="h-4 w-4" />
      </Button>

      <SaveStatusIndicator className="ml-auto pr-1" />
    </div>
  )
}