"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CheckCircle2,
  LogIn,
  MessageSquare,
  PanelLeftClose,
} from "lucide-react"

import { SharedScene } from "@/components/sharing/shared-scene"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import {
  acceptShareInvitation,
  createReaderComment,
  createReaderCommentReply,
  getReaderComments,
  getSharedManuscript,
  getSharedStorageUrl,
  updateReaderComment,
} from "@/services/sharing.service"
import type { ProseMirrorJSON } from "@/types/scene"
import type {
  ReaderComment,
  SharedManuscriptView,
  TextSelectionAnchor,
} from "@/types/sharing"

type SharedReaderProps = {
  slug: string
  initialToken?: string
}

function getViewerDescription(viewer: SharedManuscriptView["viewer"]) {
  if (viewer.isOwner) return "Comentarios de la versión"
  if (viewer.canComment) return "Revisión con comentarios"
  return "Solo lectura"
}

export function SharedReader({ slug, initialToken }: SharedReaderProps) {
  const {
    firebaseUser,
    loading: authLoading,
    loginWithGoogle,
    logout,
  } = useAuth()
  const [view, setView] = useState<SharedManuscriptView | null>(null)
  const [comments, setComments] = useState<ReaderComment[]>([])
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [selection, setSelection] = useState<TextSelectionAnchor | null>(null)
  const [commentBody, setCommentBody] = useState("")
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [submittingReplyFor, setSubmittingReplyFor] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discussionError, setDiscussionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) return

    let cancelled = false
    void (async () => {
      try {
        const loadedView = initialToken
          ? await acceptShareInvitation(slug, initialToken)
          : await getSharedManuscript(slug, initialToken)
        const [resolvedView, loadedComments] = await Promise.all([
          resolveSnapshotImages(loadedView, slug, initialToken),
          (loadedView.viewer.isOwner || loadedView.viewer.canComment)
            ? getReaderComments(slug, initialToken)
            : Promise.resolve([]),
        ])
        if (cancelled) return
        setView(resolvedView)
        setComments(loadedComments)
        setActiveChapterId(
          resolvedView.manuscript.books[0]?.chapters[0]?.id ?? null,
        )
        setError(null)
        setDiscussionError(null)
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo abrir la versión compartida.",
          )
        }
      } finally {
        if (!cancelled) {
          setLoadedUserId(firebaseUser.uid)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, firebaseUser, initialToken, slug])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setLoading(true)
    setLoadedUserId(null)
    setView(null)
    setComments([])
    setError(null)
    setDiscussionError(null)
    try {
      if (firebaseUser) {
        await logout()
      }
      await loginWithGoogle()
    } catch (signInError) {
      setLoading(false)
      setLoadedUserId(null)
      setError(getGoogleSignInErrorMessage(signInError))
    } finally {
      setSigningIn(false)
    }
  }

  const chapters = useMemo(
    () =>
      view?.manuscript.books.flatMap((book) =>
        book.chapters.map((chapter) => ({ ...chapter, bookTitle: book.title })),
      ) ?? [],
    [view],
  )

  useEffect(() => {
    if (chapters.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
        const chapterId = visible?.target.getAttribute("data-chapter-id")
        if (chapterId) setActiveChapterId(chapterId)
      },
      { rootMargin: "-15% 0px -70%", threshold: [0, 0.2, 0.6] },
    )
    for (const chapter of chapters) {
      const element = document.getElementById(`shared-chapter-${chapter.id}`)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [chapters])

  const scrollToChapter = (chapterId: string) => {
    document
      .getElementById(`shared-chapter-${chapterId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const openComment = useCallback((commentId: string) => {
    setActiveCommentId(commentId)
    document
      .getElementById(`reader-comment-${commentId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])

  const submitComment = async () => {
    if (!selection || !commentBody.trim()) return
    setSubmittingComment(true)
    try {
      const created = await createReaderComment(
        slug,
        initialToken,
        {
          ...selection,
          body: commentBody.trim(),
        },
      )
      setComments((current) => [...current, created])
      setSelection(null)
      setCommentBody("")
      setActiveCommentId(created.id)
      setDiscussionError(null)
    } catch (submitError) {
      setDiscussionError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el comentario.",
      )
    } finally {
      setSubmittingComment(false)
    }
  }

  const toggleResolved = async (comment: ReaderComment) => {
    try {
      const updated = await updateReaderComment(
        slug,
        comment.id,
        comment.status === "OPEN" ? "RESOLVED" : "OPEN",
      )
      setComments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setDiscussionError(null)
    } catch (updateError) {
      setDiscussionError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el estado del comentario.",
      )
    }
  }

  const submitReply = async (comment: ReaderComment) => {
    const body = replyDrafts[comment.id]?.trim()
    if (!body) return
    setSubmittingReplyFor(comment.id)
    try {
      const updated = await createReaderCommentReply(
        slug,
        initialToken,
        comment.id,
        body,
      )
      setComments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setReplyDrafts((current) => ({ ...current, [comment.id]: "" }))
      setDiscussionError(null)
    } catch (replyError) {
      setDiscussionError(
        replyError instanceof Error
          ? replyError.message
          : "No se pudo guardar la respuesta.",
      )
    } finally {
      setSubmittingReplyFor(null)
    }
  }

  const canOpenDiscussion = view?.viewer.isOwner || view?.viewer.canComment

  if (
    authLoading ||
    (firebaseUser && (loading || loadedUserId !== firebaseUser.uid))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f4f0e8] text-muted-foreground">
        <Spinner className="size-5" /> Abriendo versión compartida…
      </div>
    )
  }

  if (!firebaseUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8] p-6">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-xl">
          <BookOpen className="mx-auto mb-4 size-10 text-primary" />
          <h1 className="text-xl font-semibold">Verificá tu invitación</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresá con la cuenta de Google que recibió este enlace. No se
            creará una cuenta de PlumIA.
          </p>
          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="mt-5 w-full"
            disabled={signingIn}
            onClick={() => void handleGoogleSignIn()}
          >
            {signingIn ? <Spinner className="size-4" /> : <LogIn />}
            Continuar con Google
          </Button>
        </div>
      </main>
    )
  }

  if (error || !view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8] p-6">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-xl">
          <BookOpen className="mx-auto mb-4 size-10 text-primary" />
          <h1 className="text-xl font-semibold">No pudimos abrir esta versión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "La invitación no está disponible."}
          </p>
          {!initialToken && (
            <p className="mt-4 text-xs text-muted-foreground">
              Abrí el enlace completo que recibiste por correo.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Sesión actual: {firebaseUser.email}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            disabled={signingIn}
            onClick={() => void handleGoogleSignIn()}
          >
            {signingIn ? <Spinner className="size-4" /> : <LogIn />}
            Usar otra cuenta de Google
          </Button>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f0e8] text-foreground">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-black/10 bg-[#fffdf8]/95 px-4 backdrop-blur">
        <BookOpen className="mr-2 size-5 text-primary" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">
            {view.manuscript.title}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Versión congelada ·{" "}
            {new Date(view.manuscript.frozenAt).toLocaleString("es-UY")}
          </p>
        </div>
        <Select
          value={activeChapterId ?? undefined}
          onValueChange={scrollToChapter}
        >
          <SelectTrigger
            aria-label="Ir a capítulo"
            size="sm"
            className="ml-auto max-w-40 text-xs lg:hidden"
          >
            <SelectValue placeholder="Ir a capítulo" />
          </SelectTrigger>
          <SelectContent align="end">
            {chapters.map((chapter) => (
              <SelectItem key={chapter.id} value={chapter.id}>
                {chapter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-2 hidden items-center gap-2 text-xs text-muted-foreground sm:flex lg:ml-auto">
          <PanelLeftClose className="size-4" />
          {getViewerDescription(view.viewer)}
        </div>
      </header>

      <div
        className={`mx-auto grid grid-cols-1 gap-6 px-4 py-6 ${
          canOpenDiscussion
            ? "max-w-[1500px] lg:grid-cols-[240px_minmax(0,760px)_320px]"
            : "max-w-[1080px] lg:grid-cols-[240px_minmax(0,760px)]"
        }`}
      >
        <nav className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-[#fffdf8] p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contenido
            </p>
            <div className="space-y-1">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => scrollToChapter(chapter.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    activeChapterId === chapter.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/70 hover:bg-black/5"
                  }`}
                >
                  <span className="block truncate text-[10px] uppercase text-muted-foreground">
                    {chapter.bookTitle}
                  </span>
                  {chapter.title}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="min-w-0">
          <section className="overflow-hidden rounded-sm bg-[#fffdf8] shadow-[0_18px_60px_-35px_rgba(50,35,20,0.55)] ring-1 ring-black/5">
            <div className="border-b border-black/5 px-8 py-12 text-center sm:px-16">
              <p className="mb-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Manuscrito
              </p>
              <h2 className="font-serif text-4xl font-semibold">
                {view.manuscript.title}
              </h2>
            </div>

            {view.manuscript.books.map((book) => (
              <div key={book.id}>
                {view.manuscript.books.length > 1 && (
                  <div className="border-b border-black/5 px-8 py-12 text-center sm:px-16">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Libro
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold">
                      {book.title}
                    </h2>
                  </div>
                )}
                {book.chapters.map((chapter) => (
                  <section
                    key={chapter.id}
                    id={`shared-chapter-${chapter.id}`}
                    data-chapter-id={chapter.id}
                    className="scroll-mt-20 border-b border-black/10 px-7 py-12 last:border-b-0 sm:px-16"
                  >
                    <h2 className="mb-8 text-center font-serif text-3xl font-semibold">
                      {chapter.title}
                    </h2>
                    {chapter.scenes.map((scene) => (
                      <SharedScene
                        key={scene.id}
                        sceneId={scene.id}
                        title={scene.title}
                        content={scene.content}
                        comments={comments.filter(
                          (comment) => comment.snapshotSceneId === scene.id,
                        )}
                        canComment={view.viewer.canComment}
                        onSelection={setSelection}
                        onCommentClick={openComment}
                      />
                    ))}
                  </section>
                ))}
              </div>
            ))}
          </section>
        </main>

        {canOpenDiscussion && <aside>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-[#fffdf8] p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Comentarios</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {comments.length}
              </span>
            </div>
            {discussionError && (
              <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {discussionError}
              </p>
            )}
            {view.viewer.isOwner && !view.viewer.canComment && (
              <p className="mb-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Esta invitación está en modo solo lectura. Podés consultar y responder hilos existentes; no se pueden crear comentarios nuevos.
              </p>
            )}
            {view.viewer.canComment && (
              <p className="mb-4 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                Seleccioná una parte del texto para dejar un comentario.
              </p>
            )}
            {comments.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                Todavía no hay comentarios.
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <article
                    key={comment.id}
                    id={`reader-comment-${comment.id}`}
                    className={`rounded-lg border p-3 transition-colors ${
                      activeCommentId === comment.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setActiveCommentId(comment.id)}
                  >
                    <blockquote className="mb-2 border-l-2 border-amber-400 pl-2 text-xs italic text-muted-foreground">
                      “{comment.selectedText}”
                    </blockquote>
                    <p className="text-sm">{comment.body}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{comment.author.displayName}</span>
                      <time dateTime={comment.createdAt}>
                        {new Date(comment.createdAt).toLocaleString("es-UY")}
                      </time>
                      {comment.status === "RESOLVED" && (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="size-3" /> Resuelto
                        </span>
                      )}
                    </div>
                    {view.viewer.isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="mt-2"
                        onClick={(event) => {
                          event.stopPropagation()
                          void toggleResolved(comment)
                        }}
                      >
                        {comment.status === "OPEN" ? "Resolver" : "Reabrir"}
                      </Button>
                    )}
                    {comment.replies.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-primary/15 pl-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="rounded-md bg-muted/60 p-2">
                            <p className="text-xs">{reply.body}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {reply.author.displayName} ·{" "}
                              {new Date(reply.createdAt).toLocaleString("es-UY")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {comment.statusHistory.length > 0 && (
                      <details className="mt-3 text-[11px] text-muted-foreground">
                        <summary className="cursor-pointer">Historial del estado</summary>
                        <ol className="mt-2 space-y-1 pl-4">
                          {comment.statusHistory.map((event, index) => (
                            <li key={`${comment.id}-status-${index}`}>
                              {event.changedByName} ·{" "}
                              {event.status === "RESOLVED" ? "resolvió" : "abrió"} ·{" "}
                              {new Date(event.createdAt).toLocaleString("es-UY")}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                    {(view.viewer.isOwner || view.viewer.canComment) && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={replyDrafts[comment.id] ?? ""}
                          onChange={(event) =>
                            setReplyDrafts((current) => ({
                              ...current,
                              [comment.id]: event.target.value,
                            }))
                          }
                          placeholder="Escribe una respuesta…"
                          rows={2}
                          aria-label={`Respuesta al comentario de ${comment.author.displayName}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            !replyDrafts[comment.id]?.trim() ||
                            submittingReplyFor === comment.id
                          }
                          onClick={() => void submitReply(comment)}
                        >
                          {submittingReplyFor === comment.id && (
                            <Spinner className="size-4" />
                          )}
                          Responder
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>}
      </div>

      <Dialog open={selection !== null} onOpenChange={(open) => !open && setSelection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentar selección</DialogTitle>
            <DialogDescription>
              El subrayado quedará anclado a esta versión congelada.
            </DialogDescription>
          </DialogHeader>
          <blockquote className="max-h-28 overflow-y-auto rounded-lg bg-amber-50 p-3 text-sm italic text-amber-950">
            “{selection?.selectedText}”
          </blockquote>
          <Textarea
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Escribí tu comentario…"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelection(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!commentBody.trim() || submittingComment}
              onClick={() => void submitComment()}
            >
              {submittingComment && <Spinner className="size-4" />}
              Comentar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getGoogleSignInErrorMessage(error: unknown): string | null {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : null

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Habilitá los popups e intentá nuevamente."
    case "auth/unauthorized-domain":
      return "Este dominio todavía no está autorizado para iniciar sesión con Google."
    case "auth/operation-not-allowed":
      return "El acceso con Google todavía no está habilitado en Firebase."
    case "auth/network-request-failed":
      return "No pudimos contactar a Google. Revisá tu conexión e intentá nuevamente."
    default:
      return "No se pudo iniciar sesión con Google. Intentá nuevamente."
  }
}

async function resolveSnapshotImages(
  view: SharedManuscriptView,
  slug: string,
  token?: string,
): Promise<SharedManuscriptView> {
  const cache = new Map<string, Promise<string>>()
  const resolveKey = (key: string) => {
    const cached = cache.get(key)
    if (cached) return cached
    const pending = getSharedStorageUrl(slug, key, token)
    cache.set(key, pending)
    return pending
  }

  const resolveNode = async (value: unknown): Promise<unknown> => {
    if (Array.isArray(value)) return Promise.all(value.map(resolveNode))
    if (!value || typeof value !== "object") return value
    const node = value as Record<string, unknown>
    const next: Record<string, unknown> = { ...node }
    if (Array.isArray(node.content)) {
      next.content = await Promise.all(node.content.map(resolveNode))
    }
    if (node.type === "image" && node.attrs && typeof node.attrs === "object") {
      const attrs = node.attrs as Record<string, unknown>
      const storageKey =
        typeof attrs.storageKey === "string"
          ? attrs.storageKey
          : typeof attrs.src === "string" && !attrs.src.startsWith("http")
            ? attrs.src
            : null
      if (storageKey) {
        try {
          next.attrs = { ...attrs, src: await resolveKey(storageKey) }
        } catch {
          next.attrs = attrs
        }
      }
    }
    return next
  }

  const manuscript = structuredClone(view.manuscript)
  for (const book of manuscript.books) {
    for (const chapter of book.chapters) {
      for (const scene of chapter.scenes) {
        scene.content = (await resolveNode(scene.content)) as ProseMirrorJSON | null
      }
    }
  }
  return { ...view, manuscript }
}
