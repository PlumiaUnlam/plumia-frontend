"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import {
  Check,
  ChevronRight,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEditorTextStyles } from "@/hooks/use-editor-text-styles"
import { hasPendingEditorTextStyleChanges } from "@/services/editor-text-style.service"
import {
  applyEditorTextStyle,
  getAppliedEditorStyleId,
  getEditorStyleKindForSelection,
  readEditorTextStyleFromSelection,
} from "./editor-text-styles"
import {
  TEXT_FONT_FAMILY_GROUPS,
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
}

type StyleDraft = {
  name: string
  kind: EditorTextStyleKind
  definition: EditorTextStyleDefinition
}

const dropdownContentClass =
  "max-h-[min(75vh,34rem)] w-72 overflow-y-auto border-[#dadce0] bg-white text-[#3c4043] shadow-[0_3px_8px_rgba(60,64,67,0.24)]"
const itemClass = "text-[#3c4043] focus:bg-[#f1f3f4] focus:text-[#202124]"
const fieldClass =
  "h-9 rounded-md border-[#dadce0] bg-white px-2.5 text-sm text-[#3c4043]"

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

export function EditorTextStylesMenu({
  editor,
  projectId,
  onSave,
}: EditorTextStylesMenuProps) {
  const { styles, isLoading, saveStyle, removeStyle, refresh } =
    useEditorTextStyles(projectId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStyle, setEditingStyle] = useState<EditorTextStyle | null>(null)
  const [draft, setDraft] = useState<StyleDraft>(() => readDraft(editor))
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const currentStyleId = getAppliedEditorStyleId(editor)
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
      setStatusMessage(
        result.pending
          ? "Sin conexión: el estilo quedó guardado en este dispositivo y se sincronizará al reconectarte."
          : editingStyle
            ? `Se actualizó “${name}” en todos sus usos.`
            : `Se guardó “${name}” y se aplicó a la selección.`,
      )
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

  const groupedStyles = {
    text: styles.filter(
      (style) => style.isActive !== false && style.kind === "text",
    ),
    paragraph: styles.filter(
      (style) => style.isActive !== false && style.kind === "paragraph",
    ),
  }
  const availableStyleCount =
    groupedStyles.text.length + groupedStyles.paragraph.length

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
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
            Estilos reutilizables
          </DropdownMenuLabel>
          {statusMessage && (
            <div
              role="status"
              className="mx-2 mb-2 rounded-md bg-[#e8f0fe] px-2.5 py-2 text-xs leading-5 text-[#174ea6]"
            >
              {statusMessage}
            </div>
          )}
          <DropdownMenuItem className={itemClass} onSelect={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            Guardar selección como estilo…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLoading && availableStyleCount === 0 && (
            <p className="px-2.5 py-2 text-xs text-[#5f6368]">
              Cargando estilos…
            </p>
          )}
          {(["text", "paragraph"] as const).map((kind) => {
            const kindStyles = groupedStyles[kind]
            if (!kindStyles.length) return null
            return (
              <div key={kind}>
                <DropdownMenuLabel className="px-2.5 pb-1 pt-2 text-xs font-medium text-[#5f6368]">
                  {kind === "text" ? "Texto seleccionado" : "Párrafos y títulos"}
                </DropdownMenuLabel>
                {kindStyles.map((style) => (
                  <DropdownMenuSub key={style.id}>
                    <DropdownMenuSubTrigger className={`${itemClass} gap-2`}>
                      {currentStyleId === style.id ? (
                        <Check className="size-4 shrink-0" />
                      ) : (
                        <span className="size-4 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{style.name}</span>
                      <ChevronRight className="size-3.5 opacity-60" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className={dropdownContentClass}>
                      <DropdownMenuItem
                        className={itemClass}
                        onSelect={() => {
                          applyEditorTextStyle(editor, style)
                          saveAfterEditorUpdate()
                        }}
                      >
                        <Paintbrush className="mr-2 size-4" />
                        Aplicar estilo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={itemClass}
                        onSelect={() => openEditDialog(style)}
                      >
                        <Pencil className="mr-2 size-4" />
                        Editar definición…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={itemClass}
                        onSelect={() => void updateDefinitionFromSelection(style)}
                      >
                        <Paintbrush className="mr-2 size-4" />
                        Actualizar con la selección
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onSelect={() => void handleDelete(style)}
                      >
                        <Trash2 className="size-4" />
                        Eliminar estilo
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </div>
            )
          })}
          {!isLoading && availableStyleCount === 0 && (
            <p className="px-2.5 py-2 text-xs text-[#5f6368]">
              Todavía no hay estilos guardados.
            </p>
          )}
    </>
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-md px-3 text-sm font-medium text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124] data-[state=open]:bg-[#d2e3fc] data-[state=open]:text-[#174ea6]"
            onMouseDown={(event) => event.preventDefault()}
          >
            Estilos de texto
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={dropdownContentClass}>
          {menuContent}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStyle ? "Editar estilo" : "Guardar estilo reutilizable"}
            </DialogTitle>
            <DialogDescription>
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
              <select
                id="editor-style-kind"
                value={draft.kind}
                disabled={Boolean(editingStyle)}
                className={fieldClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    kind: event.target.value as EditorTextStyleKind,
                  }))
                }
              >
                <option value="text">Texto seleccionado</option>
                <option value="paragraph">Párrafo o párrafos</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="editor-style-font">Familia tipográfica</Label>
                <select
                  id="editor-style-font"
                  value={draft.definition.fontFamily ?? ""}
                  className={fieldClass}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        fontFamily: (event.target.value || null) as TextFontFamily | null,
                      }),
                    }))
                  }
                >
                  <option value="">Heredar del documento</option>
                  {TEXT_FONT_FAMILY_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="editor-style-size">Tamaño</Label>
                <select
                  id="editor-style-size"
                  value={draft.definition.fontSize ?? ""}
                  className={fieldClass}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      definition: replaceStyleDefinition(current.definition, {
                        fontSize: event.target.value || null,
                      }),
                    }))
                  }
                >
                  <option value="">Heredar del documento</option>
                  {TEXT_FONT_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
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
                Negrita
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
                Cursiva
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
                Subrayado
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
                Tachado
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
                Subíndice
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
                Superíndice
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
                  <select
                    id="editor-style-block-type"
                    value={draft.definition.blockType}
                    disabled={Boolean(editingStyle)}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          blockType: event.target.value as EditorTextStyleDefinition["blockType"],
                        }),
                      }))
                    }
                  >
                    <option value="paragraph">Párrafo</option>
                    <option value="heading1">Título principal</option>
                    <option value="heading2">Título de sección</option>
                    <option value="heading3">Subtítulo</option>
                  </select>
                  {editingStyle && (
                    <p className="text-xs text-muted-foreground">
                      La estructura del estilo queda definida al guardarlo por primera vez.
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-alignment">Alineación</Label>
                  <select
                    id="editor-style-alignment"
                    value={draft.definition.textAlign}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          textAlign: event.target.value as EditorTextStyleDefinition["textAlign"],
                        }),
                      }))
                    }
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centrada</option>
                    <option value="right">Derecha</option>
                    <option value="justify">Justificada</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="editor-style-line-height">Interlineado</Label>
                  <select
                    id="editor-style-line-height"
                    value={draft.definition.lineHeight}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          lineHeight: event.target.value as EditorTextStyleDefinition["lineHeight"],
                        }),
                      }))
                    }
                  >
                    <option value="1">Sencillo</option>
                    <option value="1.15">1,15</option>
                    <option value="1.5">1,5</option>
                    <option value="1.8">1,8</option>
                    <option value="2">Doble</option>
                  </select>
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
                  <select
                    id="editor-style-tab-size"
                    value={draft.definition.tabSize}
                    className={fieldClass}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        definition: replaceStyleDefinition(current.definition, {
                          tabSize: Number(event.target.value) as 2 | 4 | 8,
                        }),
                      }))
                    }
                  >
                    <option value="2">2 espacios</option>
                    <option value="4">4 espacios</option>
                    <option value="8">8 espacios</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveDialog()} disabled={saving}>
              {saving ? "Guardando…" : editingStyle ? "Guardar cambios" : "Guardar estilo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
