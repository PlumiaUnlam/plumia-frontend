"use client"

import { EditorSelect, EditorSelectOption, EditorSelectGroup } from "./editor-select"

import { useEffect, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import type { Editor } from "@tiptap/react"
import { useEditorState } from "@tiptap/react"
import {
  Check,
  Plus,
  Paintbrush,
  Pencil,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MenubarItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarPortal,
  MenubarSubTrigger,
} from "@/components/ui/menubar"
import { useEditorTextStyles } from "@/hooks/use-editor-text-styles"
import { hasPendingEditorTextStyleChanges } from "@/services/editor-text-style.service"
import { isDefaultEditorTextStyle } from "./default-editor-text-styles"
import {
  applyEditorTextStyle,
  getAppliedEditorStyleId,
  getEditorStyleKindForSelection,
  readEditorTextStyleFromSelection,
} from "./editor-text-styles"
import {
  TEXT_FONT_FAMILY_GROUPS,
  getFontFamilyCss,
  type TextFontFamily,
} from "./text-font-family"
import { TEXT_FONT_SIZES } from "./text-font-size"
import type {
  EditorTextStyle,
  EditorTextStyleDefinition,
  EditorTextStyleKind,
} from "@/types/editor-text-style"

type EditorTextStylesMenuProps = {
  editor: Editor
  projectId: string
  onSave?: () => void
  /** Mantiene los diálogos montados fuera del contenido que se cierra al elegir una opción. */
  renderMenu: (stylesMenu: ReactNode) => ReactNode
}

type StyleDraft = {
  name: string
  kind: EditorTextStyleKind
  definition: EditorTextStyleDefinition
}

const dropdownContentClass =
  "max-h-[min(75dvh,34rem)] w-72 overflow-x-hidden overflow-y-auto border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)] dark:border-border dark:bg-popover dark:text-popover-foreground"
const itemClass = "min-h-9 text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124] dark:text-foreground dark:focus:bg-accent dark:focus:text-accent-foreground"
const fieldClass =
  "h-9 py-0 rounded-md border-[#dadce0] bg-white px-2.5 text-sm text-[#3c4043] dark:border-border dark:bg-input/30 dark:text-foreground"

function readDraft(
  editor: Editor,
  kind = getEditorStyleKindForSelection(editor),
  name = "",
): StyleDraft {
  return {
    name,
    kind,
    definition: readEditorTextStyleFromSelection(editor),
  }
}

function replaceStyleDefinition(
  current: EditorTextStyleDefinition,
  changes: Partial<EditorTextStyleDefinition>,
): EditorTextStyleDefinition {
  return { ...current, ...changes }
}

function getStyleSaveLabel(saving: boolean, editing: boolean) {
  if (saving) return "Guardando…"
  return editing ? "Guardar cambios" : "Guardar estilo"
}

function getStylePreviewStyle(style: EditorTextStyle): CSSProperties {
  const definition = style.definition
  const fontSize = definition.fontSize
  const validFontSize =
    fontSize && /^\d+(?:\.\d+)?(?:pt|px|em|rem|%)$/i.test(fontSize)
      ? `clamp(0.8rem, ${fontSize}, 1.25rem)`
      : "0.875rem"
  const decorations = [
    definition.underline ? "underline" : "",
    definition.strike ? "line-through" : "",
  ].filter(Boolean)

  return {
    fontFamily: definition.fontFamily
      ? getFontFamilyCss(definition.fontFamily as TextFontFamily)
      : undefined,
    fontSize: validFontSize,
    fontWeight: definition.bold ? 700 : 400,
    fontStyle: definition.italic ? "italic" : "normal",
    color: definition.color && /^#[0-9a-f]{6}$/i.test(definition.color)
      ? definition.color
      : "#3c4043",
    backgroundColor:
      definition.highlightColor && /^#[0-9a-f]{6}$/i.test(definition.highlightColor)
        ? definition.highlightColor
        : undefined,
    textDecoration: decorations.length ? decorations.join(" ") : "none",
  }
}

export function EditorTextStylesMenu({
  editor,
  projectId,
  onSave,
  renderMenu,
}: Readonly<EditorTextStylesMenuProps>) {
  const { styles, isLoading, saveStyle, removeStyle, refresh } =
    useEditorTextStyles(projectId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStyle, setEditingStyle] = useState<EditorTextStyle | null>(null)
  const [draft, setDraft] = useState<StyleDraft>(() => readDraft(editor))
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const currentStyleId = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => getAppliedEditorStyleId(currentEditor),
  })
  const saveAfterEditorUpdate = () => {
    if (onSave) window.setTimeout(onSave, 0)
  }

  const openCreateDialog = () => {
    setEditingStyle(null)
    setDraft(readDraft(editor))
    setErrorMessage(null)
    setDialogOpen(true)
  }

  const openEditDialog = (style: EditorTextStyle) => {
    setEditingStyle(style)
    setDraft({
      name: style.name,
      kind: style.kind,
      definition: { ...style.definition },
    })
    setErrorMessage(null)
    setDialogOpen(true)
  }

  const openCustomizeDialog = (style: EditorTextStyle) => {
    setEditingStyle(null)
    setDraft({
      name: `${style.name} personalizado`,
      kind: style.kind,
      definition: { ...style.definition },
    })
    setErrorMessage(null)
    setDialogOpen(true)
  }

  const updateDefinitionFromSelection = async (style: EditorTextStyle) => {
    try {
      const result = await saveStyle(
        {
          name: style.name,
          kind: style.kind,
          definition: {
            ...readEditorTextStyleFromSelection(editor),
            blockType: style.definition.blockType,
          },
        },
        style,
      )
      applyEditorTextStyle(editor, result.style)
      saveAfterEditorUpdate()
      setStatusMessage(
        result.pending
          ? "Sin conexión: el cambio quedó guardado en este dispositivo y se sincronizará al reconectarte."
          : `Se actualizó “${style.name}” en todos sus usos.`,
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el estilo.",
      )
    }
  }

  const saveDialog = async () => {
    const name = draft.name.trim()
    if (!name) {
      setErrorMessage("Escribí un nombre para el estilo.")
      return
    }

    setSaving(true)
    setErrorMessage(null)
    try {
      const result = await saveStyle(
        { ...draft, name },
        editingStyle ?? undefined,
      )
      if (!editingStyle) {
        applyEditorTextStyle(editor, result.style)
        saveAfterEditorUpdate()
      }
      let saveStatusMessage: string
      if (result.pending) {
        saveStatusMessage =
          "Sin conexión: el estilo quedó guardado en este dispositivo y se sincronizará al reconectarte."
      } else if (editingStyle) {
        saveStatusMessage = `Se actualizó “${name}” en todos sus usos.`
      } else {
        saveStatusMessage = `Se guardó “${name}” y se aplicó a la selección.`
      }
      setStatusMessage(saveStatusMessage)
      setDialogOpen(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el estilo.",
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (style: EditorTextStyle) => {
    try {
      const result = await removeStyle(style.id)
      setStatusMessage(
        result.pending
          ? "Sin conexión: la eliminación quedó pendiente de sincronización."
          : `Se quitó “${style.name}” de la lista de estilos.`,
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el estilo.",
      )
    }
  }

  const customStyleCount = styles.filter(
    (style) => !isDefaultEditorTextStyle(style) && style.isActive !== false,
  ).length
  const customNames = new Set(
    styles
      .filter(
        (style) =>
          !isDefaultEditorTextStyle(style) && style.isActive !== false,
      )
      .map((style) => `${style.kind}:${style.name.toLocaleLowerCase()}`),
  )
  const visibleStyles = styles.filter(
    (style) =>
      !isDefaultEditorTextStyle(style) ||
      !customNames.has(`${style.kind}:${style.name.toLocaleLowerCase()}`),
  )
  const groupedStyles = {
    text: visibleStyles.filter(
      (style) => style.isActive !== false && style.kind === "text",
    ),
    paragraph: visibleStyles.filter(
      (style) => style.isActive !== false && style.kind === "paragraph",
    ),
  }
  const availableStyleCount =
    groupedStyles.text.length + groupedStyles.paragraph.length

  const renderStyleItem = (style: EditorTextStyle) => {
    const isDefault = isDefaultEditorTextStyle(style)
    return (
      <MenubarSub key={style.id}>
        <MenubarSubTrigger
          className={`${itemClass} min-h-12 gap-2 whitespace-normal py-2`}
        >
          {currentStyleId === style.id ? (
            <Check className="size-4 shrink-0" />
          ) : (
            <span className="size-4 shrink-0" />
          )}
          <span
            className="min-w-0 flex-1 line-clamp-2 break-words leading-tight"
            style={getStylePreviewStyle(style)}
            title={style.name}
          >
            {style.name}
          </span>
        </MenubarSubTrigger>
        <MenubarPortal>
        <MenubarSubContent className={dropdownContentClass}>
          <MenubarItem
            className={itemClass}
            onSelect={() => {
              applyEditorTextStyle(editor, style)
              saveAfterEditorUpdate()
            }}
          >
            <Paintbrush className="mr-2 size-4" />
            Aplicar estilo
          </MenubarItem>
          {isDefault && (
            <MenubarItem
              className={itemClass}
              onSelect={() => openCustomizeDialog(style)}
            >
              <Pencil className="mr-2 size-4" />
              Guardar una copia personalizada…
            </MenubarItem>
          )}
          {!isDefault && (
            <>
              <MenubarItem
                className={itemClass}
                onSelect={() => openEditDialog(style)}
              >
                <Pencil className="mr-2 size-4" />
                Editar definición…
              </MenubarItem>
              <MenubarItem
                className={itemClass}
                onSelect={() => void updateDefinitionFromSelection(style)}
              >
                <Paintbrush className="mr-2 size-4" />
                Actualizar con la selección
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem
                className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => void handleDelete(style)}
              >
                <Trash2 className="size-4" />
                Eliminar estilo
              </MenubarItem>
            </>
          )}
        </MenubarSubContent>
        </MenubarPortal>
      </MenubarSub>
    )
  }

  useEffect(() => {
    const handleOffline = () => {
      setStatusMessage(
        "Sin conexión. Los cambios de estilo se guardarán en este dispositivo y se sincronizarán al reconectarte.",
      )
    }
    const handleOnline = async () => {
      if (!hasPendingEditorTextStyleChanges(projectId)) return
      setStatusMessage("Conexión restablecida. Sincronizando estilos pendientes…")
      try {
        await refresh()
        setStatusMessage(
          hasPendingEditorTextStyleChanges(projectId)
            ? "Algunos cambios siguen pendientes; se volverá a intentar al reconectarte."
            : "Los cambios de estilo pendientes ya se sincronizaron.",
        )
      } catch {
        setStatusMessage("No se pudieron sincronizar los estilos. Se volverá a intentar.")
      }
    }
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [projectId, refresh])

  const menuContent = (
    <>
          <MenubarLabel className="text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
            Estilos reutilizables
          </MenubarLabel>
          {statusMessage && (
            <output
              className="mx-2 mb-2 block rounded-md bg-[#e8f0fe] px-2.5 py-2 text-xs leading-5 text-[#174ea6]"
            >
              {statusMessage}
            </output>
          )}
          <MenubarItem className={itemClass} onSelect={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            Guardar selección como estilo…
          </MenubarItem>
          <MenubarSeparator />
          {isLoading && customStyleCount === 0 && (
            <p className="px-2.5 py-2 text-xs text-[#5f6368]">
              Cargando estilos personalizados…
            </p>
          )}
          {(["text", "paragraph"] as const).map((kind) => {
            const kindStyles = groupedStyles[kind]
            if (!kindStyles.length) return null
            const defaultStyles = kindStyles.filter(isDefaultEditorTextStyle)
            const customStyles = kindStyles.filter(
              (style) => !isDefaultEditorTextStyle(style),
            )
            return (
              <div key={kind}>
                <MenubarLabel className="px-2.5 pb-1 pt-2 text-xs font-medium text-[#5f6368]">
                  {kind === "text" ? "Texto seleccionado" : "Párrafos y títulos"}
                </MenubarLabel>
                {defaultStyles.length > 0 && (
                  <>
                    <MenubarLabel className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-[#5f6368]">
                      Predeterminados
                    </MenubarLabel>
                    {defaultStyles.map(renderStyleItem)}
                  </>
                )}
                {customStyles.length > 0 && (
                  <>
                    <MenubarLabel className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-[#5f6368]">
                      Personalizados
                    </MenubarLabel>
                    {customStyles.map(renderStyleItem)}
                  </>
                )}
              </div>
            )
          })}
          {!isLoading && customStyleCount === 0 && availableStyleCount > 0 && (
            <p className="px-2.5 py-2 text-xs text-[#5f6368]">
              Podés guardar una selección para crear estilos propios.
            </p>
          )}
    </>
  )

  return (
    <>
      {renderMenu(
      <MenubarSub>
        <MenubarSubTrigger className="min-h-9 gap-3 text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124]">
          Estilos de texto
        </MenubarSubTrigger>
        <MenubarPortal>
        <MenubarSubContent className={dropdownContentClass}>
          {menuContent}
        </MenubarSubContent>
        </MenubarPortal>
      </MenubarSub>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[min(48rem,calc(100vw-1.5rem))] max-w-none max-h-[min(90dvh,52rem)] overflow-x-hidden overflow-y-auto border-[#dadce0] bg-white p-5 dark:border-border dark:bg-popover sm:max-w-none sm:p-6">
          <DialogHeader className="mb-1 pr-10 sm:pr-12">
            <DialogTitle className="text-[#202124]">
              {editingStyle ? "Editar estilo" : "Guardar estilo reutilizable"}
            </DialogTitle>
            <DialogDescription className="text-[#5f6368]">
              Aplicá un nombre fácil de reconocer. Si modificás este estilo,
              cambiará en todos los lugares donde se usa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="editor-style-name">Nombre del estilo</Label>
              <Input
                id="editor-style-name"
                autoFocus
                maxLength={80}
                value={draft.name}
                placeholder="Por ejemplo: Voz del narrador"
                className={fieldClass}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="editor-style-kind">Aplicar a</Label>
              <EditorSelect
                id="editor-style-kind"
                value={draft.kind}
                disabled={Boolean(editingStyle)}
                className={fieldClass}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    kind: value as EditorTextStyleKind,
                  }))
                }
              >
                <EditorSelectOption value="text">Texto seleccionado</EditorSelectOption>
                <EditorSelectOption value="paragraph">Párrafo o párrafos</EditorSelectOption>
              </EditorSelect>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="editor-style-font">Familia tipográfica</Label>
                <EditorSelect
                  id="editor-style-font"
                  value={draft.definition.fontFamily ?? ""}
                  className={fieldClass}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        fontFamily: (value || null) as TextFontFamily | null,
                      }),
                    }))
                  }
                >
                  <EditorSelectOption value="">Heredar del documento</EditorSelectOption>
                  {TEXT_FONT_FAMILY_GROUPS.map((group) => (
                    <EditorSelectGroup key={group.label} label={group.label}>
                      {group.options.map((font) => (
                        <EditorSelectOption key={font.value} value={font.value}>
                          {font.label}
                        </EditorSelectOption>
                      ))}
                    </EditorSelectGroup>
                  ))}
                </EditorSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="editor-style-size">Tamaño</Label>
                <EditorSelect
                  id="editor-style-size"
                  value={draft.definition.fontSize ?? ""}
                  className={fieldClass}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        fontSize: value || null,
                      }),
                    }))
                  }
                >
                  <EditorSelectOption value="">Heredar del documento</EditorSelectOption>
                  {TEXT_FONT_SIZES.map((size) => (
                    <EditorSelectOption key={size.value} value={size.value}>
                      {size.label}
                    </EditorSelectOption>
                  ))}
                </EditorSelect>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={draft.definition.bold}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        bold: event.target.checked,
                      }),
                    }))
                  }
                />
                <span>Negrita</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={draft.definition.italic}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        italic: event.target.checked,
                      }),
                    }))
                  }
                />
                <span>Cursiva</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={draft.definition.underline}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        underline: event.target.checked,
                      }),
                    }))
                  }
                />
                <span>Subrayado</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={draft.definition.strike}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        strike: event.target.checked,
                      }),
                    }))
                  }
                />
                <span>Tachado</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={draft.definition.subscript}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        subscript: event.target.checked,
                        superscript: event.target.checked
                          ? false
                          : current.definition.superscript,
                      }),
                    }))
                  }
                />
                <span>Subíndice</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3c4043]">
                <input
                  type="checkbox"
                  checked={draft.definition.superscript}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        superscript: event.target.checked,
                        subscript: event.target.checked
                          ? false
                          : current.definition.subscript,
                      }),
                    }))
                  }
                />
                <span>Superíndice</span>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="editor-style-color">Color de texto</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="editor-style-color"
                    type="color"
                    value={draft.definition.color ?? "#202124"}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          color: event.target.value,
                        }),
                      }))
                    }
                    className="h-9 w-12 cursor-pointer rounded-md border border-[#dadce0] bg-white p-1"
                  />
                  <button
                    type="button"
                    className="text-xs text-[#5f6368] underline"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          color: null,
                        }),
                      }))
                    }
                  >
                    Heredar
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="editor-style-highlight">Color de resaltado</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="editor-style-highlight-enabled"
                    type="checkbox"
                    aria-label="Aplicar resaltado"
                    checked={Boolean(draft.definition.highlightColor)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          highlightColor: event.target.checked
                            ? current.definition.highlightColor ?? "#ffff00"
                            : null,
                        }),
                      }))
                    }
                  />
                  <input
                    id="editor-style-highlight"
                    type="color"
                    disabled={!draft.definition.highlightColor}
                    value={draft.definition.highlightColor ?? "#ffff00"}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          highlightColor: event.target.value,
                        }),
                      }))
                    }
                    className="h-9 w-12 cursor-pointer rounded-md border border-[#dadce0] bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-sm text-[#3c4043]">
                    {draft.definition.highlightColor ? "Activo" : "Desactivado"}
                  </span>
                </div>
              </div>
            </div>

            {draft.kind === "paragraph" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="editor-style-block-type">Tipo de bloque</Label>
                  <EditorSelect
                    id="editor-style-block-type"
                    value={draft.definition.blockType}
                    disabled={Boolean(editingStyle)}
                    className={fieldClass}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          blockType: value as EditorTextStyleDefinition["blockType"],
                        }),
                      }))
                    }
                  >
                    <EditorSelectOption value="paragraph">Párrafo</EditorSelectOption>
                    <EditorSelectOption value="heading1">Título</EditorSelectOption>
                    <EditorSelectOption value="heading2">Encabezado de sección</EditorSelectOption>
                    <EditorSelectOption value="heading3">Subtítulo</EditorSelectOption>
                  </EditorSelect>
                  {editingStyle && (
                    <p className="text-xs text-muted-foreground">
                      La estructura del estilo queda definida al guardarlo por primera vez.
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-alignment">Alineación</Label>
                  <EditorSelect
                    id="editor-style-alignment"
                    value={draft.definition.textAlign}
                    className={fieldClass}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          textAlign: value as EditorTextStyleDefinition["textAlign"],
                        }),
                      }))
                    }
                  >
                    <EditorSelectOption value="left">Izquierda</EditorSelectOption>
                    <EditorSelectOption value="center">Centrada</EditorSelectOption>
                    <EditorSelectOption value="right">Derecha</EditorSelectOption>
                    <EditorSelectOption value="justify">Justificada</EditorSelectOption>
                  </EditorSelect>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-line-height">Interlineado</Label>
                  <EditorSelect
                    id="editor-style-line-height"
                    value={draft.definition.lineHeight}
                    className={fieldClass}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          lineHeight: value as EditorTextStyleDefinition["lineHeight"],
                        }),
                      }))
                    }
                  >
                    <EditorSelectOption value="1">Sencillo</EditorSelectOption>
                    <EditorSelectOption value="1.15">1,15</EditorSelectOption>
                    <EditorSelectOption value="1.5">1,5</EditorSelectOption>
                    <EditorSelectOption value="1.8">1,8</EditorSelectOption>
                    <EditorSelectOption value="2">Doble</EditorSelectOption>
                  </EditorSelect>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-indent-left">
                    Sangría izquierda (cm)
                  </Label>
                  <Input
                    id="editor-style-indent-left"
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    value={draft.definition.indentLeft}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          indentLeft: Number(event.target.value) || 0,
                        }),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-indent-right">
                    Sangría derecha (cm)
                  </Label>
                  <Input
                    id="editor-style-indent-right"
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    value={draft.definition.indentRight}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          indentRight: Number(event.target.value) || 0,
                        }),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-first-line">
                    Sangría de primera línea (cm)
                  </Label>
                  <Input
                    id="editor-style-first-line"
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    value={draft.definition.firstLineIndent}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          firstLineIndent: Number(event.target.value) || 0,
                        }),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-tab-size">Tabulación</Label>
                  <EditorSelect
                    id="editor-style-tab-size"
                    value={draft.definition.tabSize}
                    className={fieldClass}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          tabSize: Number(value) as 2 | 4 | 8,
                        }),
                      }))
                    }
                  >
                    <EditorSelectOption value="2">2 espacios</EditorSelectOption>
                    <EditorSelectOption value="4">4 espacios</EditorSelectOption>
                    <EditorSelectOption value="8">8 espacios</EditorSelectOption>
                  </EditorSelect>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <DialogFooter className="mx-0 mb-0 mt-2 rounded-none border-t border-[#dadce0] bg-transparent px-0 pb-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveDialog()} disabled={saving}>
              {getStyleSaveLabel(saving, Boolean(editingStyle))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
