import type { Editor } from "@tiptap/react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  ChevronDown,
  Highlighter,
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
  Minus,
  Plus,
  PaintRoller,
  RemoveFormatting,
  SeparatorHorizontal,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from "lucide-react"
import { useEditorState } from "@tiptap/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  applyTextFontSize,
  getActiveTextFontSize,
  TEXT_FONT_SIZES,
  type TextFontSize,
} from "./text-font-size"
import {
  applyTextFontFamily,
  findTextFontFamilyByName,
  getActiveTextFontFamily,
  getFontFamilyCss,
  getFontFamilyLabel,
} from "./text-font-family"
import { TextFontFamilyMenuOptions } from "./text-font-family-menu-options"
import {
  toggleFormatPainter,
  useFormatPainterState,
} from "./format-painter"
import {
  clearTextFormatting,
  getTextHighlightColor,
  toggleSubscript,
  toggleSuperscript,
  toggleTextHighlight,
  toggleTextMark,
} from "./text-extra-formatting"

const toolbarButtonClass =
  "h-7 w-7 rounded-md p-1 text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124] [&_svg]:size-3.5"
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
      isBold: currentEditor.isActive("bold"),
      isItalic: currentEditor.isActive("italic"),
      isUnderline: currentEditor.isActive("underline"),
      isStrike: currentEditor.isActive("strike"),
      isSubscript: currentEditor.isActive("subscript"),
      isSuperscript: currentEditor.isActive("superscript"),
      isTextHighlight: currentEditor.isActive("textHighlight"),
      textFontSize: getActiveTextFontSize(currentEditor),
      textFontFamily: getActiveTextFontFamily(currentEditor),
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
  const displayedFontSize = paragraphState.textFontSize ?? "11pt"
  const displayedFontFamily = paragraphState.textFontFamily ?? "Lora"
  const formatPainterActive = useFormatPainterState(editor)
  const displayedFontSizeIndex = TEXT_FONT_SIZES.findIndex(
    ({ value }) => value === displayedFontSize,
  )
  const [isFontFamilyEditing, setIsFontFamilyEditing] = useState(false)
  const [fontFamilySearch, setFontFamilySearch] = useState("")
  const [isFontFamilyMenuOpen, setIsFontFamilyMenuOpen] = useState(false)

  const updateParagraph = (attributes: Partial<ParagraphAttributes>) => {
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { ...attributes, editorStyleId: null })
      .run()
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

  const changeFontSize = (direction: -1 | 1) => {
    const nextFontSize = TEXT_FONT_SIZES[displayedFontSizeIndex + direction]
    if (nextFontSize) applyTextFontSize(editor, nextFontSize.value)
  }

  const finishFontFamilySearch = () => {
    const fontFamily = findTextFontFamilyByName(fontFamilySearch)
    if (!fontFamily) return

    applyTextFontFamily(editor, fontFamily)
    setIsFontFamilyEditing(false)
  }

  const toolbar = (
    <div className="editor-toolbar mx-2 mb-1 flex flex-col gap-1 rounded-b-md border border-[#dadce0] bg-[#f1f3f4] px-2 py-1 text-[#3c4043] shadow-sm">
      <div className="flex w-full flex-wrap items-center gap-0.5">
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
        className={`${toolbarButtonClass} ${formatPainterActive ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        disabled={!editor.isEditable}
        title={
          formatPainterActive
            ? "Formato copiado. Seleccioná el texto destino o Esc para cancelar."
            : "Copiar formato"
        }
        aria-label={formatPainterActive ? "Cancelar o aplicar formato" : "Copiar formato"}
        aria-pressed={formatPainterActive}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleFormatPainter(editor)}
      >
        <PaintRoller className="h-3.5 w-3.5" />
      </Button>

      <DropdownMenu
        open={isFontFamilyMenuOpen}
        onOpenChange={setIsFontFamilyMenuOpen}
      >
        {isFontFamilyEditing ? (
          <Input
            autoFocus
            value={fontFamilySearch}
            onChange={(event) => setFontFamilySearch(event.currentTarget.value)}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={() => setIsFontFamilyEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                finishFontFamilySearch()
              } else if (event.key === "Escape") {
                event.preventDefault()
                setIsFontFamilyEditing(false)
              }
            }}
            className="h-7 w-32 rounded-md border-[#dadce0] bg-white px-2 text-sm text-[#3c4043] shadow-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa]"
            style={{ fontFamily: getFontFamilyCss(displayedFontFamily) }}
            placeholder="Buscar fuente"
            aria-label="Escribir y aplicar una familia tipográfica"
            title="Escribe el nombre de una fuente y pulsa Enter"
          />
        ) : (
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-32 justify-between gap-2 border-[#dadce0] bg-white px-2 text-sm font-normal text-[#3c4043] shadow-none hover:bg-[#f8fafd] hover:text-[#202124]"
              style={{ fontFamily: getFontFamilyCss(displayedFontFamily) }}
              title={`Familia tipográfica: ${displayedFontFamily}. Doble clic para escribir una fuente.`}
              aria-label={`Familia tipográfica: ${displayedFontFamily}`}
              onMouseDown={(event) => event.preventDefault()}
              onDoubleClick={(event) => {
                event.preventDefault()
                setFontFamilySearch(getFontFamilyLabel(displayedFontFamily))
                setIsFontFamilyMenuOpen(false)
                setIsFontFamilyEditing(true)
              }}
            >
              <span className="truncate">
                {getFontFamilyLabel(displayedFontFamily)}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent
          align="start"
          className={`w-72 overflow-hidden p-0 ${toolbarMenuClass}`}
        >
          <TextFontFamilyMenuOptions
            value={displayedFontFamily}
            onValueChange={(value) => applyTextFontFamily(editor, value)}
            itemClassName={toolbarMenuItemClass}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 flex h-7 items-center gap-0.5 border-x border-[#dadce0] px-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={toolbarButtonClass}
          title="Disminuir tamaño de fuente"
          aria-label="Disminuir tamaño de fuente"
          disabled={displayedFontSizeIndex <= 0}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => changeFontSize(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 min-w-10 border-[#80868b] bg-white px-1.5 text-sm font-normal text-[#3c4043] shadow-none hover:bg-[#f8fafd] hover:text-[#202124]"
              title={`Tamaño de fuente: ${displayedFontSize.replace("pt", "")} pt`}
              aria-label={`Tamaño de fuente: ${displayedFontSize.replace("pt", "")} pt`}
              onMouseDown={(event) => event.preventDefault()}
            >
              {displayedFontSize.replace("pt", "")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={`w-40 max-h-[min(70vh,28rem)] overflow-y-auto ${toolbarMenuClass}`}
          >
            <DropdownMenuLabel>Tamaño de fuente</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={paragraphState.textFontSize ?? "normal"}
              onValueChange={(value) =>
                applyTextFontSize(
                  editor,
                  value === "normal" ? null : (value as TextFontSize),
                )
              }
            >
              <DropdownMenuRadioItem
                value="normal"
                className={toolbarMenuItemClass}
              >
                Normal
              </DropdownMenuRadioItem>
              {TEXT_FONT_SIZES.map(({ value, label }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  className={toolbarMenuItemClass}
                >
                  {label}
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
          title="Aumentar tamaño de fuente"
          aria-label="Aumentar tamaño de fuente"
          disabled={displayedFontSizeIndex >= TEXT_FONT_SIZES.length - 1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => changeFontSize(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mx-1 h-5 w-px bg-[#dadce0]" />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${paragraphState.isBold ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Negrita"
        aria-label="Negrita"
        aria-pressed={paragraphState.isBold}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleTextMark(editor, "bold")}
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${paragraphState.isItalic ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Cursiva"
        aria-label="Cursiva"
        aria-pressed={paragraphState.isItalic}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleTextMark(editor, "italic")}
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${paragraphState.isUnderline ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Subrayado"
        aria-label="Subrayado"
        aria-pressed={paragraphState.isUnderline}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleTextMark(editor, "underline")}
      >
        <Underline />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${paragraphState.isStrike ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Tachado"
        aria-label="Tachado"
        aria-pressed={paragraphState.isStrike}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleTextMark(editor, "strike")}
      >
        <Strikethrough />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${paragraphState.isSubscript ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Subíndice"
        aria-label="Subíndice"
        aria-pressed={paragraphState.isSubscript}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleSubscript(editor)}
      >
        <Subscript />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={`${toolbarButtonClass} ${paragraphState.isSuperscript ? "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8]" : ""}`}
        title="Superíndice"
        aria-label="Superíndice"
        aria-pressed={paragraphState.isSuperscript}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleSuperscript(editor)}
      >
        <Superscript />
      </Button>

      <div className="flex items-center">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className={`${toolbarButtonClass} ${paragraphState.isTextHighlight ? "bg-[#fff3b0] text-[#3c4043] hover:bg-[#ffe680]" : ""}`}
          title="Aplicar o quitar resaltado"
          aria-label="Aplicar o quitar resaltado"
          aria-pressed={paragraphState.isTextHighlight}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggleTextHighlight(editor)}
        >
          <Highlighter />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={`${toolbarButtonClass} relative h-6 w-4 px-0 [&_svg]:size-3`}
              title="Elegir color de resaltado"
              aria-label="Elegir color de resaltado"
              onMouseDown={(event) => event.preventDefault()}
            >
              <ChevronDown />
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 h-0.5 w-2.5 rounded-full"
                style={{ backgroundColor: getTextHighlightColor(editor) }}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={`w-[min(24rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[min(70vh,28rem)] overflow-y-auto p-2 ${toolbarMenuClass}`}
          >
            <DropdownMenuLabel>Color de resaltado</DropdownMenuLabel>
            <ColorPalette
              editor={editor}
              kind="highlight"
              menuItemClass={toolbarMenuItemClass}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className={toolbarButtonClass}
        title="Limpiar formato"
        aria-label="Limpiar formato"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => clearTextFormatting(editor)}
      >
        <RemoveFormatting />
      </Button>

      </div>

      <div className="flex w-full flex-wrap items-center gap-0.5">

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
          className={toolbarButtonClass}
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
          className="flex size-7 items-center justify-center rounded-md border border-[#dadce0] bg-white text-[#5f6368] [&_svg]:size-3.5"
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
    </div>
  )

  if (isZenMode) {
    return (
      <div className="group/zen-toolbar absolute inset-x-0 top-0 z-20 h-2 hover:h-20 focus-within:h-20">
        <div className="-translate-y-20 opacity-0 shadow-sm transition-all duration-200 group-hover/zen-toolbar:translate-y-0 group-hover/zen-toolbar:opacity-100 group-focus-within/zen-toolbar:translate-y-0 group-focus-within/zen-toolbar:opacity-100">
          {toolbar}
        </div>
      </div>
    )
  }

  return toolbar
}
