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
  Pilcrow,
  RotateCcw,
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

import { ToolbarButton as Button } from "./toolbar-button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getActiveTextColor } from "./text-formatting"
import { SceneDividerMenuOptions } from "./scene-divider-menu"
import { AnalysisButton } from "./analysis/analysis-button"
import {
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
  "h-8 w-8 rounded-md p-1 text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124] focus-visible:ring-2 focus-visible:ring-[#a8c7fa] dark:text-foreground dark:hover:bg-muted dark:hover:text-foreground dark:focus-visible:ring-ring [&_svg]:size-3.5 max-[640px]:h-9 max-[640px]:w-9"
const toolbarGroupClass = "flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-0.5"
const toolbarLabelButtonClass = "h-8 gap-1.5 rounded-md px-2 text-xs text-[#3c4043] hover:bg-[#e8eaed] focus-visible:ring-2 focus-visible:ring-[#a8c7fa] dark:text-foreground dark:hover:bg-muted dark:focus-visible:ring-ring"
const toolbarMenuClass =
  "border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)] dark:border-border dark:bg-popover dark:text-popover-foreground"
const toolbarMenuItemClass =
  "text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124] dark:text-foreground dark:focus:bg-accent dark:focus:text-accent-foreground"
const activeToolbarClass =
  "bg-[#d3e3fd] text-[#174ea6] hover:bg-[#c2d7f8] dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30"

function renderWhen<T>(condition: unknown, content: T): T | null {
  if (!condition) return null
  return content
}

function getToggleButtonClass(active: boolean, baseClass: string) {
  return active ? `${baseClass} ${activeToolbarClass}` : baseClass
}

function getHighlightButtonClass(active: boolean) {
  return active ? "bg-[#fff3b0] hover:bg-[#ffe680]" : ""
}

function getImageUploadIcon(isUploading: boolean) {
  if (isUploading) return <Loader2 className="size-4 animate-spin" />
  return <ImagePlus className="size-4" />
}

function getFormatPainterTitle(active: boolean) {
  if (active) {
    return "Formato copiado. Seleccioná el texto destino o Esc para cancelar."
  }
  return "Copiar formato"
}

function getFormatPainterLabel(active: boolean) {
  return active ? "Cancelar o aplicar formato" : "Copiar formato"
}

function getHighlightActionLabel(active: boolean) {
  return active ? "Quitar resaltado" : "Aplicar color actual"
}

function getTextColorValue(color: string) {
  return color === "inherit" ? "currentColor" : color
}

function getFontSizeValue(value: string) {
  if (value === "normal") return null
  return value as TextFontSize
}

function getIndentDisabled(
  listEnabled: boolean,
  canChangeList: boolean,
  paragraphEnabled: boolean,
  indent: number,
  direction: "increase" | "decrease",
) {
  if (listEnabled) return !canChangeList
  if (!paragraphEnabled) return true
  return direction === "increase" ? indent >= 8 : indent <= 0
}

function getSplitButtonTitle(canSplit: boolean, isSplit: boolean) {
  if (canSplit || isSplit) return undefined
  return "Necesitás al menos dos secciones para dividir la pantalla"
}

function getSplitButtonLabel(isSplit: boolean) {
  return isSplit ? "Cerrar pantalla dividida" : "Pantalla dividida"
}

function getTextColorIndicator(color: string) {
  return { color: getTextColorValue(color) }
}

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

function getAlignmentIcon(alignment: ParagraphAlignment) {
  switch (alignment) {
    case "center":
      return <AlignCenter className="h-4 w-4" />
    case "right":
      return <AlignRight className="h-4 w-4" />
    case "justify":
      return <AlignJustify className="h-4 w-4" />
    default:
      return <AlignLeft className="h-4 w-4" />
  }
}

interface EditorToolbarProps {
  editor: Editor
  onInsertImage?: () => void
  isUploadingImage?: boolean
  onAnalyzeChanges?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
  onInsertDivider?: (variant: SceneDividerVariant) => void
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
  paragraphDialogOpen: boolean
  onParagraphDialogOpenChange: (open: boolean) => void
}

export function EditorToolbar({
  editor,
  onInsertImage,
  isUploadingImage = false,
  onAnalyzeChanges,
  isAnalysisSaving = false,
  isZenMode = false,
  onInsertDivider,
  onToggleSplit,
  isSplit = false,
  canSplit = true,
  paragraphDialogOpen,
  onParagraphDialogOpenChange,
}: Readonly<EditorToolbarProps>) {
  const paragraphState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isParagraph: currentEditor.isActive("paragraph"),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
      isBulletList: currentEditor.isActive("bulletList"),
      isOrderedList: currentEditor.isActive("orderedList"),
      isTextColor: currentEditor.isActive("textColor"),
      textColor: getActiveTextColor(currentEditor),
      highlightColor: getTextHighlightColor(currentEditor),
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
  const alignmentIcon = getAlignmentIcon(paragraphAttributes.textAlign)
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
    <TooltipProvider delayDuration={350}>
      <div
        id="editor-formatting-toolbar"
        className="editor-toolbar mx-2 mb-1 flex min-w-0 flex-col gap-1 rounded-b-lg border border-[#dadce0] bg-[#f8f9fa] px-2 py-2 text-[#3c4043] shadow-sm dark:border-border dark:bg-card dark:text-card-foreground"
      >
        <div className="flex min-h-8 w-full flex-wrap items-center gap-1">
          <fieldset className={`${toolbarGroupClass} border-0`} style={{ padding: 0, margin: 0, minWidth: 0 }}>
            <legend className="sr-only">Historial</legend>
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

          </fieldset>
          <fieldset className={`${toolbarGroupClass} border-0 border-l border-[#dadce0] pl-2 dark:border-border`} style={{ padding: 0, paddingLeft: "0.5rem", margin: 0, minWidth: 0 }}>
            <legend className="sr-only">Fuente y tamaño</legend>

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={getToggleButtonClass(formatPainterActive, toolbarButtonClass)}
              disabled={!editor.isEditable}
              title={getFormatPainterTitle(formatPainterActive)}
              aria-label={getFormatPainterLabel(formatPainterActive)}
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
                  className="h-7 w-32 rounded-md border-[#dadce0] bg-white px-2 text-sm text-[#3c4043] shadow-none focus-visible:ring-2 focus-visible:ring-[#a8c7fa] dark:border-border dark:bg-input/30 dark:text-foreground dark:focus-visible:ring-ring"
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
                    className="h-7 w-32 justify-between gap-2 border-[#dadce0] bg-white px-2 text-sm font-normal text-[#3c4043] shadow-none hover:bg-[#f8fafd] hover:text-[#202124] dark:border-border dark:bg-input/30 dark:text-foreground dark:hover:bg-input/50 dark:hover:text-foreground"
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

            <div className="mx-1 flex h-7 items-center gap-0.5 border-x border-[#dadce0] px-1 dark:border-border">
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
                    className="h-7 min-w-10 border-[#80868b] bg-white px-1.5 text-sm font-normal text-[#3c4043] shadow-none hover:bg-[#f8fafd] hover:text-[#202124] dark:border-border dark:bg-input/30 dark:text-foreground dark:hover:bg-input/50 dark:hover:text-foreground"
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
                        getFontSizeValue(value),
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

          </fieldset>
          <fieldset className={`${toolbarGroupClass} flex-wrap border-0 border-l border-[#dadce0] pl-2 dark:border-border`} style={{ padding: 0, paddingLeft: "0.5rem", margin: 0, minWidth: 0 }}>
            <legend className="sr-only">Formato de texto</legend>

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={getToggleButtonClass(paragraphState.isBold, toolbarButtonClass)}
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
              className={getToggleButtonClass(paragraphState.isItalic, toolbarButtonClass)}
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
              className={getToggleButtonClass(paragraphState.isUnderline, toolbarButtonClass)}
              title="Subrayado"
              aria-label="Subrayado"
              aria-pressed={paragraphState.isUnderline}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => toggleTextMark(editor, "underline")}
            >
              <Underline />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="ghost"
                  className={`${toolbarLabelButtonClass} relative ${getHighlightButtonClass(paragraphState.isTextHighlight)}`}
                  title="Resaltado y color" aria-label="Resaltado y color"
                  onMouseDown={(event) => event.preventDefault()}>
                  <Highlighter className="size-4" />
                  <ChevronDown className="size-3" />
                  <span aria-hidden="true" className="absolute bottom-0.5 left-2 h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: paragraphState.highlightColor }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={`w-[min(24rem,calc(100vw-1rem))] max-h-[min(70vh,28rem)] overflow-y-auto p-2 ${toolbarMenuClass}`}>
                <DropdownMenuLabel>Resaltado</DropdownMenuLabel>
                <DropdownMenuItem className={toolbarMenuItemClass} onSelect={() => toggleTextHighlight(editor)}>
                  <Highlighter className="size-4" /> {getHighlightActionLabel(paragraphState.isTextHighlight)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ColorPalette editor={editor} kind="highlight" menuItemClass={toolbarMenuItemClass} />
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className={getToggleButtonClass(paragraphState.isTextColor, toolbarButtonClass)}
                  title="Color de texto"
                  aria-label="Cambiar color de texto"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <Baseline className="h-4 w-4" style={getTextColorIndicator(paragraphState.textColor)} />
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" className={toolbarLabelButtonClass}
                  onMouseDown={(event) => event.preventDefault()}>
                  Más formato <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={`w-56 ${toolbarMenuClass}`}>
                <DropdownMenuCheckboxItem checked={paragraphState.isStrike} className={toolbarMenuItemClass}
                  onCheckedChange={() => toggleTextMark(editor, "strike")}>
                  <Strikethrough className="mr-2 size-4" /> Tachado
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={paragraphState.isSubscript} className={toolbarMenuItemClass}
                  onCheckedChange={() => toggleSubscript(editor)}>
                  <Subscript className="mr-2 size-4" /> Subíndice
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={paragraphState.isSuperscript} className={toolbarMenuItemClass}
                  onCheckedChange={() => toggleSuperscript(editor)}>
                  <Superscript className="mr-2 size-4" /> Superíndice
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={toolbarMenuItemClass} onSelect={() => clearTextFormatting(editor)}>
                  <RemoveFormatting className="size-4" /> Limpiar formato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </fieldset>
        </div>

        <div className="flex w-full flex-wrap items-center gap-1">
          <fieldset className={`${toolbarGroupClass} border-0`} style={{ padding: 0, margin: 0, minWidth: 0 }}>
            <legend className="sr-only">Listas</legend>

            <div className="flex items-center">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className={`${getToggleButtonClass(paragraphState.isBulletList, toolbarButtonClass)} rounded-r-none pr-1`}
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
                    className={`${getToggleButtonClass(paragraphState.isBulletList, toolbarButtonClass)} -ml-px rounded-l-none px-0.5`}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className={toolbarMenuItemClass} disabled={!listEnabled}
                    onSelect={() => removeCurrentList(editor)}>
                    <ListX className="size-4" /> Quitar formato de lista
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className={`${getToggleButtonClass(paragraphState.isOrderedList, toolbarButtonClass)} rounded-r-none pr-1`}
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
                    className={`${getToggleButtonClass(paragraphState.isOrderedList, toolbarButtonClass)} -ml-px rounded-l-none px-0.5`}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className={toolbarMenuItemClass} disabled={!listEnabled}
                    onSelect={() => removeCurrentList(editor)}>
                    <ListX className="size-4" /> Quitar formato de lista
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ListNumberingActionsButton editor={editor} />

          </fieldset>
          <fieldset className={`${toolbarGroupClass} border-0 border-l border-[#dadce0] pl-2 dark:border-border`} style={{ padding: 0, paddingLeft: "0.5rem", margin: 0, minWidth: 0 }}>
            <legend className="sr-only">Párrafo</legend>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={toolbarLabelButtonClass}
                  disabled={!paragraphEnabled}
                  title="Alineación del párrafo"
                  aria-label="Alineación del párrafo"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {alignmentIcon}
                  Alineación <ChevronDown className="h-3 w-3" />
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
              disabled={getIndentDisabled(listEnabled, paragraphState.canLiftListItem, paragraphEnabled, paragraphAttributes.indentLeft, "decrease")}
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
              disabled={getIndentDisabled(listEnabled, paragraphState.canSinkListItem, paragraphEnabled, paragraphAttributes.indentLeft, "increase")}
              title="Aumentar sangría izquierda"
              aria-label="Aumentar sangría izquierda"
              onMouseDown={(event) => event.preventDefault()}
              onClick={increaseIndent}
            >
              <IndentIncrease className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" className={toolbarLabelButtonClass}
                  disabled={!paragraphEnabled} onMouseDown={(event) => event.preventDefault()}>
                  <Pilcrow className="size-4" /> Párrafo <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className={`w-56 ${toolbarMenuClass}`}>
                <DropdownMenuItem className={toolbarMenuItemClass} onSelect={() => onParagraphDialogOpenChange(true)}>
                  <Pilcrow className="size-4" /> Opciones de párrafo…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={toolbarMenuItemClass}
                  onSelect={() => updateParagraph({ indentLeft: 0, indentRight: 0, firstLineIndent: 0 })}>
                  <RotateCcw className="size-4" /> Restablecer sangrías
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </fieldset>
          <fieldset className={`${toolbarGroupClass} border-0 border-l border-[#dadce0] pl-2 dark:border-border`} style={{ padding: 0, paddingLeft: "0.5rem", margin: 0, minWidth: 0 }}>
            <legend className="sr-only">Insertar</legend>
              {renderWhen(onInsertImage, (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={toolbarLabelButtonClass}
                  disabled={isUploadingImage}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onInsertImage}
                  title="Insertar imagen"
                  aria-label="Insertar imagen"
                >
                  {getImageUploadIcon(isUploadingImage)}
                  Imagen
                </Button>
              ))}
            {renderWhen(onInsertDivider, (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={toolbarLabelButtonClass}
                    title="Insertar separador de escena"
                    aria-label="Insertar separador de escena"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <SeparatorHorizontal className="size-4" /> Escena <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={`w-64 ${toolbarMenuClass}`}>
                    <SceneDividerMenuOptions editor={editor} onInsert={onInsertDivider!} />
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

          </fieldset>
          <fieldset className="m-0 ml-auto flex shrink-0 flex-wrap items-center gap-2 border-0 p-0">
            <legend className="sr-only">Vista y revisión</legend>
            {renderWhen(onToggleSplit, (
              <Button type="button" size="sm" variant="outline"
                className="h-8 gap-2 border-[#dadce0] bg-transparent px-3 text-xs text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124] dark:border-border dark:text-foreground dark:hover:bg-muted dark:hover:text-foreground"
                disabled={getSplitButtonTitle(canSplit, isSplit) !== undefined} onMouseDown={(event) => event.preventDefault()}
                onClick={onToggleSplit!} aria-pressed={isSplit}
                title={getSplitButtonTitle(canSplit, isSplit)}>
                <Columns2 className="size-4" />
                {getSplitButtonLabel(isSplit)}
              </Button>
            ))}
            {renderWhen(onAnalyzeChanges, <AnalysisButton isSaving={isAnalysisSaving} onClick={onAnalyzeChanges!} />)}
          </fieldset>
        </div>
        <ParagraphFormatDialog
          key={paragraphDialogOpen ? "open" : "closed"}
          editor={editor}
          attributes={paragraphAttributes}
          open={paragraphDialogOpen}
          onOpenChange={onParagraphDialogOpenChange}
        />
      </div>
    </TooltipProvider>
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
