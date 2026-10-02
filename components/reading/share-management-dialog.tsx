"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, ExternalLink, MessageSquare, Plus, RotateCcw, Share2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createShareLink, deactivateShareLink, getShareLinks, getShareReaderComments, replyToReaderComment, setReaderCommentStatus, setReaderCommentVisibility, updateShareLink } from "@/services/reading.service"
import type { ReaderComment, ShareLink } from "@/types/reading"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ShareManagementDialog({
  projectId,
  open,
  onOpenChange,
  onBeforeCreate,
}: Readonly<{
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onBeforeCreate?: () => Promise<void>
}>) {
  const [links, setLinks] = useState<ShareLink[]>([])
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)
  const [comments, setComments] = useState<ReaderComment[]>([])
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadLinks = useCallback(async () => {
    const result = await getShareLinks(projectId)
    setLinks(result)
  }, [projectId])

  const loadComments = useCallback(async (shareLinkId: string) => {
    setComments(await getShareReaderComments(shareLinkId))
  }, [])

  useEffect(() => {
    if (!open) return
    setError(null)
    void loadLinks().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar los enlaces."))
  }, [loadLinks, open])

  const selectLink = async (link: ShareLink) => {
    setSelectedLinkId(link.id)
    setError(null)
    try { await loadComments(link.id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los comentarios.") }
  }

  const handleCreate = async () => {
    setBusy(true)
    setError(null)
    try {
      await onBeforeCreate?.()
      const link = await createShareLink(projectId)
      await loadLinks()
      await selectLink(link)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el enlace.")
    } finally { setBusy(false) }
  }

  const handleCopy = async (slug: string) => {
    const url = `${window.location.origin}/read/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedSlug(slug)
      window.setTimeout(() => setCopiedSlug((current) => current === slug ? null : current), 1800)
    } catch {
      setError("No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.")
    }
  }

  const handleDeactivate = async (link: ShareLink) => {
    setBusy(true)
    try {
      await deactivateShareLink(link.id)
      await loadLinks()
      if (selectedLinkId === link.id) setSelectedLinkId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo desactivar el enlace.")
    } finally { setBusy(false) }
  }

  const handleCommentsToggle = async (link: ShareLink) => {
    setBusy(true)
    try {
      const updated = await updateShareLink(link.id, { allowComments: !link.allowComments })
      setLinks((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el enlace.")
    } finally { setBusy(false) }
  }

  const handleReply = async (comment: ReaderComment) => {
    const body = replyDrafts[comment.id]?.trim()
    if (!selectedLinkId || !body) return
    setBusy(true)
    try {
      const updated = await replyToReaderComment(selectedLinkId, comment.id, body)
      setComments((current) => current.map((item) => item.id === updated.id ? updated : item))
      setReplyDrafts((current) => ({ ...current, [comment.id]: "" }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo responder.")
    } finally { setBusy(false) }
  }

  const updateComment = async (comment: ReaderComment, action: "status" | "visibility") => {
    if (!selectedLinkId) return
    setBusy(true)
    try {
      const updated = action === "status"
        ? await setReaderCommentStatus(selectedLinkId, comment.id, comment.status === "OPEN" ? "RESOLVED" : "OPEN")
        : await setReaderCommentVisibility(selectedLinkId, comment.id, !comment.isVisible)
      setComments((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el comentario.")
    } finally { setBusy(false) }
  }

  const selectedLink = links.find((link) => link.id === selectedLinkId) ?? null
  const publicUrl = (slug: string) => typeof window === "undefined" ? `/read/${slug}` : `${window.location.origin}/read/${slug}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[min(72rem,calc(100vw-1rem))] max-w-none gap-0 overflow-hidden border-[#e4d4ec] bg-white p-0 sm:max-w-none">
        <DialogHeader className="border-b border-[#eadcf1] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-[#28183a]"><Share2 className="size-5 text-[#8246a0]" />Compartir versión de lectura</DialogTitle>
          <DialogDescription>El enlace guarda una copia fija del manuscrito. Las ediciones posteriores crean otra versión al compartir de nuevo.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 overflow-y-auto md:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
          <section className="border-b border-[#eadcf1] p-4 md:border-b-0 md:border-r">
            <Button type="button" disabled={busy} onClick={() => void handleCreate()} className="mb-4 w-full bg-[#8246a0] text-white hover:bg-[#703b8b]"><Plus className="mr-2 size-4" />Crear enlace nuevo</Button>
            <div className="space-y-3">
              {links.map((link) => (
                <article key={link.id} className={`rounded-xl border p-3 ${selectedLinkId === link.id ? "border-[#b890ca] bg-[#f8f3fa]" : "border-[#eadcf1]"}`}>
                  <button type="button" className="block w-full text-left" onClick={() => void selectLink(link)}>
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{link.version?.label ?? "Versión compartida"}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${link.isActive ? "bg-[#e5f3ed] text-[#16855b]" : "bg-slate-100 text-slate-500"}`}>{link.isActive ? "Activo" : "Desactivado"}</span></span>
                    <span className="mt-1 block text-xs text-[#8b68a3]">{formatDate(link.createdAt)}{link.version?.type === "share" ? " · Snapshot fijo" : " · Enlace previo: crea uno nuevo para compartir una versión fija"}</span>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={!link.isActive || link.version?.type !== "share"} className="min-w-0 flex-1" onClick={() => void handleCopy(link.slug)}><Copy className="mr-1.5 size-3.5" />{copiedSlug === link.slug ? "Copiado" : "Copiar link"}</Button>
                    {!link.isActive && <span className="sr-only">{publicUrl(link.slug)}</span>}
                    {link.isActive && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void handleDeactivate(link)} aria-label="Desactivar enlace"><X className="size-4" /></Button>}
                  </div>
                  {link.isActive && <Button type="button" size="sm" variant="ghost" disabled={busy} className="mt-1 h-7 px-1 text-xs text-[#70408a]" onClick={() => void handleCommentsToggle(link)}>{link.allowComments ? "Desactivar comentarios" : "Permitir comentarios"}</Button>}
                </article>
              ))}
              {links.length === 0 && <p className="rounded-lg border border-dashed border-[#decce8] p-5 text-center text-sm text-[#806b8b]">Todavía no hay enlaces de lectura.</p>}
            </div>
          </section>

          <section className="min-h-0 p-4">
            {!selectedLink ? (
              <div className="grid min-h-64 place-items-center text-center text-sm text-[#806b8b]">Selecciona un enlace para revisar los comentarios de lectores.</div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="min-w-0"><h3 className="font-semibold">Comentarios recibidos</h3><p className="truncate text-xs text-[#8b68a3]">{publicUrl(selectedLink.slug)}</p></div>
                  <a href={publicUrl(selectedLink.slug)} target="_blank" rel="noreferrer" className="rounded-md p-2 text-[#70408a] hover:bg-[#f2eaf6]" aria-label="Abrir lectura compartida"><ExternalLink className="size-4" /></a>
                </div>
                <div className="max-h-[65dvh] space-y-3 overflow-y-auto pr-1">
                  {comments.map((comment) => (
                    <article key={comment.id} className={`rounded-xl border p-4 ${comment.status === "RESOLVED" ? "border-[#dce9e2] bg-[#f4f8f5]" : "border-[#eadcf1] bg-[#faf8fc]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-semibold">{comment.displayName}</p><time className="text-xs text-[#8b68a3]">{formatDate(comment.createdAt)}</time></div>
                        <div className="flex items-center gap-1">
                          <span className={`rounded-md px-2 py-1 text-xs ${comment.status === "RESOLVED" ? "bg-[#dcefe6] text-[#16855b]" : "bg-[#f2eaf6] text-[#70408a]"}`}>{comment.status === "RESOLVED" ? "Resuelto" : "Abierto"}</span>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={comment.status === "OPEN" ? "Resolver comentario" : "Reabrir comentario"} disabled={busy} onClick={() => void updateComment(comment, "status")}>{comment.status === "OPEN" ? <Check className="size-4" /> : <RotateCcw className="size-4" />}</Button>
                        </div>
                      </div>
                      {comment.quote && <blockquote className="my-2 border-l-2 border-[#9a65b3] pl-2 text-xs italic text-[#796485]">{comment.quote}</blockquote>}
                      <p className="whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
                      {comment.replies.map((reply) => <div key={reply.id} className="mt-3 border-l border-[#dcc8e7] pl-3"><p className="text-xs font-semibold">{reply.displayName} <time className="ml-1 font-normal text-[#8b68a3]">{formatDate(reply.createdAt)}</time></p><p className="mt-1 whitespace-pre-wrap text-sm">{reply.body}</p></div>)}
                      <div className="mt-3 flex gap-2"><Textarea value={replyDrafts[comment.id] ?? ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))} aria-label={`Responder a ${comment.displayName}`} placeholder="Escribe una respuesta…" className="min-h-16 bg-white" maxLength={5000} /><Button type="button" disabled={busy || !replyDrafts[comment.id]?.trim()} onClick={() => void handleReply(comment)} className="self-end bg-[#8246a0] text-white hover:bg-[#703b8b]">Responder</Button></div>
                      <div className="mt-2 flex justify-between text-xs">
                        <button type="button" disabled={busy} className="text-[#70408a] underline" onClick={() => void updateComment(comment, "visibility")}>{comment.isVisible ? "Ocultar a lectores" : "Mostrar a lectores"}</button>
                        <details><summary className="cursor-pointer text-[#806b8b]">Historial ({comment.statusEvents?.length ?? 0})</summary><ol className="mt-2 space-y-1 text-right text-[#806b8b]">{comment.statusEvents?.map((event) => <li key={event.id}>{event.changedByName} · {event.status === "OPEN" ? "abrió" : "resolvió"} · {formatDate(event.createdAt)}</li>)}</ol></details>
                      </div>
                    </article>
                  ))}
                  {comments.length === 0 && <p className="rounded-lg border border-dashed border-[#decce8] p-8 text-center text-sm text-[#806b8b]"><MessageSquare className="mx-auto mb-2 size-5" />Aún no hay comentarios en este enlace.</p>}
                </div>
              </>
            )}
          </section>
        </div>
        {error && <p role="alert" className="border-t border-red-100 px-5 py-2 text-sm text-red-700">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
