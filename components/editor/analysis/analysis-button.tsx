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
      size="icon-sm"
      variant="outline"
      className="h-7 w-7 border-[#dadce0] bg-transparent text-[#3c4043] hover:bg-[#e8eaed] hover:text-[#202124]"
      onClick={onClick}
      title={isSaving ? "Guardando y programando analisis" : "Analizar cambios"}
      aria-label={isSaving ? "Guardando y programando análisis" : "Analizar cambios"}
    >
      {isSaving ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Sparkles className="size-3" />
      )}
    </Button>
  )
}
