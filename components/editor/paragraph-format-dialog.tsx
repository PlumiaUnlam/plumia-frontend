"use client"

import { EditorSelect, EditorSelectOption } from "./editor-select"

import { useState } from "react"
import { useEditorState, type Editor } from "@tiptap/react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  X,
} from "lucide-react"
import { normalizeTabStops } from "./paragraph-tab-stops"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DEFAULT_PARAGRAPH_ATTRIBUTES,
  PARAGRAPH_LINE_HEIGHTS,
  PARAGRAPH_TAB_SIZES,
  type ParagraphAlignment,
  type ParagraphAttributes,
  type ParagraphLineHeight,
  type ParagraphTabSize,
} from "./paragraph-formatting"

const selectClass =
  "h-9 w-full rounded-md border border-[#dadce0] bg-white px-3 text-sm text-[#3c4043] outline-none transition focus:border-[#1a73e8] focus:ring-2 focus:ring-[#d2e3fc] dark:border-border dark:bg-input/30 dark:text-foreground dark:focus:border-ring dark:focus:ring-ring/50"
const fieldLabelClass = "text-xs font-medium text-[#5f6368] dark:text-muted-foreground"

function getLineHeightLabel(lineHeight: ParagraphLineHeight) {
  const labels: Record<ParagraphLineHeight, string> = {
    "1": "Simple",
    "1.15": "1,15",
    "1.5": "1,5",
    "1.8": "1,8",
    "2": "Doble",
  }
  return labels[lineHeight]
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

type NumericParagraphAttribute =
  | "indentLeft"
  | "indentRight"
  | "firstLineIndent"
  | "spacingBefore"
  | "spacingAfter"

type ParagraphFormatDialogProps = {
  editor: Editor
  attributes: ParagraphAttributes
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ParagraphFormatDialog({
  editor,
  attributes,
  open,
  onOpenChange,
}: Readonly<ParagraphFormatDialogProps>) {
  const [draft, setDraft] = useState<ParagraphAttributes>({
    ...DEFAULT_PARAGRAPH_ATTRIBUTES,
    ...attributes,
  })
  const [tabStopInput, setTabStopInput] = useState("")
  const [tabStopError, setTabStopError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTabStopInput("")
      setTabStopError(null)
      setDraft({
        ...DEFAULT_PARAGRAPH_ATTRIBUTES,
        ...attributes,
      })
    }

    onOpenChange(nextOpen)
  }

  const updateNumber = (
    attribute: NumericParagraphAttribute,
    value: string,
  ) => {
    const parsed = Number(value)
    const spacing = attribute === "spacingBefore" || attribute === "spacingAfter"
    let nextValue: number | null
    if (spacing && value === "") {
      nextValue = null
    } else if (!Number.isFinite(parsed)) {
      nextValue = 0
    } else {
      nextValue = Math.min(spacing ? 144 : 12, Math.max(0, parsed))
    }
    setDraft((current) => ({
      ...current,
      [attribute]: nextValue,
    }))
  }

  const readTabStop = () => {
    const value = Math.round(Number(tabStopInput.trim().replace(",", ".")) * 100) / 100
    if (!tabStopInput.trim() || !Number.isFinite(value) || value <= 0 || value > 30) {
      setTabStopError("Ingresá una posición mayor que 0 y hasta 30 cm.")
      return null
    }
    setTabStopError(null)
    return value
  }

  const addTabStop = () => {
    const value = readTabStop()
    if (value === null) return
    setDraft((current) => ({ ...current, tabStops: normalizeTabStops([...current.tabStops, value]) }))
    setTabStopInput("")
  }

  const apply = () => {
    const pendingStop = tabStopInput.trim() ? readTabStop() : undefined
    if (pendingStop === null) return
    const tabStops = normalizeTabStops([...draft.tabStops, ...(pendingStop === undefined ? [] : [pendingStop])])
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { ...draft, tabStops, editorStyleId: null })
      .run()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,48rem)] w-[min(48rem,calc(100vw-3rem))] max-w-none flex-col gap-0 overflow-hidden border-[#dadce0] bg-white p-0 dark:border-border dark:bg-popover sm:max-w-none">
        <DialogHeader className="shrink-0 border-b border-[#dadce0] px-4 py-4 pr-10 dark:border-border sm:px-6 sm:py-5 sm:pr-12">
          <DialogTitle className="text-[#202124] dark:text-foreground">Opciones de párrafo</DialogTitle>
          <DialogDescription className="text-[#5f6368] dark:text-muted-foreground">
            Configurá la alineación, sangría, espaciado y tabulaciones del párrafo actual.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="spacing" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList
            variant="line"
            className="grid h-auto min-h-11 w-full shrink-0 grid-cols-2 overflow-x-hidden overflow-y-hidden rounded-none border-b border-[#dadce0] px-3 py-1 group-data-horizontal/tabs:h-auto sm:px-6"
          >
            <TabsTrigger value="spacing" className="h-full min-h-11 w-full min-w-0 whitespace-normal px-2 py-2 text-center group-data-horizontal/tabs:after:bottom-0">
              Sangría y espaciado
            </TabsTrigger>
            <TabsTrigger value="tabs" className="h-full min-h-11 w-full min-w-0 whitespace-normal px-2 py-2 text-center group-data-horizontal/tabs:after:bottom-0">
              Tabulaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="spacing" className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <section className="space-y-2">
              <Label className={fieldLabelClass}>Alineación</Label>
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-[#dadce0] bg-white p-2">
                {alignmentOptions.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={
                      draft.textAlign === value
                        ? "h-11 shrink-0 gap-2 whitespace-nowrap bg-[#d2e3fc] px-3 text-[#174ea6] hover:bg-[#c2d7f8]"
                        : "h-11 shrink-0 gap-2 whitespace-nowrap px-3 text-[#3c4043] hover:bg-[#f1f3f4]"
                    }
                    title={label}
                    aria-label={label}
                    aria-pressed={draft.textAlign === value}
                    onClick={() => setDraft((current) => ({ ...current, textAlign: value }))}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="paragraph-line-height" className={fieldLabelClass}>
                Espaciado entre líneas
              </Label>
              <EditorSelect
                id="paragraph-line-height"
                className={`${selectClass} mt-2`}
                value={draft.lineHeight}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    lineHeight: value as ParagraphLineHeight,
                  }))
                }
              >
                {PARAGRAPH_LINE_HEIGHTS.map((lineHeight) => (
                  <EditorSelectOption key={lineHeight} value={lineHeight}>
                    {getLineHeightLabel(lineHeight)}
                  </EditorSelectOption>
                ))}
              </EditorSelect>
            </section>

            <section className="space-y-2">
              <Label className={fieldLabelClass}>Espacio entre párrafos</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["spacingBefore", "Antes"], ["spacingAfter", "Después"]] as const).map(([attribute, label]) => (
                  <div key={attribute} className="space-y-1.5">
                    <Label htmlFor={`paragraph-${attribute}`} className="text-xs text-[#5f6368]">{label}</Label>
                    <div className="relative">
                      <Input id={`paragraph-${attribute}`} type="number" min="0" max="144" step="1"
                        value={draft[attribute] ?? ""} placeholder="Automático"
                        onChange={(event) => updateNumber(attribute, event.target.value)} className="h-9 py-0 pr-12 text-sm" />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#5f6368]">pt</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5 text-[#5f6368]">Dejá el campo vacío para mantener el espaciado automático.</p>
            </section>

            <section className="space-y-2">
              <Label className={fieldLabelClass}>Sangría</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["indentLeft", "Izquierda"],
                    ["firstLineIndent", "Primera línea"],
                    ["indentRight", "Derecha"],
                  ] as const
                ).map(([attribute, label]) => (
                  <div key={attribute} className="space-y-1.5">
                    <Label htmlFor={`paragraph-${attribute}`} className="text-xs text-[#5f6368]">
                      {label}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`paragraph-${attribute}`}
                        type="number"
                        min="0"
                        max="12"
                        step="0.1"
                        value={draft[attribute]}
                        onChange={(event) => updateNumber(attribute, event.target.value)}
                        className="h-9 py-0 pr-12 text-sm"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#5f6368]">
                        cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="tabs" className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <section className="space-y-2">
              <Label htmlFor="paragraph-tab-size" className={fieldLabelClass}>
                Tabulación predeterminada
              </Label>
              <EditorSelect
                id="paragraph-tab-size"
                className={`${selectClass} mt-2`}
                value={draft.tabSize}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    tabSize: Number(value) as ParagraphTabSize,
                  }))
                }
              >
                {PARAGRAPH_TAB_SIZES.map((tabSize) => (
                  <EditorSelectOption key={tabSize} value={tabSize}>
                    Cada tabulación equivale a {tabSize} espacios
                  </EditorSelectOption>
                ))}
              </EditorSelect>
              <p className="mt-2 text-xs leading-5 text-[#5f6368]">
                Este tamaño se usa cuando no hay posiciones definidas o después de la última posición.
              </p>
            </section>
            <section className="space-y-3">
              <Label htmlFor="paragraph-tab-stop" className={fieldLabelClass}>Posiciones de tabulación</Label>
              <p id="paragraph-tab-stop-help" className="text-xs leading-5 text-[#5f6368]">Alineadas a la izquierda y medidas desde el inicio del área de texto del párrafo. Tab avanza a la próxima posición.</p>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Input id="paragraph-tab-stop" inputMode="decimal" value={tabStopInput} placeholder="Por ejemplo, 2,5"
                    aria-describedby={`paragraph-tab-stop-help${tabStopError ? " paragraph-tab-stop-error" : ""}`}
                    aria-invalid={!!tabStopError}
                    onChange={(event) => { setTabStopInput(event.target.value); setTabStopError(null) }}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTabStop() } }}
                    className="h-9 pr-12" />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[#5f6368]">cm</span>
                </div>
                <Button type="button" variant="outline" onClick={addTabStop}>Agregar</Button>
              </div>
              {tabStopError && <p id="paragraph-tab-stop-error" role="alert" className="text-xs text-destructive">{tabStopError}</p>}
              {draft.tabStops.length ? (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Posiciones configuradas">
                  {draft.tabStops.map((stop) => (
                    <Button key={stop} type="button" variant="outline" size="sm" aria-label={`Eliminar tabulación en ${stop} cm`}
                      onClick={() => setDraft((current) => ({ ...current, tabStops: current.tabStops.filter((position) => position !== stop) }))}>
                      {stop.toLocaleString("es-AR")} cm <X className="size-3" />
                    </Button>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((current) => ({ ...current, tabStops: [] }))}>Quitar todas</Button>
                </div>
              ) : <p className="text-xs text-[#5f6368]">Sin posiciones personalizadas; se usa la tabulación predeterminada.</p>}
            </section>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-col-reverse border-t border-[#dadce0] bg-[#f8fafd] px-4 py-3 dark:border-border dark:bg-muted/50 sm:flex-row sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="text-[#1a73e8] hover:bg-[#e8f0fe] hover:text-[#174ea6]"
            onClick={() => { setDraft({ ...DEFAULT_PARAGRAPH_ATTRIBUTES }); setTabStopInput(""); setTabStopError(null) }}
          >
            Restablecer
          </Button>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={apply}>
              Aceptar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditorParagraphFormatDialog({
  editor,
  open,
  onOpenChange,
}: Readonly<{
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const attributes = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      currentEditor.getAttributes("paragraph") as Partial<ParagraphAttributes>,
  })

  return (
    <ParagraphFormatDialog
      key={open ? "open" : "closed"}
      editor={editor}
      attributes={{ ...DEFAULT_PARAGRAPH_ATTRIBUTES, ...attributes }}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}
