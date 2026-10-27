import { useEffect } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

import { cn } from "@/lib/utils"

type AnalysisToastProps = {
  feedback: {
    message: string
    tone: "default" | "success" | "error"
  } | null
  onDismiss: () => void
}

const feedbackIcons = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const

export function AnalysisToast({ feedback, onDismiss }: Readonly<AnalysisToastProps>) {
  useEffect(() => {
    if (!feedback) return

    const timeout = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timeout)
  }, [feedback, onDismiss])

  if (!feedback) return null

  const Icon = feedbackIcons[feedback.tone]

  return (
    <output
      className={cn(
        "fixed left-1/2 top-6 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm shadow-lg",
        feedback.tone === "success" && "border-emerald-200 text-emerald-800",
        feedback.tone === "error" && "border-destructive/30 text-destructive",
      )}
      aria-live={feedback.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <Icon className="size-5 shrink-0" />
      <span>{feedback.message}</span>
    </output>
  )
}
