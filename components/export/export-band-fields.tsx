"use client"

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react"

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
}: ExportBandFieldsProps) {
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
    <fieldset className="space-y-2.5 rounded-lg border border-[#e8dff0] p-3">
      <legend className="px-1 text-[13px] font-semibold text-[#30203f]">
        {label}
      </legend>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-[#3e2a4e]">Contenido</span>
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-label={`Contenido del ${label.toLowerCase()}`}
        >
          {choices.map((choice) => {
            const isSelected = selectedValue === choice.value
            return (
              <button
                key={choice.value}
                id={`${id}-${choice.value}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => handleSelect(choice.value)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "border-[#b98ad2] bg-[#f2ebf7] text-[#8745ad]"
                    : "border-[#e8dff0] bg-white text-[#5f3b78] hover:bg-[#fdfaff]"
                }`}
              >
                {choice.label}
              </button>
            )
          })}
        </div>
      </div>

      {selectedOption && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-[#3e2a4e]">Alineación</span>
          <div className="flex gap-1" role="group" aria-label="Alineación">
            {alignmentOptions.map(({ value: option, label: optionLabel, icon: Icon }) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-label={optionLabel}
                aria-pressed={alignment === option}
                onClick={() => handleAlignment(option)}
                className={`inline-flex size-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  alignment === option
                    ? "border-[#b98ad2] bg-[#f2ebf7] text-[#8745ad]"
                    : "border-[#e8dff0] bg-white text-[#8d6aa8] hover:bg-[#fdfaff]"
                }`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  )
}
