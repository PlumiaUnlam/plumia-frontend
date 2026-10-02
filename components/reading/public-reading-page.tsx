"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MessageSquare, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createPublicReaderComment, getPublicReading, getPublicReaderComments } from "@/services/reading.service"
import type { PublicReaderComment, PublicReadingResponse, SharedScene } from "@/types/reading"
import { SharedDocument } from "./shared-document"

function getScenes(response: PublicReadingResponse): Array<SharedScene & { bookTitle: string; chapterTitle: string }> {
  return response.version.snapshot.books.flatMap((book) => book.chapters.flatMap((chapter) => chapter.scenes.map((scene) => ({ ...scene, bookTitle: book.title, chapterTitle: chapter.title }))))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function PublicReadingPage({ slug }: Readonly<{ slug: string }>) {
  const [reading, setReading] = useState<PublicReadingResponse | null>(null)
  const [comments, setComments] = useState<PublicReaderComment[]>([])
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [body, setBody] = useState("")
  const [selection, setSelection] = useState<{ quote: string; anchorFrom: number; anchorTo: number; contextBefore: string; contextAfter: string } | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([getPublicReading(slug), getPublicReaderComments(slug)])
      .then(([page, threads]) => {
        if (!active) return
        setReading(page)
        setComments(threads)
        setActiveSceneId(getScenes(page)[0]?.id ?? null)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo abrir este enlace.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    const storedName = window.localStorage.getItem("plumia:reader-name")
    if (storedName) setDisplayName(storedName)
  }, [])

  const scenes = useMemo(() => reading ? getScenes(reading) : [], [reading])
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0] ?? null
  const sceneComments = comments.filter((comment) => comment.sceneId === activeScene?.id)

  const captureSelection = useCallback(() => {
    const root = contentRef.current
    const selectionValue = window.getSelection()
    if (!root || !selectionValue || selectionValue.isCollapsed || !selectionValue.rangeCount) {
      setSelection(null)
      return
    }
    const range = selectionValue.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) {
      setSelection(null)
      return
    }
    const beforeRange = range.cloneRange()
    beforeRange.selectNodeContents(root)
    beforeRange.setEnd(range.startContainer, range.startOffset)
    const from = beforeRange.toString().length
    const quote = selectionValue.toString().trim()
    if (!quote) {
      setSelection(null)
      return
    }
    const allText = root.textContent ?? ""
    setSelection({ quote, anchorFrom: from, anchorTo: from + selectionValue.toString().length, contextBefore: allText.slice(Math.max(0, from - 100), from).slice(-200), contextAfter: allText.slice(from + selectionValue.toString().length, from + selectionValue.toString().length + 100).slice(0, 200) })
  }, [])

  const submit = async () => {
    if (!reading || !activeScene || !displayName.trim() || !body.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await createPublicReaderComment(slug, {
        displayName: displayName.trim(),
        body: body.trim(),
        sceneId: activeScene.id,
        chapterId: activeScene.chapterId,
        ...(selection ? selection : {}),
      })
      setComments((current) => [...current, created])
      window.localStorage.setItem("plumia:reader-name", displayName.trim())
      setBody("")
      setSelection(null)
      setComposerOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el comentario.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f8f6fa] text-sm text-[#806b8b]">Cargando lectura…</main>
  if (error && !reading) return <main className="grid min-h-screen place-items-center bg-[#f8f6fa] p-6"><p className="max-w-md rounded-xl bg-white p-6 text-center text-[#6f526f] shadow">{error}</p></main>
  if (!reading) return null

  return (
    <main className="flex min-h-screen flex-col bg-[#f8f6fa] text-[#291b38]">
      <header className="flex items-center justify-between border-b border-[#e7ddeb] bg-white px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{reading.version.snapshot.title}</h1>
          <p className="text-xs text-[#8b68a3]">Versión compartida · {formatDate(reading.version.createdAt)}</p>
        </div>
        <span className="rounded-full bg-[#f2eaf6] px-3 py-1 text-xs text-[#70408a]">Solo lectura</span>
      </header>

      <div className={`grid flex-1 ${reading.allowComments ? "lg:grid-cols-[15rem_minmax(0,1fr)_22rem]" : "lg:grid-cols-[15rem_minmax(0,1fr)]"}`}>
        <nav className="border-b border-[#e7ddeb] bg-white p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8b68a3]">Contenido</p>
          <div className="space-y-4">
            {reading.version.snapshot.books.map((book) => (
              <section key={book.id}>
                <h2 className="mb-2 text-sm font-semibold">{book.title}</h2>
                {book.chapters.map((chapter) => (
                  <div key={chapter.id} className="mb-3">
                    <h3 className="mb-1 text-xs text-[#8b68a3]">{chapter.title}</h3>
                    {chapter.scenes.map((scene) => (
                      <button key={scene.id} type="button" onClick={() => { setActiveSceneId(scene.id); setSelection(null); setComposerOpen(false) }} className={`block w-full truncate rounded-md px-2 py-1 text-left text-sm ${activeScene?.id === scene.id ? "bg-[#efe4f5] text-[#70408a]" : "hover:bg-[#f8f3fa]"}`}>
                        {scene.title || "Escena"}
                      </button>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </nav>

        <section className="min-w-0 p-4 sm:p-8 lg:p-12">
          {activeScene ? (
            <article className="mx-auto max-w-3xl rounded-xl bg-white px-7 py-10 shadow-sm sm:px-14 sm:py-14">
              <p className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-[#9b78ad]">{activeScene.bookTitle} · {activeScene.chapterTitle}</p>
              <h2 className="mb-10 text-center font-serif text-3xl font-semibold">{activeScene.title || activeScene.chapterTitle}</h2>
              <div ref={contentRef} onMouseUp={captureSelection} onKeyUp={captureSelection} className="select-text">
                <SharedDocument content={activeScene.content} />
              </div>
              {reading.allowComments && (
                <div className="mt-8 flex justify-end gap-2">
                  {selection && <span className="mr-auto line-clamp-1 self-center text-xs italic text-[#8b68a3]">“{selection.quote}”</span>}
                  <Button type="button" variant="outline" className="border-[#dfc8ec] text-[#70408a]" onClick={() => setComposerOpen(true)}>
                    <MessageSquare className="mr-2 size-4" />{selection ? "Comentar selección" : "Comentar escena"}
                  </Button>
                </div>
              )}
            </article>
          ) : <p className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center text-[#806b8b]">Esta versión no contiene escenas.</p>}
        </section>

        {reading.allowComments && (
          <aside className="border-t border-[#e7ddeb] bg-white p-4 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Comentarios <span className="ml-1 rounded-full bg-[#f2eaf6] px-2 py-0.5 text-xs text-[#70408a]">{sceneComments.length}</span></h2>
              {composerOpen && <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar formulario" onClick={() => setComposerOpen(false)}><X className="size-4" /></Button>}
            </div>

            {composerOpen && (
              <section className="mb-4 space-y-2 rounded-xl border border-[#dfc8ec] bg-[#f8f3fa] p-3">
                {selection && <blockquote className="line-clamp-3 border-l-2 border-[#9a65b3] pl-2 text-xs italic text-[#796485]">{selection.quote}</blockquote>}
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} placeholder="Tu nombre" aria-label="Tu nombre" className="h-9 w-full rounded-md border border-[#dfc8ec] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#b28ac4]" />
                <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} placeholder="Escribe tu comentario…" aria-label="Escribe tu comentario" className="min-h-24 border-[#dfc8ec] bg-white" />
                <div className="flex justify-end">
                  <Button type="button" disabled={saving || !displayName.trim() || !body.trim() || !activeScene} onClick={() => void submit()} className="bg-[#8246a0] text-white hover:bg-[#703b8b]">
                    <Send className="mr-2 size-4" />Enviar
                  </Button>
                </div>
              </section>
            )}

            {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
            <div className="space-y-3">
              {sceneComments.map((comment) => (
                <article key={comment.id} className={`rounded-xl border p-3 ${comment.status === "RESOLVED" ? "border-[#dce9e2] bg-[#f4f8f5]" : "border-[#e7ddeb] bg-[#faf8fc]"}`}>
                  {comment.quote && <blockquote className="mb-2 border-l-2 border-[#9a65b3] pl-2 text-xs italic text-[#796485]">{comment.quote}</blockquote>}
                  <div className="flex items-baseline justify-between gap-2"><strong className="text-sm">{comment.displayName}</strong><time className="text-[11px] text-[#8b68a3]">{formatDate(comment.createdAt)}</time></div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-5">{comment.body}</p>
                  {comment.replies.length > 0 && <div className="mt-3 space-y-2 border-l border-[#dcc8e7] pl-3">{comment.replies.map((reply) => <div key={reply.id}><p className="text-xs font-semibold">{reply.displayName} <time className="ml-1 font-normal text-[#8b68a3]">{formatDate(reply.createdAt)}</time></p><p className="mt-1 whitespace-pre-wrap text-sm">{reply.body}</p></div>)}</div>}
                  {comment.status === "RESOLVED" && <p className="mt-2 text-xs font-medium text-[#16855b]">Resuelto por el autor</p>}
                </article>
              ))}
              {sceneComments.length === 0 && !composerOpen && <p className="rounded-lg border border-dashed border-[#decce8] p-5 text-center text-sm text-[#806b8b]">Todavía no hay comentarios para esta escena.</p>}
            </div>
          </aside>
        )}
      </div>
    </main>
  )
}
