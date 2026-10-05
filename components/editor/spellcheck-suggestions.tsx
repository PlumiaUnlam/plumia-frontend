"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import type { Transaction } from "@tiptap/pm/state"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { loadSpellchecker } from "@/lib/spellcheck"
import type { SpellcheckLanguage } from "@/types/editor-search"
import { findSpellingWord, replaceSpellingWord, type SpellingWord } from "./spelling-word"

type SpellingResult = { key: string; correct?: boolean; suggestions?: string[]; error?: string }

function SpellcheckStatus({
  result,
  onRetry,
}: Readonly<{
  result: SpellingResult | null
  onRetry: () => void
}>) {
  if (!result) {
    return (
      <span className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        Buscando sugerencias…
      </span>
    )
  }

  if (result.error) {
    return (
      <div className="space-y-2">
        <p>{result.error}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (result.correct) {
    return "El diccionario no detecta una falta en esta palabra."
  }

  if (!result.suggestions?.length) {
    return "No encontramos sugerencias. Podés escribir la corrección."
  }

  return "Elegí una sugerencia para reemplazar la palabra:"
}

export function SpellcheckSuggestions({ editor, language }: Readonly<{ editor: Editor; language: SpellcheckLanguage }>) {
  const replacementId = useId()
  const [target, setTarget] = useState<SpellingWord | null>(null)
  const targetRef = useRef<SpellingWord | null>(null)
  const [replacement, setReplacement] = useState("")
  const [result, setResult] = useState<SpellingResult | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${language}:${target?.word ?? ""}:${attempt}`
  const currentResult = result?.key === requestKey ? result : null

  useEffect(() => {
    const openAt = (position: number, event: Event) => {
      const word = findSpellingWord(editor.state.doc, position)
      if (!word || word.word.length > 64) return
      event.preventDefault()
      event.stopPropagation()
      targetRef.current = word
      setTarget(word)
      setReplacement(word.word)
      setEditError(null)
    }
    const openSuggestions = (event: MouseEvent) => {
      if (!editor.isEditable || editor.isDestroyed) return
      const element = event.target instanceof Element ? event.target : null
      if (element?.closest('[contenteditable="false"]')) return
      const hit = event.clientX || event.clientY
        ? editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        : editor.state.selection.from
      if (hit === undefined) return
      // Leemos la palabra del documento. El menú nativo no expone sus sugerencias a JavaScript.
      openAt(hit, event)
    }
    const openWithKeyboard = (event: KeyboardEvent) => {
      if (!editor.isEditable || editor.isDestroyed) return
      if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
        openAt(editor.state.selection.from, event)
      }
    }
    const mapTarget = ({ transaction }: { transaction: Transaction }) => {
      const current = targetRef.current
      if (!current || !transaction.docChanged) return
      const from = transaction.mapping.mapResult(current.from, 1)
      const to = transaction.mapping.mapResult(current.to, -1)
      targetRef.current = !from.deleted && !to.deleted && from.pos < to.pos && transaction.doc.textBetween(from.pos, to.pos, "", " ") === current.word
        ? { ...current, from: from.pos, to: to.pos }
        : null
    }
    const dom = editor.view.dom
    dom.addEventListener("contextmenu", openSuggestions)
    dom.addEventListener("keydown", openWithKeyboard)
    editor.on("transaction", mapTarget)
    return () => {
      dom.removeEventListener("contextmenu", openSuggestions)
      dom.removeEventListener("keydown", openWithKeyboard)
      editor.off("transaction", mapTarget)
    }
  }, [editor])

  useEffect(() => {
    const preload = () => {
      void loadSpellchecker(language).catch(() => undefined)
    }

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(preload, { timeout: 5000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(preload, 1500)
    return () => window.clearTimeout(timeoutId)
  }, [language])

  useEffect(() => {
    if (!target) return
    let cancelled = false
    loadSpellchecker(language).then((spell) => {
      if (cancelled) return
      const correct = spell.correct(target.word)
      setResult({ key: requestKey, correct, suggestions: correct ? [] : spell.suggest(target.word).slice(0, 8) })
    }).catch(() => {
      if (!cancelled) setResult({ key: requestKey, error: "No se pudo cargar el diccionario. Podés reintentar o escribir la corrección." })
    })
    return () => { cancelled = true }
  }, [language, requestKey, target])

  const close = () => {
    targetRef.current = null
    setTarget(null)
  }
  const apply = (word: string) => {
    const current = targetRef.current
    if (!current || !replaceSpellingWord(editor, current, word)) {
      setEditError("El texto cambió o ya no se puede editar. Cerrá este diálogo y seleccioná la palabra nuevamente.")
      return
    }
    close()
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="w-[min(30rem,calc(100vw-1.5rem))] max-w-none max-h-[80dvh] gap-0 overflow-y-auto border-[#dadce0] bg-white p-0 dark:border-border dark:bg-popover sm:max-w-none"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (!editor.isDestroyed) editor.commands.focus()
        }}>
        <DialogHeader className="border-b border-[#dadce0] px-6 py-5 pr-12 dark:border-border">
          <DialogTitle className="text-[#202124] dark:text-foreground">Sugerencias ortográficas</DialogTitle>
          <DialogDescription className="text-[#5f6368] dark:text-muted-foreground">Revisá «{target?.word}» y elegí una corrección.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div role="status" aria-live="polite" className="text-sm text-[#5f6368] dark:text-muted-foreground">
            <SpellcheckStatus
              result={currentResult}
              onRetry={() => setAttempt((value) => value + 1)}
            />
          </div>
          {!!currentResult?.suggestions?.length && (
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Correcciones sugeridas">
              {currentResult.suggestions.map((word) => <Button key={word} type="button" variant="outline" className="h-auto min-h-9 justify-start whitespace-normal break-all border-[#dadce0] bg-white text-[#3c4043] dark:border-border dark:bg-input/30 dark:text-foreground" onClick={() => apply(word)}>{word}</Button>)}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={replacementId}>Corrección manual</Label>
            <Input id={replacementId} value={replacement} maxLength={100} className="h-9 py-0"
              onChange={(event) => setReplacement(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && replacement.trim()) { event.preventDefault(); apply(replacement) } }} />
          </div>
          {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}
        </div>
        <DialogFooter className="mx-0 mb-0 border-t border-[#dadce0] bg-[#f8fafd] px-6 py-4 dark:border-border dark:bg-muted/50 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close}>Cerrar</Button>
          <Button type="button" disabled={!replacement.trim() || replacement.trim() === target?.word} onClick={() => apply(replacement)}>Reemplazar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
