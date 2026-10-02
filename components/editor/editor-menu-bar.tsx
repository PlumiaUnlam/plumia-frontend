import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import type { ReactNode } from "react"
import {
  Bold,
  Columns2,
  Download,
  Maximize2,
  Minimize2,
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
  Menubar,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarPortal,
  MenubarSubTrigger,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { SceneDividerMenuOptions } from "./scene-divider-menu"
import { EditorTextStylesMenu } from "./editor-text-styles-menu"
import {
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
  "h-8 shrink-0 rounded-md px-2.5 text-sm font-medium text-[#3c4043] hover:bg-[#eee3f5] hover:text-[#70348c] data-[state=open]:bg-[#eee3f5] data-[state=open]:text-[#70348c] focus-visible:ring-2 focus-visible:ring-[#b98ad2] max-[640px]:px-2"
const menuContentClass =
  "max-h-[min(80vh,42rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)]"
const menuItemClass = "min-h-9 gap-3 text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124]"

type EditorMenuBarProps = {
  editor: Editor
  projectId: string
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
  toolbarExpanded: boolean
  onToggleToolbar: () => void
}

export function EditorMenuBar({
  editor,
  projectId,
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
  toolbarExpanded,
  onToggleToolbar,
}: Readonly<EditorMenuBarProps>) {
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
    <MenubarItem
      className={menuItemClass}
      disabled={disabled}
      onSelect={action}
    >
      {icon}
      <span>{label}</span>
      {shortcut && <MenubarShortcut>{shortcut}</MenubarShortcut>}
    </MenubarItem>
  )

  const menu = (label: string, content: ReactNode) => (
    <MenubarMenu>
      <MenubarTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={menuButtonClass}
          onMouseDown={(event) => event.preventDefault()}
        >
          {label}
        </Button>
      </MenubarTrigger>
      <MenubarContent
        align="start"
        className={menuContentClass}
        onCloseAutoFocus={(event) => {
          if (editor.isFocused) event.preventDefault()
        }}
      >
        {content}
      </MenubarContent>
    </MenubarMenu>
  )

  return (
    <Menubar
      aria-label="Menús del editor"
      className={`editor-menu-bar mx-2 mt-1 flex h-auto min-h-10 min-w-0 flex-wrap items-center gap-0.5 border border-[#dadce0] bg-[#f8fafd] px-1 py-1 text-[#3c4043] ${toolbarExpanded ? "rounded-t-lg border-b-0" : "mb-1 rounded-lg"}`}
    >
      {menu(
        "Archivo",
        <>
          {menuItem(
            <Save className="size-4" />,
            "Guardar cambios",
            () => onSave?.(),
            "Ctrl/Cmd+S",
            !onSave,
          )}
          <MenubarSeparator />
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
          <MenubarSeparator />
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
            <MenubarSub>
              <MenubarSubTrigger className={menuItemClass}>Separador de escena</MenubarSubTrigger>
              <MenubarPortal>
                <MenubarSubContent className={menuContentClass}>
                  <SceneDividerMenuOptions editor={editor} onInsert={onInsertDivider} menuType="menubar" />
                </MenubarSubContent>
              </MenubarPortal>
            </MenubarSub>
          )}
        </>,
      )}

      <EditorTextStylesMenu
        editor={editor}
        projectId={projectId}
        onSave={onSave}
        renderMenu={(stylesMenu) => menu(
          "Formato",
          <>
          <MenubarSub>
            <MenubarSubTrigger className={menuItemClass}>Texto</MenubarSubTrigger>
            <MenubarPortal>
              <MenubarSubContent className={menuContentClass}>
              <MenubarCheckboxItem
                checked={editorState.isBold}
                className={menuItemClass}
                onCheckedChange={() => toggleTextMark(editor, "bold")}
              >
                <Bold className="mr-2 size-4" /> Negrita
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={editorState.isItalic}
                className={menuItemClass}
                onCheckedChange={() => toggleTextMark(editor, "italic")}
              >
                <Italic className="mr-2 size-4" /> Cursiva
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={editorState.isUnderline}
                className={menuItemClass}
                onCheckedChange={() => toggleTextMark(editor, "underline")}
              >
                <Underline className="mr-2 size-4" /> Subrayado
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={editorState.isStrike}
                className={menuItemClass}
                onCheckedChange={() => toggleTextMark(editor, "strike")}
              >
                <Strikethrough className="mr-2 size-4" /> Tachado
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarCheckboxItem
                checked={editorState.isSubscript}
                className={menuItemClass}
                onCheckedChange={() => toggleSubscript(editor)}
              >
                <Subscript className="mr-2 size-4" /> Subíndice
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={editorState.isSuperscript}
                className={menuItemClass}
                onCheckedChange={() => toggleSuperscript(editor)}
              >
                <Superscript className="mr-2 size-4" /> Superíndice
              </MenubarCheckboxItem>
              <MenubarCheckboxItem
                checked={editorState.isTextHighlight}
                className={menuItemClass}
                onCheckedChange={() => toggleTextHighlight(editor)}
              >
                <Highlighter className="mr-2 size-4" /> Resaltado
              </MenubarCheckboxItem>
              <MenubarSeparator />
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
              </MenubarSubContent>
            </MenubarPortal>
          </MenubarSub>
          {stylesMenu}
          <MenubarSeparator />
          {menuItem(
            <Pilcrow className="size-4" />,
            "Opciones de párrafo…",
            () => onOpenParagraphFormat?.(),
            undefined,
            !onOpenParagraphFormat || !editorState.isParagraph,
          )}
          </>,
        )}
      />

      {menu(
        "Revisar",
        <>
          {menuItem(
            <Sparkles className="size-4" />,
            isAnalysisSaving ? "Programando análisis…" : "Analizar cambios",
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
            <Maximize2 className="size-4" />,
            isZenMode ? "Salir del modo sin distracciones" : "Sin distracciones",
            () => onToggleZenMode?.(),
            undefined,
            !onToggleZenMode,
          )}
          {onToggleSplit && (
            <MenubarItem
              className={menuItemClass}
              disabled={!canSplit && !isSplit}
              onSelect={onToggleSplit}
            >
              <Columns2 className="size-4" />
              <span>{isSplit ? "Cerrar pantalla dividida" : "Pantalla dividida"}</span>
            </MenubarItem>
          )}
        </>,
      )}

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="ml-auto size-8 shrink-0 rounded-md text-[#3c4043] hover:bg-[#eee3f5] hover:text-[#70348c] focus-visible:ring-2 focus-visible:ring-[#b98ad2]"
        aria-expanded={toolbarExpanded}
        aria-controls="editor-formatting-toolbar"
        aria-label={
          toolbarExpanded ? "Ocultar herramientas" : "Mostrar herramientas"
        }
        title={toolbarExpanded ? "Ocultar herramientas" : "Mostrar herramientas"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggleToolbar}
      >
        {toolbarExpanded ? (
          <Minimize2 className="size-4" />
        ) : (
          <Maximize2 className="size-4" />
        )}
      </Button>
    </Menubar>
  )
}
