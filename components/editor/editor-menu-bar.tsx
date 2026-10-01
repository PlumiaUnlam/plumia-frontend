import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import type { ReactNode } from "react"
import {
  Bold,
  Columns2,
  Download,
  Eye,
  Highlighter,
  ImagePlus,
  Italic,
  Languages,
  PaintRoller,
  Pilcrow,
  RemoveFormatting,
  Redo2,
  Save,
  Search,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  TextSelect,
  Underline,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditorTextStylesMenu } from "./editor-text-styles-menu"
import {
  SCENE_DIVIDER_OPTIONS,
  SceneDividerPreview,
  type SceneDividerVariant,
} from "./scene-divider"
import {
  clearTextFormatting,
  toggleSubscript,
  toggleSuperscript,
  toggleTextHighlight,
  toggleTextMark,
} from "./text-extra-formatting"
import { toggleFormatPainter, useFormatPainterState } from "./format-painter"

const menuButtonClass =
  "h-8 shrink-0 rounded-md px-2.5 text-sm font-medium text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124] data-[state=open]:bg-[#e8eaed] data-[state=open]:text-[#174ea6] max-[640px]:px-2"
const menuContentClass =
  "max-h-[min(80vh,42rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)]"
const menuItemClass = "gap-3 text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124]"

type EditorMenuBarProps = {
  editor: Editor
  projectId: string
  versionLabel: string
  onSave?: () => void
  onExportClick?: () => void
  onInsertImage?: () => void
  onInsertDivider?: (variant: SceneDividerVariant) => void
  onAnalyzeChanges?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
  onToggleZenMode?: () => void
  onOpenSearch?: () => void
  onOpenSpellcheckSettings?: () => void
  onOpenParagraphFormat?: () => void
  onToggleSplit?: () => void
  isSplit?: boolean
  canSplit?: boolean
}

export function EditorMenuBar({
  editor,
  projectId,
  versionLabel,
  onSave,
  onExportClick,
  onInsertImage,
  onInsertDivider,
  onAnalyzeChanges,
  isAnalysisSaving = false,
  isZenMode = false,
  onToggleZenMode,
  onOpenSearch,
  onOpenSpellcheckSettings,
  onOpenParagraphFormat,
  onToggleSplit,
  isSplit = false,
  canSplit = true,
}: EditorMenuBarProps) {
  const formatPainterActive = useFormatPainterState(editor)
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
      isBold: currentEditor.isActive("bold"),
      isItalic: currentEditor.isActive("italic"),
      isUnderline: currentEditor.isActive("underline"),
      isStrike: currentEditor.isActive("strike"),
      isSubscript: currentEditor.isActive("subscript"),
      isSuperscript: currentEditor.isActive("superscript"),
      isTextHighlight: currentEditor.isActive("textHighlight"),
      isParagraph: currentEditor.isActive("paragraph"),
    }),
  })

  const menuItem = (
    icon: ReactNode,
    label: string,
    action: () => void,
    shortcut?: string,
    disabled = false,
  ) => (
    <DropdownMenuItem
      className={menuItemClass}
      disabled={disabled}
      onSelect={action}
    >
      {icon}
      <span>{label}</span>
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  )

  const menu = (label: string, content: ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={menuButtonClass}
          onMouseDown={(event) => event.preventDefault()}
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={menuContentClass}>
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <nav
      aria-label="Menús del editor"
      className="editor-menu-bar mx-2 mt-1 flex min-h-10 min-w-0 flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-[#dadce0] bg-[#f8fafd] px-1 py-1 text-[#3c4043]"
    >
      {menu(
        "Archivo",
        <>
          <DropdownMenuLabel className="truncate">{versionLabel}</DropdownMenuLabel>
          {menuItem(
            <Save className="size-4" />,
            "Guardar cambios",
            () => onSave?.(),
            "Ctrl/Cmd+S",
            !onSave,
          )}
          <DropdownMenuSeparator />
          {menuItem(
            <Download className="size-4" />,
            "Exportar libro",
            () => onExportClick?.(),
            undefined,
            !onExportClick,
          )}
        </>,
      )}

      {menu(
        "Editar",
        <>
          {menuItem(
            <Undo2 className="size-4" />,
            "Deshacer",
            () => editor.chain().focus().undo().run(),
            "Ctrl/Cmd+Z",
            !editorState.canUndo,
          )}
          {menuItem(
            <Redo2 className="size-4" />,
            "Rehacer",
            () => editor.chain().focus().redo().run(),
            "Ctrl/Cmd+Y",
            !editorState.canRedo,
          )}
          <DropdownMenuSeparator />
          {menuItem(
            <TextSelect className="size-4" />,
            "Seleccionar todo",
            () => editor.chain().focus().selectAll().run(),
            "Ctrl/Cmd+A",
          )}
          {menuItem(
            <Search className="size-4" />,
            "Buscar y reemplazar",
            () => onOpenSearch?.(),
            "Ctrl/Cmd+Shift+F",
            !onOpenSearch,
          )}
        </>,
      )}

      {menu(
        "Insertar",
        <>
          {menuItem(
            <ImagePlus className="size-4" />,
            "Imagen",
            () => onInsertImage?.(),
            undefined,
            !onInsertImage,
          )}
          {onInsertDivider && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Separador de escena</DropdownMenuLabel>
              {SCENE_DIVIDER_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  className={`${menuItemClass} gap-3 py-2`}
                  onSelect={() => onInsertDivider(option.value)}
                >
                  <SceneDividerPreview
                    variant={option.value}
                    className="w-20 shrink-0"
                  />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </>,
      )}

      {menu(
        "Formato",
        <>
          <DropdownMenuCheckboxItem
            checked={editorState.isBold}
            className={menuItemClass}
            onCheckedChange={() => toggleTextMark(editor, "bold")}
          >
            <Bold className="mr-2 size-4" /> Negrita
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editorState.isItalic}
            className={menuItemClass}
            onCheckedChange={() => toggleTextMark(editor, "italic")}
          >
            <Italic className="mr-2 size-4" /> Cursiva
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editorState.isUnderline}
            className={menuItemClass}
            onCheckedChange={() => toggleTextMark(editor, "underline")}
          >
            <Underline className="mr-2 size-4" /> Subrayado
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editorState.isStrike}
            className={menuItemClass}
            onCheckedChange={() => toggleTextMark(editor, "strike")}
          >
            <Strikethrough className="mr-2 size-4" /> Tachado
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={editorState.isSubscript}
            className={menuItemClass}
            onCheckedChange={() => toggleSubscript(editor)}
          >
            <Subscript className="mr-2 size-4" /> Subíndice
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editorState.isSuperscript}
            className={menuItemClass}
            onCheckedChange={() => toggleSuperscript(editor)}
          >
            <Superscript className="mr-2 size-4" /> Superíndice
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editorState.isTextHighlight}
            className={menuItemClass}
            onCheckedChange={() => toggleTextHighlight(editor)}
          >
            <Highlighter className="mr-2 size-4" /> Resaltado
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {menuItem(
            <PaintRoller className="size-4" />,
            formatPainterActive ? "Cancelar copia de formato" : "Copiar formato",
            () => toggleFormatPainter(editor),
          )}
          {menuItem(
            <RemoveFormatting className="size-4" />,
            "Limpiar formato",
            () => clearTextFormatting(editor),
          )}
          <DropdownMenuSeparator />
          {menuItem(
            <Pilcrow className="size-4" />,
            "Opciones de párrafo…",
            () => onOpenParagraphFormat?.(),
            undefined,
            !onOpenParagraphFormat || !editorState.isParagraph,
          )}
        </>,
      )}

      <EditorTextStylesMenu
        editor={editor}
        projectId={projectId}
        onSave={onSave}
      />

      {menu(
        "Revisar",
        <>
          {menuItem(
            <Sparkles className="size-4" />,
            isAnalysisSaving ? "Analizando cambios…" : "Analizar cambios",
            () => onAnalyzeChanges?.(),
            undefined,
            !onAnalyzeChanges || isAnalysisSaving,
          )}
          {menuItem(
            <Languages className="size-4" />,
            "Configuración del corrector",
            () => onOpenSpellcheckSettings?.(),
            undefined,
            !onOpenSpellcheckSettings,
          )}
        </>,
      )}

      {menu(
        "Ver",
        <>
          {menuItem(
            <Eye className="size-4" />,
            isZenMode ? "Salir del modo Zen" : "Entrar en modo Zen",
            () => onToggleZenMode?.(),
            undefined,
            !onToggleZenMode,
          )}
          {onToggleSplit && (
            <DropdownMenuItem
              className={menuItemClass}
              disabled={!canSplit && !isSplit}
              onSelect={onToggleSplit}
            >
              <Columns2 className="size-4" />
              <span>{isSplit ? "Cerrar pantalla dividida" : "Pantalla dividida"}</span>
            </DropdownMenuItem>
          )}
        </>,
      )}
    </nav>
  )
}
