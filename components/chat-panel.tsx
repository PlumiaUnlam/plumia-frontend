"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type FormEvent,
} from "react"
import {
  BookOpen,
  Clock3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Feather,
  FileText,
  History,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Sparkles,
  StickyNote,
  Square,
  Waypoints,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  createChatThread,
  getChatMessages,
  getChatThreads,
  sendChatMessage,
  updateChatThread,
} from "@/services/chat.service"
import { useVoiceTranscriber } from "@/hooks/use-voice-transcriber"
import { useEditorStore } from "@/stores/editor.store"
import type { ChatMessage, ChatSource, ChatThread } from "@/types/chat"

type ChatPanelProps = {
  readonly projectId: string
  readonly currentChapterId?: string
  readonly primaryImageUrls?: Readonly<Record<string, string>>
}

const promptSuggestions = [
  "¿Qué hechos importantes registra la línea de tiempo?",
  "¿Cómo se relacionan los personajes mencionados en esta parte?",
  "¿Qué detalles de la Wiki aparecen también en el manuscrito?",
]

export function ChatPanel({
  projectId,
  currentChapterId,
  primaryImageUrls = {},
}: ChatPanelProps) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const handleVoiceTranscript = useCallback((text: string) => {
    setDraft((current) => {
      const base = current.trim()
      return `${base}${base ? " " : ""}${text}`
    })
  }, [])
  const {
    supported: speechSupported,
    isRecording,
    isTranscribing,
    audioLevel,
    error: voiceError,
    start: startVoiceRecording,
    stop: stopVoiceRecording,
    clearError: clearVoiceError,
  } = useVoiceTranscriber({ onTranscript: handleVoiceTranscript })
  const isVoiceBusy = isRecording || isTranscribing
  const displayError = voiceError ?? error

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    void getChatThreads(projectId, { signal: controller.signal })
      .then(async (threads) => {
        if (!cancelled) setThreads(threads)
        const currentThread = threads[0]
        if (!currentThread) return { thread: null, messages: [] }
        return {
          thread: currentThread,
          messages: await getChatMessages(currentThread.id, {
            signal: controller.signal,
          }),
        }
      })
      .then((result) => {
        if (cancelled) return
        setThreadId(result.thread?.id ?? null)
        setMessages(result.messages)
      })
      .catch((loadError: unknown) => {
        if (cancelled || controller.signal.aborted) return
        setError(errorMessage(loadError, "No se pudo cargar la conversación."))
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted) setIsLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [projectId])

  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isFullscreen])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isSending])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || isSending || isVoiceBusy) return

    const optimisticId = `pending-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      threadId: threadId ?? "pending",
      role: "user",
      content,
      sources: [],
      inputTokens: null,
      outputTokens: null,
      createdAt: new Date().toISOString(),
    }
    setDraft("")
    setError(null)
    setIsSending(true)
    setMessages((current) => [...current, optimisticMessage])

    try {
      let activeThreadId = threadId
      if (!activeThreadId) {
        const thread = await createChatThread(projectId, currentChapterId)
        activeThreadId = thread.id
        setThreadId(thread.id)
        setThreads((current) => [thread, ...current])
      }
      const exchange = await sendChatMessage(
        activeThreadId,
        content,
        currentChapterId,
      )
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticId),
        exchange.userMessage,
        exchange.assistantMessage,
      ])
      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeThreadId && thread.title === "Nueva conversacion"
            ? { ...thread, title: content.slice(0, 197) }
            : thread,
        ),
      )
    } catch (sendError: unknown) {
      setMessages((current) =>
        current.filter((message) => message.id !== optimisticId),
      )
      setDraft(content)
      setError(errorMessage(sendError, "No se pudo enviar la consulta."))
    } finally {
      setIsSending(false)
    }
  }

  const selectThread = async (nextThreadId: string) => {
    setIsHistoryOpen(false)
    if (nextThreadId === "new") {
      setThreadId(null)
      setMessages([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const history = await getChatMessages(nextThreadId)
      setThreadId(nextThreadId)
      setMessages(history)
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, "No se pudo abrir la conversación."))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAntiSpoiler = async () => {
    const currentThread = threads.find((thread) => thread.id === threadId)
    if (!currentThread) return
    try {
      const updated = await updateChatThread(currentThread.id, {
        antiSpoilerEnabled: !currentThread.antiSpoilerEnabled,
      })
      setThreads((current) =>
        current.map((thread) => (thread.id === updated.id ? updated : thread)),
      )
    } catch (updateError: unknown) {
      setError(
        errorMessage(updateError, "No se pudo cambiar el filtro anti-spoiler."),
      )
    }
  }

  const currentThread = threads.find((thread) => thread.id === threadId)

  const toggleVoiceInput = () => {
    if (isRecording) {
      stopVoiceRecording()
      return
    }
    if (isTranscribing) return

    setError(null)
    clearVoiceError()
    void startVoiceRecording()
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-2 backdrop-blur-[2px] sm:p-6 lg:p-10"
          : "contents"
      }
    >
      <section
        className={`flex min-h-0 flex-col bg-card ${
          isFullscreen
            ? "h-full max-h-[calc(100vh-1rem)] w-full max-w-5xl flex-none overflow-hidden rounded-2xl border border-border shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl"
            : "flex-1"
        }`}
      >
        <div className="relative shrink-0 border-b border-border px-3 py-3">
          <div className="flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] font-medium text-primary">
              <Sparkles className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                {currentThread?.title || "Nueva conversación"}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsHistoryOpen((open) => !open)}
              aria-label="Abrir historial de conversaciones"
              aria-expanded={isHistoryOpen}
              title="Historial de conversaciones"
              className={`size-7 rounded-lg ${
                isHistoryOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Clock3 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void selectThread("new")}
              aria-label="Nueva conversación"
              title="Nueva conversación"
              className="size-7 rounded-lg text-muted-foreground"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!currentThread}
              onClick={() => void toggleAntiSpoiler()}
              aria-label={
                currentThread?.antiSpoilerEnabled
                  ? "Desactivar filtro anti-spoiler"
                  : "Activar filtro anti-spoiler"
              }
              aria-pressed={currentThread?.antiSpoilerEnabled ?? true}
              title={
                currentThread?.antiSpoilerEnabled
                  ? "Anti-spoiler activo"
                  : "Anti-spoiler desactivado"
              }
              className="size-7 rounded-lg text-muted-foreground"
            >
              {currentThread?.antiSpoilerEnabled === false ? (
                <ShieldOff className="size-3.5" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsFullscreen((fullscreen) => !fullscreen)}
              aria-label={
                isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
              }
              title={
                isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
              }
              className="size-7 rounded-lg text-muted-foreground"
            >
              {isFullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Las respuestas se basan en tu obra y muestran las fuentes utilizadas.
          </p>
          {isHistoryOpen && (
            <ChatHistoryMenu
              threads={threads}
              currentThreadId={threadId}
              onSelectThread={(nextThreadId) => void selectThread(nextThreadId)}
              onNewThread={() => void selectThread("new")}
            />
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-3xl">
            {isLoading ? (
              <ChatLoadingState />
            ) : messages.length === 0 ? (
              <EmptyChatState onSuggestion={setDraft} />
            ) : (
              <div className="space-y-4">
                {messages
                  .filter((message) => message.role !== "system")
                  .map((message) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      projectId={projectId}
                      primaryImageUrls={primaryImageUrls}
                    />
                  ))}
                {isSending && <ThinkingBubble />}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-6 sm:py-4"
      >
        <div className="mx-auto w-full max-w-3xl">
          {displayError && (
            <div
              role="alert"
              className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2 text-[10px] leading-relaxed text-destructive"
            >
              <RefreshCw className="mt-0.5 size-3 shrink-0" />
              {displayError}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-muted/70 p-2 transition-colors focus-within:border-primary/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/10">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              rows={1}
              maxLength={4000}
              disabled={isSending}
              aria-label="Pregunta sobre tu obra"
              placeholder="Pregunta sobre tu obra..."
              className="max-h-28 min-h-9 w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-[11px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-60"
            />
            {isRecording && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                <div
                  className="relative flex size-8 items-center justify-center rounded-full border border-primary/30 bg-primary/5"
                  aria-label={`Nivel de audio: ${Math.round(audioLevel * 100)}%`}
                  role="img"
                >
                  <span
                    className="absolute inset-0 rounded-full bg-primary/20 transition-transform duration-75"
                    style={{
                      opacity: 0.35 + audioLevel * 0.65,
                      transform: `scale(${0.75 + audioLevel * 0.25})`,
                    }}
                  />
                  <Mic className="relative size-3.5 text-primary" />
                </div>
                <span>{getAudioSignalMessage(audioLevel)}</span>
              </div>
            )}
            {isTranscribing && (
              <output
                className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground"
                aria-live="polite"
              >
                <Loader2 className="size-3 animate-spin" />
                Transcribiendo tu pregunta...
              </output>
            )}
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="px-1 text-[9px] text-muted-foreground">
                PlumIA · fuentes de tu proyecto
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={!speechSupported || isSending || isTranscribing}
                  onClick={toggleVoiceInput}
                  aria-label={
                    isRecording ? "Detener dictado" : "Dictar pregunta"
                  }
                  aria-pressed={isRecording}
                  title={
                    speechSupported
                      ? isRecording
                        ? "Detener dictado"
                        : "Dictar pregunta con Whisper"
                      : "El navegador no permite grabar audio"
                  }
                  className={
                    isRecording
                      ? "animate-pulse rounded-xl bg-primary/15 text-primary"
                      : "rounded-xl text-muted-foreground"
                  }
                >
                  {isTranscribing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : isRecording ? (
                    <Square className="size-3.5 fill-current" />
                  ) : speechSupported ? (
                    <Mic className="size-3.5" />
                  ) : (
                    <MicOff className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!draft.trim() || isSending || isVoiceBusy}
                  aria-label="Enviar consulta"
                  className="rounded-xl"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
            {isRecording
              ? "Escuchando… hablá con naturalidad"
              : isTranscribing
                ? "Transcribiendo…"
                : "Enter para enviar · Shift + Enter para nueva línea"}
          </p>
        </div>
      </form>
      </section>
    </div>
  )
}

function EmptyChatState({
  onSuggestion,
}: {
  readonly onSuggestion: (suggestion: string) => void
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-5 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Feather className="size-5" />
      </div>
      <h3 className="text-xs font-semibold text-foreground">
        Tu obra, lista para consultar
      </h3>
      <p className="mt-1 max-w-60 text-[10px] leading-relaxed text-muted-foreground">
        Pregunta por escenas, personajes, relaciones, imágenes o hechos de la
        línea de tiempo.
      </p>
      <div className="mt-4 w-full space-y-2">
        {promptSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestion(suggestion)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[10px] leading-relaxed text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatBubble({
  message,
  projectId,
  primaryImageUrls,
}: {
  readonly message: ChatMessage
  readonly projectId: string
  readonly primaryImageUrls: Readonly<Record<string, string>>
}) {
  const isUser = message.role === "user"
  const [sourcesExpanded, setSourcesExpanded] = useState(true)
  return (
    <article className={isUser ? "ml-8" : "mr-3"}>
      <div className={`flex items-start gap-2 ${isUser ? "justify-end" : ""}`}>
        {!isUser && (
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Feather className="size-3" />
          </div>
        )}
        <div
          className={`min-w-0 rounded-2xl px-3 py-2.5 text-[11px] leading-[1.55] whitespace-pre-wrap ${
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-tl-md bg-muted text-foreground"
          }`}
        >
          {message.content}
        </div>
      </div>
      {!isUser && message.sources.length > 0 && (
        <div className="ml-8 mt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
              Referencias utilizadas
              <span className="ml-1 font-normal text-muted-foreground/70">
                · {message.sources.length}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSourcesExpanded((expanded) => !expanded)}
              aria-expanded={sourcesExpanded}
              aria-label={
                sourcesExpanded
                  ? "Ocultar referencias utilizadas"
                  : "Mostrar referencias utilizadas"
              }
              className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {sourcesExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          </div>
          {sourcesExpanded && (
            <div className="space-y-1.5">
              {message.sources.map((source, index) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  citationNumber={index + 1}
                  projectId={projectId}
                  imageUrl={
                    (source.entityId && primaryImageUrls[source.entityId]) ||
                    source.imageUrl ||
                    undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function ChatHistoryMenu({
  threads,
  currentThreadId,
  onSelectThread,
  onNewThread,
}: {
  readonly threads: ChatThread[]
  readonly currentThreadId: string | null
  readonly onSelectThread: (threadId: string) => void
  readonly onNewThread: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label="Historial de conversaciones"
      className="absolute right-2 top-[4.5rem] z-30 w-[min(19rem,calc(100%-1rem))] overflow-hidden rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl shadow-primary/10"
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <History className="size-3.5 text-primary" />
        <span className="text-[10px] font-semibold">Historial</span>
        <span className="ml-auto text-[9px] text-muted-foreground">
          {threads.length} {threads.length === 1 ? "conversación" : "conversaciones"}
        </span>
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {threads.length === 0 ? (
          <p className="px-2.5 py-4 text-center text-[10px] text-muted-foreground">
            Todavía no hay conversaciones guardadas.
          </p>
        ) : (
          threads.map((thread) => {
            const isCurrent = thread.id === currentThreadId
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  isCurrent
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <History className="mt-0.5 size-3.5 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-medium">
                    {thread.title || "Nueva conversación"}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-muted-foreground">
                    {formatThreadDate(thread.updatedAt)}
                  </span>
                </span>
                {isCurrent && (
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            )
          })
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onNewThread}
        className="mt-1 w-full justify-start gap-2 rounded-xl px-2.5 text-[10px] text-primary hover:bg-primary/10"
      >
        <Plus className="size-3.5" />
        Nueva conversación
      </Button>
    </div>
  )
}

function formatThreadDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(date)
}

function SourceCard({
  source,
  citationNumber,
  projectId,
  imageUrl,
}: {
  readonly source: ChatSource
  readonly citationNumber: number
  readonly projectId: string
  readonly imageUrl?: string
}) {
  const router = useRouter()
  const setActiveScene = useEditorStore((state) => state.setActiveScene)
  const focusCitation = useEditorStore((state) => state.focusCitation)
  const clearCitationFocus = useEditorStore((state) => state.clearCitationFocus)
  const canNavigate = Boolean(source.sceneId || source.entityId || source.route)
  const isTimelineSource = source.kind === "timeline"
  const timelineRoute = isTimelineSource
    ? getTimelineSourceRoute(source, projectId)
    : null
  const wikiDetails =
    source.kind === "wiki" ? getWikiSourceDetails(source) : null
  const Icon =
    source.kind === "manuscript"
      ? BookOpen
      : source.kind === "timeline"
        ? Clock3
        : source.kind === "storyboard"
          ? StickyNote
          : source.kind === "summary"
            ? FileText
          : source.kind === "audit"
            ? ShieldAlert
          : source.kind === "application"
            ? Waypoints
            : FileText

  const navigateToScene = () => {
    if (!source.sceneId) return

    setActiveScene(source.sceneId)
    if (source.textQuote) {
      focusCitation({
        sceneId: source.sceneId,
        textQuote: source.textQuote,
      })
    } else {
      clearCitationFocus()
    }
  }

  const navigateToTimeline = () => {
    if (timelineRoute) router.push(timelineRoute)
  }

  const navigate = () => {
    if (isTimelineSource) {
      navigateToTimeline()
      return
    }
    if (source.sceneId) {
      navigateToScene()
      return
    }
    if (source.entityId) {
      router.push(
        `/projects/${projectId}/worldbuilding?entityId=${source.entityId}`,
      )
      return
    }
    if (source.route) {
      router.push(source.route)
    }
  }

  const cardContent = (
    <>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={wikiDetails?.name ?? ""}
          width={wikiDetails ? 44 : 32}
          height={wikiDetails ? 44 : 32}
          unoptimized
          className={`${wikiDetails ? "size-11 rounded-xl" : "size-8 rounded-lg"} shrink-0 object-cover ring-1 ring-black/5`}
        />
      ) : (
        <div
          className={`${wikiDetails ? "size-11 rounded-xl" : "size-7 rounded-lg"} flex shrink-0 items-center justify-center bg-primary/10 text-primary`}
        >
          <Icon className="size-3.5" />
        </div>
      )}
      <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-foreground">
            <span className="shrink-0 text-primary">[{citationNumber}]</span>
          {wikiDetails ? (
            <span className="truncate text-[10px] font-semibold">
              {wikiDetails.name}
            </span>
          ) : (
            <span className="truncate">{source.label}</span>
          )}
          {canNavigate && !isTimelineSource && (
            <ExternalLink className="size-2.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </span>
        {wikiDetails ? (
          <>
            <span className="mt-0.5 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-medium text-primary">
              {wikiDetails.entityType}
            </span>
            <span className="mt-1 line-clamp-2 block text-[9px] leading-relaxed text-muted-foreground">
              {wikiDetails.description}
            </span>
            {wikiDetails.aliases.length > 0 && (
              <span className="mt-1 block truncate text-[8px] text-muted-foreground/80">
                También: {wikiDetails.aliases.slice(0, 3).join(" · ")}
              </span>
            )}
          </>
        ) : (
          <span className="mt-0.5 line-clamp-2 block text-[9px] leading-relaxed text-muted-foreground">
            {source.excerpt}
          </span>
        )}
      </span>
    </>
  )

  if (isTimelineSource) {
    return (
      <div className="w-full rounded-xl border border-border bg-background p-2 text-left">
        <div className="flex items-start gap-2">{cardContent}</div>
        <div className="ml-9 mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={navigateToTimeline}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[9px] font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Clock3 className="size-3" />
            Ver hecho
          </button>
          {source.sceneId && (
            <button
              type="button"
              onClick={navigateToScene}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[9px] font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <BookOpen className="size-3" />
              Ver en la obra{source.textQuote ? " y resaltar" : ""}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={!canNavigate}
      onClick={navigate}
      className="group flex w-full items-start gap-2 rounded-xl border border-border bg-background p-2 text-left transition-colors enabled:hover:border-primary/30 enabled:hover:bg-primary/5 disabled:cursor-default"
    >
      {cardContent}
    </button>
  )
}

function getTimelineSourceRoute(source: ChatSource, projectId: string): string {
  const route =
    source.route ??
    `/projects/${encodeURIComponent(projectId)}/worldbuilding?tab=timeline`
  const eventId = source.id.startsWith("timeline:")
    ? source.id.slice("timeline:".length)
    : null

  if (!eventId || route.includes("eventId=")) return route

  return `${route}${route.includes("?") ? "&" : "?"}eventId=${encodeURIComponent(eventId)}`
}

type WikiSourceDetails = {
  readonly entityType: string
  readonly name: string
  readonly description: string
  readonly aliases: string[]
}

function getWikiSourceDetails(source: ChatSource): WikiSourceDetails {
  const [entityType = "Entidad", ...nameParts] = source.label.split(" · ")
  const lines = source.excerpt
    .replace(/\s+/g, " ")
    .trim()
    .split(
      /\s+(?=(?:alias|ficha|hechos|estados|relaciones):|la entidad tiene una imagen asociada\.?$)/i,
    )
    .filter(Boolean)
  const aliasLine = lines.find((line) => /^alias:/i.test(line))
  const aliases = aliasLine
    ? aliasLine
        .replace(/^alias:\s*/i, "")
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean)
    : []
  const description =
    lines.find(
      (line) =>
        !/^(alias|ficha|hechos|estados|relaciones):/i.test(line) &&
        !/^la entidad tiene una imagen asociada\.?$/i.test(line),
    ) ?? "Información registrada en la Wiki del proyecto."

  return {
    entityType,
    name: nameParts.join(" · ") || "Entidad sin nombre",
    description,
    aliases,
  }
}

function ThinkingBubble() {
  return (
    <div className="mr-3 flex items-start gap-2" aria-label="Analizando la obra">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Feather className="size-3" />
      </div>
      <div className="flex h-9 items-center gap-1 rounded-2xl rounded-tl-md bg-muted px-3">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 animate-bounce rounded-full bg-primary/45"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function ChatLoadingState() {
  return (
    <div className="space-y-4 py-3" aria-label="Cargando conversación">
      <div className="ml-auto h-14 w-3/4 animate-pulse rounded-2xl bg-primary/15" />
      <div className="h-20 w-4/5 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

function getAudioSignalMessage(audioLevel: number): string {
  if (audioLevel > 0.05) return "Señal de audio detectada"
  return "Escuchando..."
}
