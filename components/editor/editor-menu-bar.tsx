import type { Editor } from "@tiptap/react"
import type { ReactNode } from "react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Redo2,
  RotateCcw,
  Save,
  Search,
  SeparatorHorizontal,
  Sparkles,
  TextSelect,
  Undo2,
} from "lucide-react"
import { useEditorState } from "@tiptap/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SCENE_DIVIDER_OPTIONS,
  type SceneDividerVariant,
} from "./scene-divider"
import {
  DEFAULT_PARAGRAPH_ATTRIBUTES,
  type ParagraphAlignment,
  type ParagraphAttributes,
} from "./paragraph-formatting"

const menuButtonClass =
  "h-8 rounded-md px-3 text-sm font-medium text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124] data-[state=open]:bg-[#d2e3fc] data-[state=open]:text-[#174ea6]"
const menuContentClass =
  "border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)]"
const menuItemClass = "text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124]"

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

type EditorMenuBarProps = {
  editor: Editor
  versionLabel: string
  onSave?: () => void
  onInsertImage?: () => void
  onInsertDivider?: (variant: SceneDividerVariant) => void
  onAnalyzeChanges?: () => void
  onToggleZenMode?: () => void
  onOpenSearch?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
}

export function EditorMenuBar({
  editor,
  versionLabel,
  onSave,
  onInsertImage,
  onInsertDivider,
  onAnalyzeChanges,
  onToggleZenMode,
  onOpenSearch,
  isAnalysisSaving = false,
  isZenMode = false,
}: EditorMenuBarProps) {
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
      isParagraph: currentEditor.isActive("paragraph"),
      isBold: currentEditor.isActive("bold"),
      isItalic: currentEditor.isActive("italic"),
      paragraphAttributes: currentEditor.getAttributes(
        "paragraph",
      ) as Partial<ParagraphAttributes>,
    }),
  })

  const paragraphAttributes: ParagraphAttributes = {
    ...DEFAULT_PARAGRAPH_ATTRIBUTES,
    ...editorState.paragraphAttributes,
  }
  const paragraphEnabled = editorState.isParagraph

  const updateParagraph = (attributes: Partial<ParagraphAttributes>) => {
    editor.chain().focus().updateAttributes("paragraph", attributes).run()
  }

  const menuItem = (
    icon: ReactNode,
    label: string,
    action: () => void,
    shortcut?: string,
    disabled = false,
  ) => (
    <DropdownMenuItem
      className={`gap-3 ${menuItemClass}`}
      disabled={disabled}
      onSelect={action}
    >
      {icon}
      <span>{label}</span>
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  )

  return (
    <nav
      aria-label="Menú del editor"
      className="mx-2 mt-1 flex min-h-10 flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-[#dadce0] bg-[#f8fafd] px-1"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Archivo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-56 ${menuContentClass}`}>
          <DropdownMenuLabel>{versionLabel}</DropdownMenuLabel>
          {menuItem(
            <Save className="h-4 w-4" />,
            "Guardar cambios",
            () => onSave?.(),
            "Ctrl/Cmd+S",
            !onSave,
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Editar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-56 ${menuContentClass}`}>
          {menuItem(
            <Undo2 className="h-4 w-4" />,
            "Deshacer",
            () => editor.chain().focus().undo().run(),
            "Ctrl/Cmd+Z",
            !editorState.canUndo,
          )}
          {menuItem(
            <Redo2 className="h-4 w-4" />,
            "Rehacer",
            () => editor.chain().focus().redo().run(),
            "Ctrl/Cmd+Y",
            !editorState.canRedo,
          )}
          <DropdownMenuSeparator />
          {menuItem(
            <TextSelect className="h-4 w-4" />,
            "Seleccionar todo",
            () => editor.chain().focus().selectAll().run(),
            "Ctrl/Cmd+A",
          )}
          <DropdownMenuSeparator />
          {menuItem(
            <Search className="h-4 w-4" />,
            "Buscar y reemplazar",
            () => onOpenSearch?.(),
            "Ctrl/Cmd+Shift+F",
            !onOpenSearch,
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Insertar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-64 ${menuContentClass}`}>
          {menuItem(
            <ImagePlus className="h-4 w-4" />,
            "Imagen",
            () => onInsertImage?.(),
            undefined,
            !onInsertImage,
          )}
          {onInsertDivider && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={menuItemClass}>
                <SeparatorHorizontal className="h-4 w-4" />
                <span>Separador de escena</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className={`w-56 ${menuContentClass}`}>
                {SCENE_DIVIDER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={menuItemClass}
                    onSelect={() => onInsertDivider(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Diseño
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-60 ${menuContentClass}`}>
          {menuItem(
            <IndentDecrease className="h-4 w-4" />,
            "Disminuir sangría",
            () =>
              updateParagraph({
                indentLeft: Math.max(0, paragraphAttributes.indentLeft - 1),
              }),
            undefined,
            !paragraphEnabled || paragraphAttributes.indentLeft <= 0,
          )}
          {menuItem(
            <IndentIncrease className="h-4 w-4" />,
            "Aumentar sangría",
            () =>
              updateParagraph({
                indentLeft: Math.min(8, paragraphAttributes.indentLeft + 1),
              }),
            undefined,
            !paragraphEnabled || paragraphAttributes.indentLeft >= 8,
          )}
          <DropdownMenuSeparator />
          {menuItem(
            <RotateCcw className="h-4 w-4" />,
            "Restablecer sangrías",
            () =>
              updateParagraph({
                indentLeft: 0,
                indentRight: 0,
                firstLineIndent: 0,
              }),
            undefined,
            !paragraphEnabled,
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Formato
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-56 ${menuContentClass}`}>
          <DropdownMenuCheckboxItem
            checked={editorState.isBold}
            className={menuItemClass}
            onCheckedChange={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="mr-2 h-4 w-4" /> Negrita
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editorState.isItalic}
            className={menuItemClass}
            onCheckedChange={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="mr-2 h-4 w-4" /> Cursiva
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
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
                className={`gap-3 ${menuItemClass}`}
                disabled={!paragraphEnabled}
              >
                <Icon className="h-4 w-4" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Revisar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-60 ${menuContentClass}`}>
          {menuItem(
            <Sparkles className="h-4 w-4" />,
            isAnalysisSaving ? "Analizando cambios…" : "Analizar cambios",
            () => onAnalyzeChanges?.(),
            undefined,
            !onAnalyzeChanges || isAnalysisSaving,
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={menuButtonClass}
            onMouseDown={(event) => event.preventDefault()}
          >
            Ver
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-52 ${menuContentClass}`}>
          {menuItem(
            <Eye className="h-4 w-4" />,
            isZenMode ? "Salir de modo Zen" : "Entrar en modo Zen",
            () => onToggleZenMode?.(),
            undefined,
            !onToggleZenMode,
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
