import type { Editor } from "@tiptap/react"
import {
  Bold,
  Columns2,
  ImagePlus,
  Italic,
  Loader2,
  SeparatorHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SaveStatusIndicator } from "./save-status-indicator"
import { AnalysisButton } from "./analysis/analysis-button"
import type { EditorPaneId } from "./editor-types"
import {
  SCENE_DIVIDER_OPTIONS,
  SceneDividerPreview,
  type SceneDividerVariant,
} from "./scene-divider"

interface EditorToolbarProps {
  editor: Editor | null
  versionLabel: string
  onInsertImage?: () => void
  isUploadingImage?: boolean
  onAnalyzeChanges?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
  onInsertDivider?: (variant: SceneDividerVariant) => void
  paneId?: EditorPaneId
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
}

export function EditorToolbar({
  editor,
  versionLabel,
  onInsertImage,
  isUploadingImage = false,
  onAnalyzeChanges,
  isAnalysisSaving = false,
  isZenMode = false,
  onInsertDivider,
  paneId = "primary",
  onToggleSplit,
  isSplit = false,
  canSplit = true,
}: EditorToolbarProps) {
  const toolbar = (
    <div className="flex h-12 w-full items-center gap-2 bg-white px-4">
      <Button
        type="button"
        size="icon"
        variant={
          editor?.isActive("bold")
            ? "default"
            : "ghost"
        }
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        title="Negrita"
        aria-label="Negrita"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant={
          editor?.isActive("italic")
            ? "default"
            : "ghost"
        }
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        title="Cursiva"
        aria-label="Cursiva"
      >
        <Italic className="h-4 w-4" />
      </Button>

      {onInsertDivider && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Insertar separador"
              aria-label="Insertar separador ornamental"
              onMouseDown={(event) => event.preventDefault()}
            >
              <SeparatorHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Separador de escena</DropdownMenuLabel>
            {SCENE_DIVIDER_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className="gap-3 py-2"
                onSelect={() => onInsertDivider(option.value)}
              >
                <SceneDividerPreview
                  variant={option.value}
                  className="w-24 shrink-0"
                />
                <span>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {onToggleSplit && (
        <Button
          type="button"
          size="icon"
          variant={isSplit ? "default" : "ghost"}
          disabled={!canSplit && !isSplit}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onToggleSplit}
          title={isSplit ? "Cerrar pantalla dividida" : "Pantalla dividida"}
          aria-label={
            isSplit ? "Cerrar pantalla dividida" : "Abrir pantalla dividida"
          }
          aria-pressed={isSplit}
        >
          <Columns2 className="h-4 w-4" />
        </Button>
      )}

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
        <SaveStatusIndicator paneId={paneId} className="pr-1" />
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
