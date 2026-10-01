import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import styles from "./analysis-button.module.css"

type AnalysisButtonProps = {
  isSaving: boolean
  onClick: () => void
}

export function AnalysisButton({ isSaving, onClick }: AnalysisButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className={`h-8 gap-1.5 px-2 text-xs border-violet-200/70 bg-violet-50 text-violet-800 hover:bg-violet-50 hover:text-violet-900 hover:border-violet-300 dark:border-violet-400/25 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/30 dark:hover:text-violet-100 ${styles.gradient}`}
      onClick={onClick}
      disabled={isSaving}
      title={isSaving ? "Guardando y programando análisis" : "Analizar cambios"}
      aria-label={isSaving ? "Guardando y programando análisis" : "Analizar cambios"}
    >
      {isSaving ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Sparkles className="size-3" />
      )}
      {isSaving ? "Programando análisis…" : "Analizar cambios"}
    </Button>
  )
}
