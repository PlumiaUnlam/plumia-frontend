"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CreateEntityStateInput } from "@/types/entity-state"

const stateKeys = [
  { value: "location", label: "Ubicación" },
  { value: "status", label: "Estado vital" },
  { value: "health_status", label: "Salud o condición" },
  { value: "custom", label: "Personalizado" },
]

type SceneOption = { id: string; title: string | null }

type EntityStateModalProps = {
  readonly open: boolean
  readonly title: string
  readonly entityName: string
  readonly scenes: readonly SceneOption[]
  readonly initialValue?: Partial<CreateEntityStateInput>
  readonly onClose: () => void
  readonly onSubmit: (input: CreateEntityStateInput) => Promise<void>
}

export function EntityStateModal({
  open,
  title,
  entityName,
  scenes,
  initialValue,
  onClose,
  onSubmit,
}: EntityStateModalProps) {
  const initialKey = initialValue?.attributeKey ?? "location"
  const initialStandardKey = stateKeys.some((item) => item.value === initialKey)
    ? initialKey
    : "custom"
  const [selectedKey, setSelectedKey] = useState(initialStandardKey)
  const [customKey, setCustomKey] = useState(
    initialStandardKey === "custom" ? initialKey : "",
  )
  const [toValue, setToValue] = useState(initialValue?.toValue ?? "")
  const [validFromSceneId, setValidFromSceneId] = useState(
    initialValue?.validFromSceneId ?? scenes[0]?.id ?? "",
  )
  const [validToSceneId, setValidToSceneId] = useState(
    initialValue?.validToSceneId ?? "",
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const attributeKey = selectedKey === "custom" ? customKey.trim() : selectedKey
    if (!attributeKey || !toValue.trim() || !validFromSceneId) {
      setError("Completá el atributo, valor y escena de inicio.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        attributeKey,
        toValue: toValue.trim(),
        validFromSceneId,
        validToSceneId: validToSceneId || null,
      })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el estado.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}: {entityName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <label className="grid gap-1.5 text-sm font-medium">
            Atributo dinámico
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {stateKeys.map((key) => <option key={key.value} value={key.value}>{key.label}</option>)}
            </select>
          </label>
          {selectedKey === "custom" && (
            <label className="grid gap-1.5 text-sm font-medium">
              Nombre del atributo
              <Input value={customKey} onChange={(event) => setCustomKey(event.target.value)} placeholder="Ej.: armadura" />
            </label>
          )}
          <label className="grid gap-1.5 text-sm font-medium">
            Nuevo valor
            <Textarea value={toValue} onChange={(event) => setToValue(event.target.value)} placeholder="Ej.: Puerto de Bruma" rows={2} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Válido desde
              <select value={validFromSceneId} onChange={(event) => setValidFromSceneId(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">Seleccionar escena</option>
                {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.title ?? "Escena sin título"}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Válido hasta
              <select value={validToSceneId} onChange={(event) => setValidToSceneId(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">Sigue vigente</option>
                {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.title ?? "Escena sin título"}</option>)}
              </select>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Guardando..." : "Guardar estado"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
