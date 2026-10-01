"use client"

import { useState } from "react"
import type { Editor } from "@tiptap/react"
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
} from "lucide-react"

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
  "h-9 w-full rounded-md border border-[#dadce0] bg-white px-3 text-sm text-[#3c4043] outline-none transition focus:border-[#1a73e8] focus:ring-2 focus:ring-[#d2e3fc]"
const fieldLabelClass = "text-xs font-medium text-[#5f6368]"

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
}: ParagraphFormatDialogProps) {
  const [draft, setDraft] = useState<ParagraphAttributes>({
    ...DEFAULT_PARAGRAPH_ATTRIBUTES,
    ...attributes,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
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
    setDraft((current) => ({
      ...current,
      [attribute]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }))
  }

  const apply = () => {
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { ...draft, editorStyleId: null })
      .run()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,48rem)] w-[min(48rem,calc(100vw-3rem))] max-w-none flex-col gap-0 overflow-hidden border-[#dadce0] bg-white p-0 sm:max-w-none">
        <DialogHeader className="shrink-0 border-b border-[#dadce0] px-4 py-4 pr-10 sm:px-6 sm:py-5 sm:pr-12">
          <DialogTitle className="text-[#202124]">Opciones de párrafo</DialogTitle>
          <DialogDescription className="text-[#5f6368]">
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
              <select
                id="paragraph-line-height"
                className={`${selectClass} mt-2`}
                value={draft.lineHeight}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    lineHeight: event.target.value as ParagraphLineHeight,
                  }))
                }
              >
                {PARAGRAPH_LINE_HEIGHTS.map((lineHeight) => (
                  <option key={lineHeight} value={lineHeight}>
                    {lineHeight === "1"
                      ? "Simple"
                      : lineHeight === "1.15"
                        ? "1,15"
                        : lineHeight === "1.5"
                          ? "1,5"
                          : lineHeight === "1.8"
                            ? "1,8"
                            : "Doble"}
                  </option>
                ))}
              </select>
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
                        className="h-9 pr-9 text-sm"
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
              <select
                id="paragraph-tab-size"
                className={`${selectClass} mt-2`}
                value={draft.tabSize}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tabSize: Number(event.target.value) as ParagraphTabSize,
                  }))
                }
              >
                {PARAGRAPH_TAB_SIZES.map((tabSize) => (
                  <option key={tabSize} value={tabSize}>
                    Cada tabulación equivale a {tabSize} espacios
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-[#5f6368]">
                La tecla Tab inserta una tabulación en el párrafo y respeta este tamaño.
              </p>
            </section>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-col-reverse border-t border-[#dadce0] bg-[#f8fafd] px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="text-[#1a73e8] hover:bg-[#e8f0fe] hover:text-[#174ea6]"
            onClick={() => setDraft({ ...DEFAULT_PARAGRAPH_ATTRIBUTES })}
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
