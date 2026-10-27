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

export function AnalysisToast({ feedback, onDismiss }: Readonly<AnalysisToastProps>) {
  useEffect(() => {
    if (!feedback) return

    const timeout = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timeout)
  }, [feedback, onDismiss])

  if (!feedback) return null

  const Icon =
    feedback.tone === "success"
      ? CheckCircle2
      : feedback.tone === "error"
        ? AlertCircle
        : Info

  return (
    <div
      className={cn(
        "fixed left-1/2 top-6 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm shadow-lg",
        feedback.tone === "success" && "border-emerald-200 text-emerald-800",
        feedback.tone === "error" && "border-destructive/30 text-destructive",
      )}
      role={feedback.tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className="size-5 shrink-0" />
      <span>{feedback.message}</span>
    </div>
  )
}
