"use client"

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ExportAlignment, ExportBand } from "@/services/export.service"

export type ExportBandOption = {
  value: string
  label: string
  build: (alignment: ExportAlignment) => ExportBand
  matches: (band: ExportBand) => boolean
}

const NO_PAGE_NUMBER: ExportBand["pageNumber"] = { enabled: false, format: "" }

export const HEADER_OPTIONS: ReadonlyArray<ExportBandOption> = [
  {
    value: "bookTitle",
    label: "Título del libro",
    build: (alignment) => ({
      text: "{{tituloLibro}}",
      alignment,
      pageNumber: NO_PAGE_NUMBER,
    }),
    matches: (band) => Boolean(band.text?.includes("{{tituloLibro}}")),
  },
]

export const FOOTER_OPTIONS: ReadonlyArray<ExportBandOption> = [
  {
    value: "pageNumber",
    label: "Número de página",
    build: (alignment) => ({
      text: null,
      alignment,
      pageNumber: { enabled: true, format: "{{pagina}}" },
    }),
    matches: (band) => band.pageNumber.enabled,
  },
]

const NONE_VALUE = "none"

const alignmentOptions: ReadonlyArray<{
  value: ExportAlignment
  label: string
  icon: typeof AlignLeft
}> = [
  { value: "left", label: "Izquierda", icon: AlignLeft },
  { value: "center", label: "Centro", icon: AlignCenter },
  { value: "right", label: "Derecha", icon: AlignRight },
]

type ExportBandFieldsProps = {
  id: string
  label: string
  options: ReadonlyArray<ExportBandOption>
  value: ExportBand | null
  disabled?: boolean
  onChange: (value: ExportBand | null) => void
}

export function ExportBandFields({
  id,
  label,
  options,
  value,
  disabled,
  onChange,
}: Readonly<ExportBandFieldsProps>) {
  const selectedOption = value
    ? options.find((option) => option.matches(value))
    : undefined
  const selectedValue = selectedOption?.value ?? NONE_VALUE
  const alignment = value?.alignment ?? "center"

  const choices = [{ value: NONE_VALUE, label: "Ninguno" }, ...options]

  const handleSelect = (nextValue: string) => {
    const option = options.find((candidate) => candidate.value === nextValue)
    onChange(option ? option.build(alignment) : null)
  }

  const handleAlignment = (nextAlignment: ExportAlignment) => {
    if (!selectedOption) return
    onChange(selectedOption.build(nextAlignment))
  }

  return (
    <fieldset className="space-y-2.5 rounded-lg border border-border p-3">
      <legend className="px-1 text-[13px] font-semibold text-foreground">
        {label}
      </legend>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground">Contenido</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={selectedValue}
          onValueChange={(nextValue) => handleSelect(nextValue || NONE_VALUE)}
          className="flex-wrap justify-start"
          aria-label={`Contenido del ${label.toLowerCase()}`}
        >
          {choices.map((choice) => (
            <ToggleGroupItem
              key={choice.value}
              id={`${id}-${choice.value}`}
              value={choice.value}
              disabled={disabled}
            >
              {choice.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {selectedOption && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground">Alineación</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={alignment}
            onValueChange={(nextAlignment) => {
              if (nextAlignment) {
                handleAlignment(nextAlignment as ExportAlignment)
              }
            }}
            aria-label="Alineación"
          >
            {alignmentOptions.map(
              ({ value: option, label: optionLabel, icon: Icon }) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  disabled={disabled}
                  aria-label={optionLabel}
                  className="size-8"
                >
                  <Icon className="size-4" />
                </ToggleGroupItem>
              ),
            )}
          </ToggleGroup>
        </div>
      )}
    </fieldset>
  )
}
