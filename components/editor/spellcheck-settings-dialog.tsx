"use client"

import { EditorSelect, EditorSelectOption } from "./editor-select"

import { FormDialog } from "@/components/modal/form-dialog"
import type { SpellcheckLanguage } from "@/types/editor-search"

type SpellcheckSettingsDialogProps = {
  open: boolean
  language: SpellcheckLanguage
  onLanguageChange: (language: SpellcheckLanguage) => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

const languageOptions: ReadonlyArray<{
  value: SpellcheckLanguage
  label: string
}> = [
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "en-US", label: "English (United States)" },
]

// Mantener esta configuración en nuestro Dialog; no abrir avisos o ajustes nativos del navegador.
// Los subrayados son del navegador; SpellcheckSuggestions muestra sugerencias locales en nuestro Dialog.
export function SpellcheckSettingsDialog({
  open,
  language,
  onLanguageChange,
  onOpenChange,
  onSave,
}: Readonly<SpellcheckSettingsDialogProps>) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configuración del corrector"
      description="Elegí el idioma del corrector y las sugerencias. Hacé clic derecho sobre una palabra para revisarla."
      size="sm"
      submitLabel="Guardar"
      onSubmit={onSave}
    >
      <div className="grid gap-2">
        <label
          htmlFor="spellcheck-settings-language"
          className="text-sm font-medium"
        >
          Idioma
        </label>
        <EditorSelect
          id="spellcheck-settings-language"
          value={language}
          onValueChange={(value) =>
            onLanguageChange(value as SpellcheckLanguage)
          }
          className="h-10 w-full rounded-lg border border-border bg-popover px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {languageOptions.map((option) => (
            <EditorSelectOption key={option.value} value={option.value}>
              {option.label}
            </EditorSelectOption>
          ))}
        </EditorSelect>
      </div>
    </FormDialog>
  )
}
