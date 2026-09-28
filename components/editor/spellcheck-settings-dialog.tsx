"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

export function SpellcheckSettingsDialog({
  open,
  language,
  onLanguageChange,
  onOpenChange,
  onSave,
}: SpellcheckSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración del corrector</DialogTitle>
          <DialogDescription>
            Elegí el idioma que utilizará el corrector ortográfico nativo del navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label
            htmlFor="spellcheck-settings-language"
            className="text-xs font-medium text-foreground"
          >
            Idioma
          </label>
          <select
            id="spellcheck-settings-language"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as SpellcheckLanguage)
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

