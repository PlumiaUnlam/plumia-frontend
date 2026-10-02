"use client"

import { useState } from "react"
import { MessageSquareText, Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { AuthorAnnotation, CreateAuthorAnnotationInput } from "@/types/author-annotation"

type AnnotationPanelProps = {
  annotations: AuthorAnnotation[]
  draftAnchor: Omit<CreateAuthorAnnotationInput, "body"> | null
  isComposerOpen: boolean
  onClose: () => void
  onStartCreate: () => void
  onCreate: (body: string) => Promise<void>
  onEdit: (annotationId: string, body: string) => Promise<void>
  onDelete: (annotationId: string) => Promise<void>
  onNavigate: (annotation: AuthorAnnotation) => void
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "A"
}

export function AuthorAnnotationPanel({
  annotations,
  draftAnchor,
  isComposerOpen,
  onClose,
  onStartCreate,
  onCreate,
  onEdit,
  onDelete,
  onNavigate,
}: Readonly<AnnotationPanelProps>) {
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (action: () => Promise<void>) => {
    setSaving(true)
    setError(null)
    try {
      await action()
      setDraft("")
      setEditDraft("")
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la anotación.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-[min(22rem,42vw)] shrink-0 flex-col border-l border-[#eadcf1] bg-[#fbf9fd] text-[#28183a] max-[700px]:fixed max-[700px]:inset-y-0 max-[700px]:right-0 max-[700px]:z-30 max-[700px]:w-[min(22rem,92vw)] max-[700px]:border-l max-[700px]:shadow-xl">
      <header className="flex shrink-0 items-center justify-between border-b border-[#eadcf1] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-[#8246a0]" />
          <h2 className="font-semibold">Anotaciones privadas</h2>
          <span className="rounded-full bg-[#eadcf1] px-2 py-0.5 text-xs text-[#70408a]">{annotations.length}</span>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar anotaciones" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isComposerOpen && (
          <section className="rounded-xl border border-[#dfc8ec] bg-[#f6effa] p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8b68a3]">Nueva anotación</p>
            {draftAnchor?.quote && <blockquote className="mb-3 line-clamp-3 border-l-2 border-[#9a65b3] pl-2 text-sm text-[#5f496c]">{draftAnchor.quote}</blockquote>}
            <Textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe una nota privada…"
              aria-label="Escribe una anotación privada"
              className="min-h-24 resize-y border-[#dfc8ec] bg-white focus-visible:ring-[#9a65b3]"
              maxLength={5000}
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button type="button" size="sm" onClick={() => void submit(() => onCreate(draft))} disabled={saving || !draft.trim()} className="bg-[#8246a0] text-white hover:bg-[#703b8b]">Guardar nota</Button>
            </div>
          </section>
        )}

        {!isComposerOpen && annotations.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#decce8] px-4 py-8 text-center text-sm text-[#806b8b]">
            Las anotaciones son privadas y no se incluyen en las versiones compartidas.
          </div>
        )}

        {annotations.map((annotation) => {
          const name = annotation.author.displayName?.trim() || `${annotation.author.name} ${annotation.author.lastname}`.trim()
          return (
            <article key={annotation.id} className="rounded-xl border border-[#dfc8ec] bg-[#f6effa] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e7d7ef] text-sm font-semibold text-[#7d3e9e]">{getInitials(name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{name || "Autor"}</span>
                  <span className="block text-xs text-[#8b68a3]">{formatDate(annotation.updatedAt)}</span>
                </span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Editar anotación" onClick={() => { setEditingId(annotation.id); setEditDraft(annotation.body) }}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar anotación" disabled={saving} onClick={() => void submit(() => onDelete(annotation.id))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {annotation.quote && (
                <button type="button" className="mb-2 block w-full border-l-2 border-[#9a65b3] pl-2 text-left text-xs italic text-[#796485] line-clamp-2" onClick={() => onNavigate(annotation)}>
                  {annotation.quote}
                </button>
              )}
              {editingId === annotation.id ? (
                <div>
                  <Textarea autoFocus value={editDraft} onChange={(event) => setEditDraft(event.target.value)} aria-label="Editar anotación" className="min-h-20 resize-y border-[#dfc8ec] bg-white" maxLength={5000} />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>Cancelar</Button>
                    <Button type="button" size="sm" disabled={saving || !editDraft.trim()} onClick={() => void submit(() => onEdit(annotation.id, editDraft))} className="bg-[#8246a0] text-white hover:bg-[#703b8b]">Guardar</Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{annotation.body}</p>
              )}
            </article>
          )
        })}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!isComposerOpen && <Button type="button" variant="outline" className="w-full border-[#dfc8ec] text-[#70408a]" onClick={onStartCreate}>Nueva anotación</Button>}
      </div>
    </aside>
  )
}
