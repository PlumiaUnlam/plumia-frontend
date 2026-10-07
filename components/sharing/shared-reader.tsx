"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"
import {
  BookOpen,
  Check,
  ChevronDown,
  LogIn,
  MessageSquare,
  Moon,
  Reply,
  RotateCcw,
  Send,
  Sun,
  X,
} from "lucide-react"

import type { SharedSceneProps } from "@/components/sharing/shared-scene"
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

const InteractiveSharedScene = dynamic(() =>
  import("@/components/sharing/shared-scene").then(
    (module) => module.SharedScene,
  ),
)

type SharedReaderProps = Readonly<{
  slug: string
  initialToken?: string
}>

function getViewerDescription(viewer: SharedManuscriptView["viewer"]) {
  return viewer.canComment ? "Modo revisión" : "Modo lectura"
}

function SharedReaderHeader({
  manuscriptTitle,
  frozenAt,
  chapters,
  activeChapterId,
  viewer,
  resolvedTheme,
  onSelectChapter,
  onToggleTheme,
}: Readonly<{
  manuscriptTitle: string;
  frozenAt: string;
  chapters: readonly { id: string; title: string; bookTitle: string }[];
  activeChapterId: string | null;
  viewer: SharedManuscriptView["viewer"];
  resolvedTheme: string | undefined;
  onSelectChapter: (chapterId: string) => void;
  onToggleTheme: () => void;
}>) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-black/10 bg-[#fffdf8]/95 px-4 backdrop-blur dark:border-white/10 dark:bg-[#211827]/95">
      <BookOpen className="mr-2 size-5 text-primary" />
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold">{manuscriptTitle}</h1>
        <p className="text-[11px] text-muted-foreground">
          Versión congelada · {new Date(frozenAt).toLocaleString("es-UY")}
        </p>
      </div>
      <Select value={activeChapterId ?? undefined} onValueChange={onSelectChapter}>
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
        {viewer.canComment ? (
          <MessageSquare className="size-4" />
        ) : (
          <BookOpen className="size-4" />
        )}
        {getViewerDescription(viewer)}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="ml-1"
        aria-label={
          resolvedTheme === "dark"
            ? "Cambiar a tema claro"
            : "Cambiar a tema oscuro"
        }
        title={resolvedTheme === "dark" ? "Tema claro" : "Tema oscuro"}
        onClick={onToggleTheme}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="size-3.5" />
        ) : (
          <Moon className="size-3.5" />
        )}
      </Button>
    </header>
  )
}

function getCommentCardClassName(isActive: boolean, status: ReaderComment["status"]) {
  if (isActive) return "border-primary bg-primary/5 ring-2 ring-primary/15"
  if (status === "RESOLVED") {
    return "border-border/60 bg-muted/20 text-foreground/60"
  }
  return "border-border hover:border-primary/40"
}

function getScenePlainText(content: ProseMirrorJSON | null): string {
  if (!content) return ""

  const parts: string[] = []
  const visit = (node: ProseMirrorJSON) => {
    if (node.type === "text" && node.text) parts.push(node.text)
    if (node.type === "hardBreak") parts.push("\n")
    node.content?.forEach(visit)
    if (node.type === "paragraph" || node.type === "heading") parts.push("\n\n")
  }
  visit(content)
  return parts.join("").trim()
}

function LazySharedScene(props: Readonly<SharedSceneProps>) {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const containsActiveComment = props.comments.some(
    (comment) => comment.id === props.activeCommentId,
  )
  const shouldRender = isNearViewport || containsActiveComment

  useEffect(() => {
    if (shouldRender) return
    const element = placeholderRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsNearViewport(true)
        observer.disconnect()
      },
      { rootMargin: "1000px 0px" },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [shouldRender])

  if (shouldRender) {
    return <InteractiveSharedScene {...props} />
  }

  return (
    <div
      ref={placeholderRef}
      className="border-b border-border/60 py-8 last:border-b-0"
    >
      {props.title ? (
        <h3 className="mb-5 text-center font-serif text-xl font-semibold text-foreground/90">
          {props.title}
        </h3>
      ) : null}
      <div className="shared-reader-prose min-h-12 whitespace-pre-wrap text-foreground/90">
        {getScenePlainText(props.content)}
      </div>
    </div>
  )
}

export function SharedReader({ slug, initialToken }: SharedReaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
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
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null,
  )
  const [showResolvedComments, setShowResolvedComments] = useState(false)
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
          loadedView.viewer.canComment
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
  const commentsByScene = useMemo(() => {
    const grouped = new Map<string, ReaderComment[]>()
    for (const comment of comments) {
      const current = grouped.get(comment.snapshotSceneId)
      if (current) current.push(comment)
      else grouped.set(comment.snapshotSceneId, [comment])
    }
    return grouped
  }, [comments])

  useEffect(() => {
    if (chapters.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
        const chapterId = visible?.target instanceof HTMLElement
          ? visible.target.dataset.chapterId
          : undefined
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
    window.requestAnimationFrame(() => {
      const focusCard = () => {
        const card = document.getElementById(`reader-comment-${commentId}`)
        card?.scrollIntoView({ behavior: "smooth", block: "center" })
        card?.focus({ preventScroll: true })
        return Boolean(card)
      }

      if (!focusCard()) {
        setShowResolvedComments(true)
        window.requestAnimationFrame(focusCard)
      }
    })
  }, [])

  const scrollToCommentAnchor = useCallback((commentId: string) => {
    setActiveCommentId(commentId)
    window.requestAnimationFrame(() => {
      const anchor = Array.from(
        document.querySelectorAll<HTMLElement>("[data-comment-id]"),
      ).find((element) => element.dataset.commentId === commentId)
      anchor?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
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
      if (updated.status === "RESOLVED") {
        setActiveCommentId((current) =>
          current === updated.id ? null : current,
        )
        setReplyingToCommentId((current) =>
          current === updated.id ? null : current,
        )
      }
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
      setReplyingToCommentId(null)
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

  const canOpenDiscussion = Boolean(view?.viewer.canComment)
  const openComments = comments.filter((comment) => comment.status === "OPEN")
  const resolvedComments = comments.filter(
    (comment) => comment.status === "RESOLVED",
  )
  const visibleComments = showResolvedComments
    ? [...openComments, ...resolvedComments]
    : openComments

  if (
    authLoading ||
    (firebaseUser && (loading || loadedUserId !== firebaseUser.uid))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f4f0e8] text-muted-foreground dark:bg-[#18131d]">
        <Spinner className="size-5" /> Abriendo versión compartida…
      </div>
    )
  }

  if (!firebaseUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8] p-6 dark:bg-[#18131d]">
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
      <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8] p-6 dark:bg-[#18131d]">
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
    <div className="min-h-screen bg-[#f4f0e8] text-foreground dark:bg-[#18131d]">
      <SharedReaderHeader
        manuscriptTitle={view.manuscript.title}
        frozenAt={view.manuscript.frozenAt}
        chapters={chapters}
        activeChapterId={activeChapterId}
        viewer={view.viewer}
        resolvedTheme={resolvedTheme}
        onSelectChapter={scrollToChapter}
        onToggleTheme={() =>
          setTheme(resolvedTheme === "dark" ? "light" : "dark")
        }
      />

      <div
        className={`mx-auto grid grid-cols-1 gap-6 px-4 py-6 ${
          canOpenDiscussion
            ? "max-w-[1500px] lg:grid-cols-[240px_minmax(0,760px)_320px]"
            : "max-w-[1320px] lg:grid-cols-[minmax(180px,240px)_minmax(0,760px)_minmax(180px,240px)]"
        }`}
      >
        <nav className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-[#fffdf8] p-4 shadow-sm dark:bg-[#211827]">
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
          <section className="overflow-hidden rounded-sm bg-[#fffdf8] shadow-[0_18px_60px_-35px_rgba(50,35,20,0.55)] ring-1 ring-black/5 dark:bg-[#211827] dark:ring-white/10">
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
                      <LazySharedScene
                        key={scene.id}
                        sceneId={scene.id}
                        title={scene.title}
                        content={scene.content}
                        comments={commentsByScene.get(scene.id) ?? []}
                        activeCommentId={activeCommentId}
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

        {!canOpenDiscussion && <div aria-hidden="true" className="hidden lg:block" />}

        {canOpenDiscussion ? (
          <ReaderDiscussion
            viewer={view.viewer}
            openComments={openComments}
            resolvedComments={resolvedComments}
            visibleComments={visibleComments}
            discussionError={discussionError}
            activeCommentId={activeCommentId}
            replyingToCommentId={replyingToCommentId}
            replyDrafts={replyDrafts}
            submittingReplyFor={submittingReplyFor}
            showResolvedComments={showResolvedComments}
            onToggleResolvedComments={() =>
              setShowResolvedComments((current) => !current)
            }
            onToggleResolved={toggleResolved}
            onScrollToCommentAnchor={scrollToCommentAnchor}
            onToggleReply={(commentId) =>
              setReplyingToCommentId((current) =>
                current === commentId ? null : commentId,
              )
            }
            onReplyDraftChange={(commentId, body) =>
              setReplyDrafts((current) => ({ ...current, [commentId]: body }))
            }
            onCancelReply={() => setReplyingToCommentId(null)}
            onSubmitReply={submitReply}
          />
        ) : (
          <div aria-hidden="true" className="hidden lg:block" />
        )}
      </div>

      <Dialog open={selection !== null} onOpenChange={(open) => !open && setSelection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentar selección</DialogTitle>
            <DialogDescription>
              El subrayado quedará anclado a esta versión congelada.
            </DialogDescription>
          </DialogHeader>
          <blockquote className="max-h-28 overflow-y-auto rounded-lg bg-amber-50 p-3 text-sm italic text-amber-950 dark:bg-amber-950/35 dark:text-amber-100">
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

type ReaderDiscussionProps = Readonly<{
  viewer: SharedManuscriptView["viewer"]
  openComments: readonly ReaderComment[]
  resolvedComments: readonly ReaderComment[]
  visibleComments: readonly ReaderComment[]
  discussionError: string | null
  activeCommentId: string | null
  replyingToCommentId: string | null
  replyDrafts: Readonly<Record<string, string>>
  submittingReplyFor: string | null
  showResolvedComments: boolean
  onToggleResolvedComments: () => void
  onToggleResolved: (comment: ReaderComment) => Promise<void>
  onScrollToCommentAnchor: (commentId: string) => void
  onToggleReply: (commentId: string) => void
  onReplyDraftChange: (commentId: string, body: string) => void
  onCancelReply: () => void
  onSubmitReply: (comment: ReaderComment) => Promise<void>
}>

function ReaderDiscussion({
  viewer,
  openComments,
  resolvedComments,
  visibleComments,
  discussionError,
  activeCommentId,
  replyingToCommentId,
  replyDrafts,
  submittingReplyFor,
  showResolvedComments,
  onToggleResolvedComments,
  onToggleResolved,
  onScrollToCommentAnchor,
  onToggleReply,
  onReplyDraftChange,
  onCancelReply,
  onSubmitReply,
}: ReaderDiscussionProps) {
  return (
    <aside>
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-[#fffdf8] p-4 shadow-sm dark:bg-[#211827]">
        <div className="mb-1 flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Comentarios</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {openComments.length}
          </span>
        </div>
        {discussionError && (
          <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {discussionError}
          </p>
        )}
        <p className="mb-3 pl-6 text-[11px] leading-4 text-muted-foreground">
          Seleccioná una parte del texto para dejar un comentario.
        </p>
        {resolvedComments.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="mb-3 w-full justify-between text-muted-foreground"
            aria-expanded={showResolvedComments}
            onClick={onToggleResolvedComments}
          >
            Resueltos ({resolvedComments.length})
            <ChevronDown
              className={`size-3.5 transition-transform ${
                showResolvedComments ? "rotate-180" : ""
              }`}
            />
          </Button>
        )}
        {visibleComments.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted-foreground">
            No hay comentarios pendientes.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleComments.map((comment) => (
              <ReaderCommentCard
                key={comment.id}
                comment={comment}
                viewer={viewer}
                active={activeCommentId === comment.id}
                replying={replyingToCommentId === comment.id}
                replyDraft={replyDrafts[comment.id] ?? ""}
                submittingReply={submittingReplyFor === comment.id}
                onToggleResolved={onToggleResolved}
                onScrollToCommentAnchor={onScrollToCommentAnchor}
                onToggleReply={onToggleReply}
                onReplyDraftChange={onReplyDraftChange}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

type ReaderCommentCardProps = Readonly<{
  comment: ReaderComment
  viewer: SharedManuscriptView["viewer"]
  active: boolean
  replying: boolean
  replyDraft: string
  submittingReply: boolean
  onToggleResolved: (comment: ReaderComment) => Promise<void>
  onScrollToCommentAnchor: (commentId: string) => void
  onToggleReply: (commentId: string) => void
  onReplyDraftChange: (commentId: string, body: string) => void
  onCancelReply: () => void
  onSubmitReply: (comment: ReaderComment) => Promise<void>
}>

function ReaderCommentCard({
  comment,
  viewer,
  active,
  replying,
  replyDraft,
  submittingReply,
  onToggleResolved,
  onScrollToCommentAnchor,
  onToggleReply,
  onReplyDraftChange,
  onCancelReply,
  onSubmitReply,
}: ReaderCommentCardProps) {
  const canReply = viewer.isOwner || viewer.canComment

  return (
    <article
      id={`reader-comment-${comment.id}`}
      tabIndex={-1}
      className={`rounded-lg border p-3 transition-colors ${getCommentCardClassName(
        active,
        comment.status,
      )}`}
    >
      <div className="mb-2 flex items-center gap-1">
        <div className="mr-auto min-w-0 text-[11px] text-muted-foreground">
          <span>{comment.author.displayName}</span>
          <span aria-hidden="true"> · </span>
          <time dateTime={comment.createdAt}>
            {new Date(comment.createdAt).toLocaleString("es-UY")}
          </time>
        </div>
        {viewer.isOwner && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={
              comment.status === "OPEN"
                ? "Marcar comentario como resuelto"
                : "Volver a abrir comentario"
            }
            title={
              comment.status === "OPEN"
                ? "Marcar como resuelto"
                : "Volver a abrir"
            }
            onClick={() => void onToggleResolved(comment)}
          >
            {comment.status === "OPEN" ? (
              <Check className="size-3.5" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
          </Button>
        )}
        {comment.status === "OPEN" && canReply && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Responder comentario"
            title="Responder"
            aria-expanded={replying}
            onClick={() => onToggleReply(comment.id)}
          >
            <Reply className="size-3.5" />
          </Button>
        )}
      </div>
      <button
        type="button"
        className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={() => onScrollToCommentAnchor(comment.id)}
        aria-label={`Ir al texto del comentario de ${comment.author.displayName}`}
      >
        <blockquote className="mb-2 border-l-2 border-amber-400 pl-2 text-xs italic text-muted-foreground dark:border-amber-500">
          “{comment.selectedText}”
        </blockquote>
        <p className="text-sm">{comment.body}</p>
      </button>
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
      {canReply && replying && (
        <div className="mt-3 rounded-md bg-muted/40 p-2">
          <Textarea
            autoFocus
            value={replyDraft}
            onChange={(event) =>
              onReplyDraftChange(comment.id, event.target.value)
            }
            placeholder="Escribe una respuesta…"
            rows={2}
            aria-label={`Respuesta al comentario de ${comment.author.displayName}`}
          />
          <div className="mt-2 flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Cancelar respuesta"
              title="Cancelar"
              disabled={submittingReply}
              onClick={onCancelReply}
            >
              <X className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              aria-label="Enviar respuesta"
              title="Enviar"
              disabled={!replyDraft.trim() || submittingReply}
              onClick={() => void onSubmitReply(comment)}
            >
              {submittingReply ? (
                <Spinner className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </article>
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

function getImageStorageKey(attrs: Record<string, unknown>) {
  if (typeof attrs.storageKey === "string") return attrs.storageKey
  if (typeof attrs.src === "string" && !attrs.src.startsWith("http")) {
    return attrs.src
  }
  return null
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
      const storageKey = getImageStorageKey(attrs)
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
  const scenes = manuscript.books.flatMap((book) =>
    book.chapters.flatMap((chapter) => chapter.scenes),
  )
  await scenes.reduce(
    (processing, scene) =>
      processing.then(async () => {
        scene.content = (await resolveNode(scene.content)) as ProseMirrorJSON | null
      }),
    Promise.resolve(),
  )
  return { ...view, manuscript }
}
