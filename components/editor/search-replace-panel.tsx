"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Replace, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { getScene, saveScene } from "@/services/scene.service"
import { useEditorStore } from "@/stores/editor.store"
import type { EditorSectionOption } from "./editor-types"
import type { ProseMirrorJSON } from "@/types/scene"
import type {
  EditorSearchMatch,
  SpellcheckLanguage,
} from "@/types/editor-search"
import {
  findEditorSearchMatches,
  getSearchResultSummary,
  groupMatchesByScene,
  replaceEditorSearchMatches,
} from "@/lib/editor-search"

type ReplaceScope = "one" | "scene" | "all"

type PendingReplace = {
  scope: Exclude<ReplaceScope, "one">
  matches: EditorSearchMatch[]
}

type Feedback = {
  tone: "success" | "error"
  message: string
}

type SearchReplacePanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: EditorSectionOption[]
  activeSceneId: string | null
  currentContent: ProseMirrorJSON | null
  selectedSceneVersionId: string | null
  onNavigateToMatch: (match: EditorSearchMatch) => Promise<void>
  onPrepareWrite: () => Promise<void>
  onScenesUpdated: (sceneIds: string[]) => Promise<void>
}

const languageOptions: ReadonlyArray<{
  value: SpellcheckLanguage
  label: string
}> = [
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "en-US", label: "English (United States)" },
]

export function SearchReplacePanel({
  open,
  onOpenChange,
  sections,
  activeSceneId,
  currentContent,
  selectedSceneVersionId,
  onNavigateToMatch,
  onPrepareWrite,
  onScenesUpdated,
}: SearchReplacePanelProps) {
  const [query, setQuery] = useState("")
  const [replacement, setReplacement] = useState("")
  const [documents, setDocuments] = useState<
    Record<string, ProseMirrorJSON | null>
  >({})
  const [isReplacing, setIsReplacing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(
    null,
  )
  const sceneIdsKey = sections.map((section) => section.id).join(",")
  const loadKey = `${reloadToken}:${sceneIdsKey}`
  const [completedLoadKey, setCompletedLoadKey] = useState<string | null>(null)
  const isLoading = open && completedLoadKey !== loadKey
  const spellcheckLanguage = useEditorStore(
    (state) => state.spellcheckLanguage,
  )
  const setSpellcheckLanguage = useEditorStore(
    (state) => state.setSpellcheckLanguage,
  )
  const [languageLoaded, setLanguageLoaded] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const controller = new AbortController()

    void Promise.all(
      sections.map(async (section) => {
        const scene = await getScene(section.id, {
          signal: controller.signal,
        })
        return [section.id, scene.content] as const
      }),
    )
      .then((entries) => {
        if (!cancelled) {
          setDocuments(Object.fromEntries(entries))
          setLoadError(null)
          setCompletedLoadKey(loadKey)
        }
      })
      .catch((error) => {
        if (!cancelled && !isAbortError(error)) {
          console.error("Error loading scenes for search:", error)
          setLoadError("No se pudieron cargar todas las escenas.")
          setCompletedLoadKey(loadKey)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [loadKey, open, reloadToken, sections])

  useEffect(() => {
    try {
      const storedLanguage = window.localStorage.getItem(
        "plumia:spellcheck-language",
      )
      if (storedLanguage === "es-AR" || storedLanguage === "en-US") {
        setSpellcheckLanguage(storedLanguage)
      }
    } finally {
      setLanguageLoaded(true)
    }
  }, [setSpellcheckLanguage])

  useEffect(() => {
    if (!languageLoaded) return
    window.localStorage.setItem(
      "plumia:spellcheck-language",
      spellcheckLanguage,
    )
  }, [languageLoaded, spellcheckLanguage])

  const searchableDocuments = useMemo(() => {
    if (
      activeSceneId &&
      selectedSceneVersionId === null &&
      currentContent !== null
    ) {
      return {
        ...documents,
        [activeSceneId]: currentContent,
      }
    }

    return documents
  }, [activeSceneId, currentContent, documents, selectedSceneVersionId])

  const matches = useMemo(
    () =>
      sections.flatMap((section) => {
        const content = searchableDocuments[section.id]
        if (content === undefined) return []

        return findEditorSearchMatches({
          sceneId: section.id,
          section,
          content,
          query,
        })
      }),
    [query, searchableDocuments, sections],
  )
  const matchesByScene = useMemo(() => groupMatchesByScene(matches), [matches])
  const activeSceneMatches = activeSceneId
    ? matchesByScene.get(activeSceneId) ?? []
    : []
  const canReplace = selectedSceneVersionId === null && !isReplacing

  const handleRefresh = () => {
    setFeedback(null)
    setReloadToken((current) => current + 1)
  }

  const handleReplace = async (replaceMatches: EditorSearchMatch[]) => {
    if (!canReplace || replaceMatches.length === 0) return

    setIsReplacing(true)
    setFeedback(null)

    try {
      await onPrepareWrite()

      const byScene = groupMatchesByScene(replaceMatches)
      const results = await Promise.all(
        [...byScene.entries()].map(async ([sceneId, sceneMatches]) => {
          const content = searchableDocuments[sceneId]
          if (content === undefined || content === null) {
            return {
              sceneId,
              content: null,
              error: new Error("La escena no tiene contenido editable."),
            }
          }

          const nextContent = replaceEditorSearchMatches(
            content,
            sceneMatches,
            replacement,
          )
          if (!nextContent) {
            return {
              sceneId,
              content: null,
              error: new Error("No se pudo preparar el contenido."),
            }
          }

          try {
            await saveScene(sceneId, nextContent)
            return { sceneId, content: nextContent, error: null }
          } catch (error) {
            return {
              sceneId,
              content: null,
              error: error instanceof Error ? error : new Error("Error de guardado"),
            }
          }
        }),
      )

      const saved = results.filter(
        (result): result is { sceneId: string; content: ProseMirrorJSON; error: null } =>
          result.error === null && result.content !== null,
      )
      const failed = results.filter((result) => result.error !== null)

      if (saved.length > 0) {
        setDocuments((current) => {
          const next = { ...current }
          for (const result of saved) next[result.sceneId] = result.content
          return next
        })
        await onScenesUpdated(saved.map((result) => result.sceneId))
      }

      if (failed.length > 0) {
        const failedSceneTitles = failed.map(
          (result) =>
            sections.find((section) => section.id === result.sceneId)?.title ??
            "Escena sin título",
        )
        setFeedback({
          tone: "error",
          message: `Se guardaron ${saved.length} escenas, pero fallaron ${failed.length}: ${failedSceneTitles.join(", ")}. Podés reintentar las pendientes.`,
        })
      } else {
        setFeedback({
          tone: "success",
          message: `Se reemplazaron ${replaceMatches.length} ocurrencias correctamente.`,
        })
      }

      setPendingReplace(null)
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron preparar los cambios.",
      })
    } finally {
      setIsReplacing(false)
    }
  }

  const requestReplace = (scope: Exclude<ReplaceScope, "one">) => {
    const selectedMatches =
      scope === "scene" ? activeSceneMatches : matches
    if (selectedMatches.length === 0) return
    setPendingReplace({ scope, matches: selectedMatches })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 sm:max-w-[430px]"
        >
          <SheetHeader className="border-b px-4 py-3 pr-12">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Buscar y reemplazar
            </SheetTitle>
            <SheetDescription className="text-xs">
              Busca en el contenido de todas las escenas del proyecto.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 p-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="editor-search-query"
                  className="text-xs font-medium text-foreground"
                >
                  Buscar
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="editor-search-query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Texto a buscar"
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Coincidencia literal, sin distinguir mayúsculas.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="editor-search-replacement"
                  className="text-xs font-medium text-foreground"
                >
                  Reemplazar por
                </label>
                <Input
                  id="editor-search-replacement"
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                  placeholder="Texto nuevo"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="editor-spellcheck-language"
                  className="text-xs font-medium text-foreground"
                >
                  Idioma del corrector
                </label>
                <select
                  id="editor-spellcheck-language"
                  value={spellcheckLanguage}
                  onChange={(event) =>
                    setSpellcheckLanguage(event.target.value as SpellcheckLanguage)
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    !canReplace || matches.length === 0 || isLoading
                  }
                  onClick={() => requestReplace("all")}
                >
                  <Replace className="mr-1.5 h-3.5 w-3.5" />
                  Reemplazar todo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    !canReplace || activeSceneMatches.length === 0 || isLoading
                  }
                  onClick={() => requestReplace("scene")}
                >
                  En escena activa
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Actualizar escenas"
                  aria-label="Actualizar escenas"
                  disabled={isLoading || isReplacing}
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {selectedSceneVersionId !== null && (
                <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  El reemplazo está deshabilitado mientras visualizás una versión histórica.
                </p>
              )}

              {feedback && (
                <p
                  role="status"
                  className={`rounded-md border px-3 py-2 text-xs ${
                    feedback.tone === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-emerald-300/60 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {feedback.message}
                </p>
              )}

              {loadError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {loadError}
                </p>
              )}

              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-semibold text-foreground">
                  Ocurrencias
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {isLoading ? "Cargando…" : getSearchResultSummary(matches)}
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando escenas…
                </div>
              ) : query.trim() && matches.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No se encontraron coincidencias.
                </p>
              ) : !query.trim() ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Escribí un texto para buscar en el manuscrito.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-md border border-border bg-card p-2"
                    >
                      <button
                        type="button"
                        className="w-full text-left hover:text-primary"
                        onClick={() => void onNavigateToMatch(match)}
                      >
                        <span className="block truncate text-xs font-semibold">
                          {match.sceneTitle}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {match.bookTitle} · {match.chapterTitle} · ocurrencia #{match.occurrence + 1}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-foreground">
                          {match.context}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 px-2 text-[11px]"
                        disabled={!canReplace}
                        onClick={() => void handleReplace([match])}
                      >
                        Reemplazar esta
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={pendingReplace !== null}
        onOpenChange={(dialogOpen) => {
          if (!dialogOpen && !isReplacing) setPendingReplace(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar reemplazo</DialogTitle>
            <DialogDescription>
              Se reemplazarán {pendingReplace?.matches.length ?? 0} ocurrencias
              en {pendingReplace ? new Set(pendingReplace.matches.map((match) => match.sceneId)).size : 0} escenas.
              Esta acción modificará los borradores actuales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isReplacing}
              onClick={() => setPendingReplace(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isReplacing || pendingReplace === null}
              onClick={() =>
                pendingReplace && void handleReplace(pendingReplace.matches)
              }
            >
              {isReplacing ? "Guardando…" : "Confirmar reemplazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}
