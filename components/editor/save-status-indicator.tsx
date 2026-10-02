"use client"

import { Check, CloudUpload, Loader2, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import {
  useEditorStore,
  type SaveStatus,
} from "@/stores/editor.store"
import type { EditorPaneId } from "./editor-types"

/** Estado visible y accesible del autoguardado de cada panel. */
export function SaveStatusIndicator({
  className,
  paneId = "primary",
  status,
}: Readonly<{
  className?: string
  paneId?: EditorPaneId
  status?: SaveStatus
}>) {
  const storedStatus = useEditorStore((s) => s.saveStatusByPane[paneId])
  const lastSavedAt = useEditorStore((s) => s.lastSavedAtByPane[paneId])
  const saveStatus = status ?? storedStatus
  const [now, setNow] = useState(() => Date.now())

  const config = {
    idle: { icon: Check, label: "Guardado", spin: false },
    saved: { icon: Check, label: "Guardado", spin: false },
    dirty: { icon: CloudUpload, label: "Cambios sin guardar", spin: false },
    saving: { icon: Loader2, label: "Guardando…", spin: true },
    error: { icon: TriangleAlert, label: "Error al guardar", spin: false },
  }[saveStatus]

  useEffect(() => {
    if (saveStatus !== "saved" || !lastSavedAt) return

    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [lastSavedAt, saveStatus])

  const label =
    saveStatus === "saved" && lastSavedAt
      ? getSavedLabel(lastSavedAt, now)
      : config.label
  const savedAtTitle = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString("es-AR")
    : config.label

  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex min-h-6 items-center gap-1.5 text-xs text-muted-foreground",
        saveStatus === "saved" && "text-emerald-600 dark:text-emerald-400",
        saveStatus === "error" && "text-destructive",
        className,
      )}
      title={saveStatus === "saved" ? savedAtTitle : config.label}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon className={cn("size-3.5", config.spin && "animate-spin")} />
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{config.label}</span>
    </div>
  )
}

function getSavedLabel(savedAt: string, now: number) {
  const elapsedMs = Math.max(0, now - new Date(savedAt).getTime())
  if (!Number.isFinite(elapsedMs)) return "Guardado"

  const elapsedMinutes = Math.floor(elapsedMs / 60_000)
  if (elapsedMinutes === 0) return "Guardado ahora"
  if (elapsedMinutes < 60) return `Guardado hace ${elapsedMinutes} min`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `Guardado hace ${elapsedHours} h`

  const date = new Date(savedAt)
  return `Guardado el ${date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  })}`
}
