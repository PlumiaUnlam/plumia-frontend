"use client"

import { Check, CloudUpload, Loader2, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { useEditorStore } from "@/stores/editor.store"

/** Indicador minimalista del estado de autoguardado. Lee el editorStore. */
export function SaveStatusIndicator({ className }: { className?: string }) {
  const saveStatus = useEditorStore((s) => s.saveStatus)

  const config = {
    idle: { icon: Check, label: "Guardado", spin: false },
    saved: { icon: Check, label: "Guardado", spin: false },
    dirty: { icon: CloudUpload, label: "Cambios sin guardar", spin: false },
    saving: { icon: Loader2, label: "Guardando…", spin: true },
    error: { icon: TriangleAlert, label: "Error al guardar", spin: false },
  }[saveStatus]

  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        saveStatus === "error" && "text-destructive",
        className,
      )}
    >
      <Icon className={cn("size-3.5", config.spin && "animate-spin")} />
      <span>{config.label}</span>
    </div>
  )
}
