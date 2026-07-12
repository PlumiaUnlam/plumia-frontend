import type { Editor } from "@tiptap/react"
import { Bold, ImagePlus, Italic, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaveStatusIndicator } from "./save-status-indicator"

interface EditorToolbarProps {
  editor: Editor
  versionLabel: string
  onInsertImage?: () => void
  isUploadingImage?: boolean
}

export function EditorToolbar({
  editor,
  versionLabel,
  onInsertImage,
  isUploadingImage = false,
}: EditorToolbarProps) {
  return (
    <div className="flex h-12 w-full items-center gap-2 bg-white px-4">
      <Button
        type="button"
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
        type="button"
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

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <span className="max-w-48 truncate rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {versionLabel}
        </span>
        {onInsertImage && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={isUploadingImage}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onInsertImage}
            title="Insertar imagen"
          >
            {isUploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </Button>
        )}
        <SaveStatusIndicator className="pr-1" />
      </div>
    </div>
  )
}
