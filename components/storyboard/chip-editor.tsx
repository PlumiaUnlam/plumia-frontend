"use client"

import type { ElementType } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type ChipEditorProps = {
  label: string
  placeholder: string
  values: string[]
  input: string
  icon: ElementType
  onInputChange: (value: string) => void
  onAdd: () => void
  onRemove: (value: string) => void
}

export function ChipEditor({
  label,
  placeholder,
  values,
  input,
  icon: Icon,
  onInputChange,
  onAdd,
  onRemove,
}: ChipEditorProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <div className="mb-2 flex gap-2">
          <Input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                onAdd()
              }
            }}
            placeholder={placeholder}
          />
          <Button type="button" variant="secondary" onClick={onAdd}>
            Agregar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="secondary">
              <Icon className="size-3" />
              {value}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => onRemove(value)}
                aria-label={`Quitar ${value}`}
              >
                x
              </button>
            </Badge>
          ))}
        </div>
      </FieldContent>
    </Field>
  )
}
