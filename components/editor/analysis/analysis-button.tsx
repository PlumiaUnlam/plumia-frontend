import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

type AnalysisButtonProps = {
  isSaving: boolean
  onClick: () => void
}

export function AnalysisButton({ isSaving, onClick }: AnalysisButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-7 gap-1.5 px-2 text-[10px]"
      onClick={onClick}
      title={isSaving ? "Guardando y programando analisis" : "Analizar cambios"}
    >
      {isSaving ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Sparkles className="size-3" />
      )}
      <span className="hidden sm:inline">Analizar cambios</span>
    </Button>
  )
}
