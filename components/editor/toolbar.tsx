import type { Editor } from "@tiptap/react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  ChevronDown,
  IndentDecrease,
  IndentIncrease,
  Columns2,
  FileText,
  ImagePlus,
  Italic,
  Loader2,
  List as ListIcon,
  ListOrdered,
  ListX,
  SeparatorHorizontal,
  Redo2,
  Undo2,
} from "lucide-react"
import { useEditorState } from "@tiptap/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import {
  DEFAULT_PARAGRAPH_ATTRIBUTES,
  type ParagraphAlignment,
  type ParagraphAttributes,
} from "./paragraph-formatting"
import { ParagraphFormatDialog } from "./paragraph-format-dialog"
import { ListStyleGrid } from "./list-style-grid"
import { removeCurrentList } from "./list-formatting"
import { ListNumberingActionsButton } from "./list-numbering-menu"
import { ColorPalette } from "./color-palette"

const toolbarButtonClass =
  "h-8 rounded-md text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124]"
const toolbarMenuClass =
  "border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)]"
const toolbarMenuItemClass =
  "text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124]"

const alignmentOptions: ReadonlyArray<{
  value: ParagraphAlignment
  label: string
  icon: typeof AlignLeft
}> = [
  { value: "left", label: "Izquierda", icon: AlignLeft },
  { value: "center", label: "Centrada", icon: AlignCenter },
  { value: "right", label: "Derecha", icon: AlignRight },
  { value: "justify", label: "Justificada", icon: AlignJustify },
]

interface EditorToolbarProps {
  editor: Editor
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
  const paragraphState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isParagraph: currentEditor.isActive("paragraph"),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
      isBulletList: currentEditor.isActive("bulletList"),
      isOrderedList: currentEditor.isActive("orderedList"),
      isTextColor: currentEditor.isActive("textColor"),
      canLiftListItem: currentEditor.can().liftListItem("listItem"),
      canSinkListItem: currentEditor.can().sinkListItem("listItem"),
      attributes: currentEditor.getAttributes(
        "paragraph",
      ) as Partial<ParagraphAttributes>,
    }),
  })

  const paragraphAttributes: ParagraphAttributes = {
    ...DEFAULT_PARAGRAPH_ATTRIBUTES,
    ...paragraphState.attributes,
  }
  const paragraphEnabled = paragraphState.isParagraph
  const listEnabled = paragraphState.isBulletList || paragraphState.isOrderedList

  const updateParagraph = (attributes: Partial<ParagraphAttributes>) => {
    editor.chain().focus().updateAttributes("paragraph", attributes).run()
  }

  const increaseIndent = () => {
    if (listEnabled) {
      editor.chain().focus().sinkListItem("listItem").run()
      return
    }

    updateParagraph({
      indentLeft: Math.min(8, paragraphAttributes.indentLeft + 1),
    })
  }

  const decreaseIndent = () => {
    if (listEnabled) {
      editor.chain().focus().liftListItem("listItem").run()
      return
    }

    updateParagraph({
      indentLeft: Math.max(0, paragraphAttributes.indentLeft - 1),
    })
  }

  const toolbar = (
    <div className="editor-toolbar mx-2 mb-1 flex min-h-11 flex-nowrap items-center gap-0.5 rounded-b-md border border-[#dadce0] bg-[#f1f3f4] px-2 py-1 text-[#3c4043] shadow-sm max-[900px]:flex-wrap">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={toolbarButtonClass}
        disabled={!paragraphState.canUndo}
        title="Deshacer (Ctrl/Cmd+Z)"
        aria-label="Deshacer"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={toolbarButtonClass}
        disabled={!paragraphState.canRedo}
        title="Rehacer (Ctrl/Cmd+Y)"
        aria-label="Rehacer"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-[#dadce0]" />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${editor.isActive("bold") ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Negrita"
        aria-label="Negrita"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${editor.isActive("italic") ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Cursiva"
        aria-label="Cursiva"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-[#dadce0]" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={`${toolbarButtonClass} ${paragraphState.isTextColor ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
            title="Color de texto"
            aria-label="Cambiar color de texto"
            onMouseDown={(event) => event.preventDefault()}
          >
            <Baseline className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
            className={`w-[min(24rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[min(70vh,28rem)] overflow-y-auto p-2 ${toolbarMenuClass}`}
        >
          <DropdownMenuLabel>Color de texto</DropdownMenuLabel>
          <ColorPalette
            editor={editor}
            kind="text"
            menuItemClass={toolbarMenuItemClass}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={`${toolbarButtonClass} rounded-r-none pr-1 ${paragraphState.isBulletList ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
          title="Lista con viñetas"
          aria-label="Lista con viñetas"
          aria-pressed={paragraphState.isBulletList}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={`${toolbarButtonClass} -ml-px rounded-l-none px-0.5 ${paragraphState.isBulletList ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
              title="Biblioteca de viñetas"
              aria-label="Abrir biblioteca de viñetas"
              onMouseDown={(event) => event.preventDefault()}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={`w-[min(34rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[min(75vh,38rem)] overflow-x-hidden overflow-y-auto p-2 ${toolbarMenuClass}`}
          >
            <DropdownMenuLabel>Biblioteca de viñetas</DropdownMenuLabel>
            <ListStyleGrid
              editor={editor}
              kind="bullet"
              menuItemClass={toolbarMenuItemClass}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={`${toolbarButtonClass} rounded-r-none pr-1 ${paragraphState.isOrderedList ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
          title="Lista numerada"
          aria-label="Lista numerada"
          aria-pressed={paragraphState.isOrderedList}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={`${toolbarButtonClass} -ml-px rounded-l-none px-0.5 ${paragraphState.isOrderedList ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
              title="Biblioteca de numeración"
              aria-label="Abrir biblioteca de numeración"
              onMouseDown={(event) => event.preventDefault()}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={`w-[min(34rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[min(75vh,38rem)] overflow-x-hidden overflow-y-auto p-2 ${toolbarMenuClass}`}
          >
            <DropdownMenuLabel>Biblioteca de numeración</DropdownMenuLabel>
            <ListStyleGrid
              editor={editor}
              kind="ordered"
              menuItemClass={toolbarMenuItemClass}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ListNumberingActionsButton editor={editor} />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={toolbarButtonClass}
        disabled={!paragraphState.isBulletList && !paragraphState.isOrderedList}
        title="Quitar formato de lista"
        aria-label="Quitar formato de lista"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => removeCurrentList(editor)}
      >
        <ListX className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-[#dadce0]" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={toolbarButtonClass}
            disabled={!paragraphEnabled}
            title="Alineación del párrafo"
            aria-label="Alineación del párrafo"
            onMouseDown={(event) => event.preventDefault()}
          >
            {paragraphAttributes.textAlign === "center" ? (
              <AlignCenter className="h-4 w-4" />
            ) : paragraphAttributes.textAlign === "right" ? (
              <AlignRight className="h-4 w-4" />
            ) : paragraphAttributes.textAlign === "justify" ? (
              <AlignJustify className="h-4 w-4" />
            ) : (
              <AlignLeft className="h-4 w-4" />
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-44 ${toolbarMenuClass}`}>
          <DropdownMenuLabel>Alineación</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={paragraphAttributes.textAlign}
            onValueChange={(value) =>
              updateParagraph({ textAlign: value as ParagraphAlignment })
            }
          >
            {alignmentOptions.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                className={`gap-3 ${toolbarMenuItemClass}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={toolbarButtonClass}
        disabled={listEnabled ? !paragraphState.canLiftListItem : !paragraphEnabled || paragraphAttributes.indentLeft <= 0}
        title="Disminuir sangría izquierda"
        aria-label="Disminuir sangría izquierda"
        onMouseDown={(event) => event.preventDefault()}
        onClick={decreaseIndent}
      >
        <IndentDecrease className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={toolbarButtonClass}
        disabled={listEnabled ? !paragraphState.canSinkListItem : !paragraphEnabled || paragraphAttributes.indentLeft >= 8}
        title="Aumentar sangría izquierda"
        aria-label="Aumentar sangría izquierda"
        onMouseDown={(event) => event.preventDefault()}
        onClick={increaseIndent}
      >
        <IndentIncrease className="h-4 w-4" />
      </Button>

      <ParagraphFormatDialog
        editor={editor}
        attributes={paragraphAttributes}
        disabled={!paragraphEnabled}
      />

      {onInsertDivider && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={toolbarButtonClass}
              title="Insertar separador"
              aria-label="Insertar separador ornamental"
              onMouseDown={(event) => event.preventDefault()}
            >
              <SeparatorHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={`w-64 ${toolbarMenuClass}`}>
            <DropdownMenuLabel>Separador de escena</DropdownMenuLabel>
            {SCENE_DIVIDER_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className={`gap-3 py-2 ${toolbarMenuItemClass}`}
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

      <div className="ml-auto flex shrink-0 items-center gap-0.5 border-l border-[#dadce0] pl-2">
        <span
          className="flex size-8 items-center justify-center rounded-md border border-[#dadce0] bg-white text-[#5f6368]"
          title={versionLabel}
          aria-label={versionLabel}
        >
          <FileText className="size-4" />
          <span className="sr-only">{versionLabel}</span>
        </span>
        {onInsertImage && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={toolbarButtonClass}
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
