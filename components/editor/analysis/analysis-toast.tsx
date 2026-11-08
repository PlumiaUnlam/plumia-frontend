"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

type AnalysisToastProps = {
  feedback: {
    message: string
    tone: "default" | "success" | "error"
  } | null
  onDismiss: () => void
}

const TOAST_DURATION_MS = 4000

/**
 * Aviso del análisis del editor. Usa el mismo sistema de avisos que el resto de
 * la app (sonner): queda por encima de los modales, arriba y centrado, y se puede
 * cerrar. Antes era un aviso propio con z-50 que los modales tapaban.
 */
export function AnalysisToast({ feedback, onDismiss }: Readonly<AnalysisToastProps>) {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!feedback) return

    const notify = () => onDismissRef.current()
    const show = {
      default: toast.info,
      success: toast.success,
      error: toast.error,
    }[feedback.tone]
    const id = show(feedback.message, {
      duration: TOAST_DURATION_MS,
      onDismiss: notify,
      onAutoClose: notify,
    })

    return () => {
      toast.dismiss(id)
    }
  }, [feedback])

  return null
}
