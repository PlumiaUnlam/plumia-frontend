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
  Search,
  Settings,
  Sparkles,
  Square,
  Trash2,
  Pencil,
  Check,
  X,
  Waypoints,
} from "lucide-react"

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
  createChatThread,
  deleteChatThread,
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
  readonly primaryImageUrls?: Readonly<Record<string, string>>
}

const HISTORY_PAGE_SIZE = 8
const WAITING_MESSAGES = [
  "Buscando fragmentos relevantes…",
  "Contrastando manuscrito, Wiki y línea de tiempo…",
  "Verificando las referencias…",
  "Preparando una respuesta respaldada…",
]

const promptSuggestions = [
  "¿Qué hechos importantes registra la línea de tiempo?",
  "¿Cómo se relacionan los personajes mencionados en esta parte?",
  "¿Qué detalles de la Wiki aparecen también en el manuscrito?",
]

export function ChatPanel({
  projectId,
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
  const [failedContent, setFailedContent] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState("")
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreThreads, setHasMoreThreads] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [waitingMessageIndex, setWaitingMessageIndex] = useState(0)
  const [hasUsedVoiceInput, setHasUsedVoiceInput] = useState(false)
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState<ChatThread | null>(null)
  const [isDeletingThread, setIsDeletingThread] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const threadsRequestRef = useRef<AbortController | null>(null)
  const sendAbortControllerRef = useRef<AbortController | null>(null)
  const handleVoiceTranscript = useCallback((text: string) => {
    setDraft((current) => {
      const base = current.trim()
      return `${base}${base ? " " : ""}${text}`
    })
  }, [])
  const handleBeforeSourceNavigation = useCallback(() => {
    setIsFullscreen(false)
  }, [])
  const {
    supported: speechSupported,
    isRecording,
    isTranscribing,
    audioLevel,
    audioInputDevices,
    selectedAudioInputId,
    selectAudioInput,
    refreshAudioInputDevices,
    recordingDurationSeconds,
    error: voiceError,
    start: startVoiceRecording,
    stop: stopVoiceRecording,
    clearError: clearVoiceError,
  } = useVoiceTranscriber({ onTranscript: handleVoiceTranscript })
  const isVoiceBusy = isRecording || isTranscribing
  const displayError = voiceError ?? error

  const loadThreads = useCallback(
    async (page: number, search: string, append: boolean) => {
      threadsRequestRef.current?.abort()
      const controller = new AbortController()
      threadsRequestRef.current = controller
      setIsHistoryLoading(true)
      try {
        const result = await getChatThreads(projectId, {
          signal: controller.signal,
          page,
          pageSize: HISTORY_PAGE_SIZE,
          search,
        })
        if (controller.signal.aborted) return
        setThreads((current) =>
          append ? [...current, ...result.items] : result.items,
        )
        setHistoryPage(result.page)
        setHasMoreThreads(result.hasMore)
      } catch (loadError: unknown) {
        if (!controller.signal.aborted) {
          setError(errorMessage(loadError, "No se pudo cargar el historial."))
        }
      } finally {
        if (threadsRequestRef.current === controller) {
          threadsRequestRef.current = null
          setIsHistoryLoading(false)
        }
      }
    },
    [projectId],
  )

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    void getChatThreads(projectId, {
      signal: controller.signal,
      page: 1,
      pageSize: HISTORY_PAGE_SIZE,
    })
      .then(async (threadPage) => {
        if (!cancelled) {
          setThreads(threadPage.items)
          setHistoryPage(threadPage.page)
          setHasMoreThreads(threadPage.hasMore)
        }
        const currentThread = threadPage.items[0]
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
    if (!isHistoryOpen) return
    const timeout = window.setTimeout(() => {
      void loadThreads(1, historySearch, false)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [historySearch, isHistoryOpen, loadThreads])

  useEffect(() => {
    if (!isSending) return
    const interval = window.setInterval(() => {
      setWaitingMessageIndex((current) =>
        (current + 1) % WAITING_MESSAGES.length,
      )
    }, 2600)
    return () => window.clearInterval(interval)
  }, [isSending])

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

  const sendContent = useCallback(
    async (content: string) => {
      if (!content || isSending || isVoiceBusy) return
      const controller = new AbortController()
      sendAbortControllerRef.current = controller
      const optimisticId = `pending-${Date.now()}`
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        threadId: threadId ?? "pending",
        role: "user",
        content,
        sources: [],
        actions: [],
        inputTokens: null,
        outputTokens: null,
        createdAt: new Date().toISOString(),
      }
      setDraft("")
      setError(null)
      setFailedContent(null)
      setWaitingMessageIndex(0)
      setIsSending(true)
      setMessages((current) => [...current, optimisticMessage])

      try {
        let activeThreadId = threadId
        if (!activeThreadId) {
          const thread = await createChatThread(projectId, {
            signal: controller.signal,
          })
          activeThreadId = thread.id
          setThreadId(thread.id)
          setThreads((current) => [thread, ...current])
        }
        const exchange = await sendChatMessage(activeThreadId, content, {
          signal: controller.signal,
        })
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
        setFailedContent(content)
        setError(
          isAbortError(sendError)
            ? "Respuesta cancelada. Podés reintentarlo cuando quieras."
            : errorMessage(sendError, "No se pudo enviar la consulta."),
        )
      } finally {
        if (sendAbortControllerRef.current === controller) {
          sendAbortControllerRef.current = null
        }
        setIsSending(false)
      }
    },
    [isSending, isVoiceBusy, projectId, threadId],
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendContent(draft.trim())
  }

  const cancelSending = () => {
    sendAbortControllerRef.current?.abort()
  }

  const retryLastRequest = () => {
    if (failedContent) void sendContent(failedContent)
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

  const renameThread = async (nextThreadId: string, title: string) => {
    const updated = await updateChatThread(nextThreadId, { title })
    setThreads((current) =>
      current.map((thread) => (thread.id === updated.id ? updated : thread)),
    )
  }

  const removeThread = async (nextThreadId: string) => {
    await deleteChatThread(nextThreadId)
    setThreads((current) => current.filter((thread) => thread.id !== nextThreadId))
    if (threadId === nextThreadId) {
      setThreadId(null)
      setMessages([])
    }
  }

  const handleRenameThread = async (nextThreadId: string, title: string) => {
    try {
      await renameThread(nextThreadId, title)
    } catch (updateError: unknown) {
      setError(errorMessage(updateError, "No se pudo renombrar la conversación."))
      throw updateError
    }
  }

  const requestDeleteThread = (nextThreadId: string) => {
    const nextThread = threads.find((thread) => thread.id === nextThreadId)
    if (nextThread) setThreadToDelete(nextThread)
  }

  const confirmDeleteThread = async () => {
    const nextThread = threadToDelete
    if (!nextThread || isDeletingThread) return

    setIsDeletingThread(true)
    try {
      await removeThread(nextThread.id)
      setThreadToDelete(null)
    } catch (deleteError: unknown) {
      setError(errorMessage(deleteError, "No se pudo eliminar la conversación."))
    } finally {
      setIsDeletingThread(false)
    }
  }

  const loadMoreThreads = () => {
    if (!hasMoreThreads || isHistoryLoading) return
    void loadThreads(historyPage + 1, historySearch, true)
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
    setHasUsedVoiceInput(true)
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
              search={historySearch}
              isLoading={isHistoryLoading}
              hasMore={hasMoreThreads}
              onSelectThread={(nextThreadId) => void selectThread(nextThreadId)}
              onNewThread={() => void selectThread("new")}
              onSearchChange={setHistorySearch}
              onLoadMore={loadMoreThreads}
              onRenameThread={handleRenameThread}
              onRequestDeleteThread={requestDeleteThread}
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
                      onBeforeSourceNavigation={handleBeforeSourceNavigation}
                    />
                  ))}
                {isSending && (
                  <ThinkingBubble
                    status={WAITING_MESSAGES[waitingMessageIndex]}
                  />
                )}
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
              {failedContent && !isSending && (
                <button
                  type="button"
                  onClick={retryLastRequest}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold underline underline-offset-2"
                >
                  <RefreshCw className="size-3" />
                  Reintentar
                </button>
              )}
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
                <span>
                  {getAudioSignalMessage(audioLevel)} · {formatDuration(recordingDurationSeconds)} / 3:00
                </span>
                {hasUsedVoiceInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setIsVoiceSettingsOpen(true)
                      void refreshAudioInputDevices()
                    }}
                    aria-label="Configurar micrófono"
                    title="Configurar micrófono"
                    className="ml-auto size-7 rounded-lg text-muted-foreground hover:text-primary"
                  >
                    <Settings className="size-3.5" />
                  </Button>
                )}
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
                {isSending ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    onClick={cancelSending}
                    aria-label="Detener respuesta"
                    title="Detener respuesta"
                    className="rounded-xl"
                  >
                    <Square className="size-3.5 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon-sm"
                    disabled={!draft.trim() || isVoiceBusy}
                    aria-label="Enviar consulta"
                    className="rounded-xl"
                  >
                    <Send className="size-3.5" />
                  </Button>
                )}
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
          {isVoiceSettingsOpen && isRecording && (
            <VoiceSettingsModal
              audioInputDevices={audioInputDevices}
              selectedAudioInputId={selectedAudioInputId}
              audioLevel={audioLevel}
              onSelectAudioInput={selectAudioInput}
              onClose={() => setIsVoiceSettingsOpen(false)}
            />
          )}
        </div>
      </form>
      </section>
      <DeleteThreadDialog
        thread={threadToDelete}
        isDeleting={isDeletingThread}
        onOpenChange={(open) => {
          if (!open && !isDeletingThread) setThreadToDelete(null)
        }}
        onConfirm={() => void confirmDeleteThread()}
      />
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
  onBeforeSourceNavigation,
}: {
  readonly message: ChatMessage
  readonly projectId: string
  readonly primaryImageUrls: Readonly<Record<string, string>>
  readonly onBeforeSourceNavigation: () => void
}) {
  const isUser = message.role === "user"
  const actions = message.actions ?? []
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
      {!isUser && actions.length > 0 && (
        <div className="ml-8 mt-2 space-y-1.5">
          <span className="px-1 text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
            Acceso directo
          </span>
          {actions.map((action) => (
            <NavigationActionCard
              key={action.id}
              action={action}
              onBeforeNavigation={onBeforeSourceNavigation}
            />
          ))}
        </div>
      )}
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
                  onBeforeNavigation={onBeforeSourceNavigation}
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

function NavigationActionCard({
  action,
  onBeforeNavigation,
}: {
  readonly action: ChatMessage["actions"][number]
  readonly onBeforeNavigation: () => void
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        onBeforeNavigation()
        router.push(action.route)
      }}
      className="group flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/10"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Waypoints className="size-3.5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
          <span className="truncate">{action.label}</span>
          <ExternalLink className="size-2.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="mt-0.5 block text-[9px] text-muted-foreground">
          {action.description}
        </span>
      </span>
      <span className="shrink-0 text-[9px] font-semibold text-primary">
        Ir ahí
      </span>
    </button>
  )
}

function DeleteThreadDialog({
  thread,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  readonly thread: ChatThread | null
  readonly isDeleting: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
}) {
  return (
    <Dialog open={thread !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar conversación</DialogTitle>
          <DialogDescription>
            ¿Seguro que querés eliminar “{thread?.title || "Nueva conversación"}”?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
            {isDeleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChatHistoryMenu({
  threads,
  currentThreadId,
  search,
  isLoading,
  hasMore,
  onSelectThread,
  onNewThread,
  onSearchChange,
  onLoadMore,
  onRenameThread,
  onRequestDeleteThread,
}: {
  readonly threads: ChatThread[]
  readonly currentThreadId: string | null
  readonly search: string
  readonly isLoading: boolean
  readonly hasMore: boolean
  readonly onSelectThread: (threadId: string) => void
  readonly onNewThread: () => void
  readonly onSearchChange: (value: string) => void
  readonly onLoadMore: () => void
  readonly onRenameThread: (threadId: string, title: string) => Promise<void>
  readonly onRequestDeleteThread: (threadId: string) => void
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
      <div className="relative px-1 pb-2">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-3 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar conversaciones…"
          aria-label="Buscar conversaciones"
          className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-[10px] outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10"
        />
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isLoading && threads.length === 0 ? (
          <p className="flex items-center justify-center gap-1.5 px-2.5 py-4 text-center text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Buscando…
          </p>
        ) : threads.length === 0 ? (
          <p className="px-2.5 py-4 text-center text-[10px] text-muted-foreground">
            {search
              ? "No hay conversaciones que coincidan."
              : "Todavía no hay conversaciones guardadas."}
          </p>
        ) : (
          threads.map((thread) => {
            const isCurrent = thread.id === currentThreadId
            return (
              <div
                key={thread.id}
                className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  isCurrent
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
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
                <div className="flex shrink-0 items-center gap-0.5">
                  <ThreadRenameButton
                    thread={thread}
                    onRename={onRenameThread}
                  />
                  <button
                    type="button"
                    onClick={() => onRequestDeleteThread(thread.id)}
                    aria-label={`Eliminar ${thread.title || "conversación"}`}
                    title="Eliminar conversación"
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLoadMore}
          disabled={isLoading}
          className="mt-1 w-full justify-center gap-1 rounded-xl px-2.5 text-[10px] text-muted-foreground hover:bg-muted"
        >
          {isLoading && <Loader2 className="size-3 animate-spin" />}
          Cargar más
        </Button>
      )}
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

function ThreadRenameButton({
  thread,
  onRename,
}: {
  readonly thread: ChatThread
  readonly onRename: (threadId: string, title: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(thread.title)

  if (isEditing) {
    return (
      <span className="flex items-center gap-0.5">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void submitRename()
            }
            if (event.key === "Escape") setIsEditing(false)
          }}
          aria-label="Nuevo nombre de conversación"
          className="h-6 w-28 rounded-md border border-primary/30 bg-background px-1.5 text-[9px] outline-none"
        />
        <button
          type="button"
          onClick={() => void submitRename()}
          aria-label="Guardar nombre"
          className="flex size-6 items-center justify-center rounded-md text-primary hover:bg-primary/10"
        >
          <Check className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          aria-label="Cancelar renombrado"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="size-3" />
        </button>
      </span>
    )
  }

  async function submitRename() {
    const nextTitle = title.trim()
    if (!nextTitle) return
    await onRename(thread.id, nextTitle)
    setIsEditing(false)
  }

  return (
    <button
      type="button"
      onClick={() => {
        setTitle(thread.title)
        setIsEditing(true)
      }}
      aria-label={`Renombrar ${thread.title || "conversación"}`}
      title="Renombrar conversación"
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
    >
      <Pencil className="size-3" />
    </button>
  )
}

function VoiceSettingsModal({
  audioInputDevices,
  selectedAudioInputId,
  audioLevel,
  onSelectAudioInput,
  onClose,
}: {
  readonly audioInputDevices: ReadonlyArray<{ deviceId: string; label: string }>
  readonly selectedAudioInputId: string
  readonly audioLevel: number
  readonly onSelectAudioInput: (deviceId: string) => void
  readonly onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-label="Configuración del micrófono"
      className="mt-2 rounded-xl border border-primary/20 bg-background p-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold">Configurar micrófono</p>
          <p className="text-[9px] text-muted-foreground">
            Hablá para comprobar que la señal se escuche correctamente.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Cerrar configuración del micrófono"
          className="size-6 rounded-md"
        >
          <X className="size-3" />
        </Button>
      </div>
      <label className="mt-3 block text-[9px] font-medium text-muted-foreground">
        Entrada de audio
        <select
          value={selectedAudioInputId}
          onChange={(event) => onSelectAudioInput(event.target.value)}
          disabled={audioInputDevices.length === 0}
          className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-[10px] text-foreground outline-none focus:border-primary/40"
        >
          {audioInputDevices.length === 0 ? (
            <option value="">Micrófono predeterminado</option>
          ) : (
            audioInputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))
          )}
        </select>
      </label>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[9px] text-muted-foreground">
          <span>Nivel detectado</span>
          <span>{Math.round(audioLevel * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-75"
            style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function SourceCard({
  source,
  citationNumber,
  projectId,
  imageUrl,
  onBeforeNavigation,
}: {
  readonly source: ChatSource
  readonly citationNumber: number
  readonly projectId: string
  readonly imageUrl?: string
  readonly onBeforeNavigation: () => void
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
        : FileText

  const navigateToScene = () => {
    if (!source.sceneId) return

    onBeforeNavigation()
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
    if (!timelineRoute) return

    onBeforeNavigation()
    router.push(timelineRoute)
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
      onBeforeNavigation()
      router.push(
        `/projects/${projectId}/worldbuilding?entityId=${source.entityId}`,
      )
      return
    }
    if (source.route) {
      onBeforeNavigation()
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
          {canNavigate && (
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

function ThinkingBubble({
  status,
}: {
  readonly status: string
}) {
  return (
    <div className="mr-3 flex items-start gap-2" aria-label="Analizando la obra">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Feather className="size-3" />
      </div>
      <div className="flex min-h-9 items-center gap-2 rounded-2xl rounded-tl-md bg-muted px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground" aria-live="polite">
          {status}
        </span>
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.min(180, Math.floor(totalSeconds)))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function getAudioSignalMessage(audioLevel: number): string {
  if (audioLevel > 0.05) return "Señal de audio detectada"
  return "Escuchando..."
}
