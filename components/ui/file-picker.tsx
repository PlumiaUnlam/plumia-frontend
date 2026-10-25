"use client"

import * as React from "react"
import { FileUp, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FilePickerProps = {
  id: string
  accept?: string
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  invalid?: boolean
  /** Texto del botón. */
  buttonLabel?: string
  /** Texto mientras no hay archivo (ej. formato y tamaño máximo). */
  placeholder?: string
  className?: string
}

/**
 * Selector de archivo con el mismo aspecto que el resto de los campos. Reemplaza
 * al `<input type="file">` nativo, que muestra «Choose File» en inglés.
 */
function FilePicker({
  id,
  accept,
  file,
  onChange,
  disabled = false,
  invalid = false,
  buttonLabel = "Buscar archivo",
  placeholder = "Ningún archivo seleccionado",
  className,
}: Readonly<FilePickerProps>) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div
      data-slot="file-picker"
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-background p-1 pr-3 aria-invalid:border-destructive dark:bg-input/30",
        className
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="sr-only"
        onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp />
        {buttonLabel}
      </Button>
      <span
        className={cn(
          "min-w-44 flex-1 truncate px-1 text-sm max-sm:pb-1",
          file ? "text-foreground" : "text-muted-foreground"
        )}
        title={file?.name}
      >
        {file ? file.name : placeholder}
      </span>
      {file ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={disabled}
          aria-label="Quitar archivo"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ""
            onChange(null)
          }}
        >
          <X />
        </Button>
      ) : null}
    </div>
  )
}

export { FilePicker }
