import type { Editor } from "@tiptap/react"
import { Bold, ImagePlus, Italic, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaveStatusIndicator } from "./save-status-indicator"
import { AnalysisButton } from "./analysis/analysis-button"

interface EditorToolbarProps {
  editor: Editor
  versionLabel: string
  onInsertImage?: () => void
  isUploadingImage?: boolean
  onAnalyzeChanges?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
}

export function EditorToolbar({
  editor,
  versionLabel,
  onInsertImage,
  isUploadingImage = false,
  onAnalyzeChanges,
  isAnalysisSaving = false,
  isZenMode = false,
}: EditorToolbarProps) {
  const toolbar = (
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
        {onAnalyzeChanges && (
          <AnalysisButton
            isSaving={isAnalysisSaving}
            onClick={onAnalyzeChanges}
          />
        )}
        <SaveStatusIndicator className="pr-1" />
      </div>
    </div>
  )

  if (isZenMode) {
    return (
      <div className="group/zen-toolbar absolute inset-x-0 top-0 z-20 h-2 hover:h-12 focus-within:h-12">
        <div className="-translate-y-10 opacity-0 shadow-sm transition-all duration-200 group-hover/zen-toolbar:translate-y-0 group-hover/zen-toolbar:opacity-100 group-focus-within/zen-toolbar:translate-y-0 group-focus-within/zen-toolbar:opacity-100">
          {toolbar}
        </div>
      </div>
    )
  }

  return toolbar
}
