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
      <DialogContent className="w-[min(28rem,calc(100vw-1.5rem))] max-w-none gap-0 overflow-hidden border-[#dadce0] p-0 sm:max-w-none">
        <DialogHeader className="border-b border-[#dadce0] px-6 py-5 pr-12">
          <DialogTitle className="text-[#202124]">Configuración del corrector</DialogTitle>
          <DialogDescription className="text-[#5f6368]">
            Elegí el idioma que utilizará el corrector ortográfico nativo del navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 px-6 py-5">
          <label
            htmlFor="spellcheck-settings-language"
            className="text-xs font-medium text-[#5f6368]"
          >
            Idioma
          </label>
          <select
            id="spellcheck-settings-language"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as SpellcheckLanguage)
            }
            className="h-10 w-full rounded-lg border border-[#dadce0] bg-white px-3 text-sm text-[#3c4043] outline-none focus-visible:border-[#1a73e8] focus-visible:ring-2 focus-visible:ring-[#d2e3fc]"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <DialogFooter className="mx-0 mt-0 border-t border-[#dadce0] bg-[#f8fafd] px-6 py-4 sm:flex-row sm:justify-end">
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
