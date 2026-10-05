"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import type { Transaction } from "@tiptap/pm/state"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { addWordToSpellcheckDictionary, loadSpellchecker } from "@/lib/spellcheck"
import type { SpellcheckLanguage } from "@/types/editor-search"
import {
  findMisspelledRanges,
  findMisspelledRangesInBlock,
  type MisspelledRange,
  replaceAllSpellcheckDecorations,
  replaceSpellcheckDecorationsInRange,
} from "./spellcheck-decorations"
import { findSpellingWord, replaceSpellingWord, type SpellingWord } from "./spelling-word"

type SpellingResult = { key: string; correct?: boolean; suggestions?: string[]; error?: string }
type IgnoredOccurrence = SpellingWord & { language: SpellcheckLanguage }

function spellcheckWordKey(language: SpellcheckLanguage, word: string) {
  return `${language}:${word.toLocaleLowerCase(language)}`
}

function filterIgnoredRanges(
  ranges: MisspelledRange[],
  language: SpellcheckLanguage,
  ignoredWords: ReadonlySet<string>,
  ignoredOccurrences: readonly IgnoredOccurrence[],
) {
  return ranges.filter(({ from, to, word }) =>
    !ignoredWords.has(spellcheckWordKey(language, word)) &&
    !ignoredOccurrences.some((ignored) =>
      ignored.language === language && ignored.from === from && ignored.to === to &&
      ignored.word.toLocaleLowerCase(language) === word.toLocaleLowerCase(language),
    ),
  )
}

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
  const ignoredWordsRef = useRef(new Set<string>())
  const ignoredOccurrencesRef = useRef<IgnoredOccurrence[]>([])
  const spellcheckerRef = useRef<Awaited<ReturnType<typeof loadSpellchecker>> | null>(null)
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
      if (!transaction.docChanged) return
      const current = targetRef.current
      if (current) {
        const from = transaction.mapping.mapResult(current.from, 1)
        const to = transaction.mapping.mapResult(current.to, -1)
        targetRef.current = !from.deleted && !to.deleted && from.pos < to.pos && transaction.doc.textBetween(from.pos, to.pos, "", " ") === current.word
          ? { ...current, from: from.pos, to: to.pos }
          : null
      }
      ignoredOccurrencesRef.current = ignoredOccurrencesRef.current.flatMap((ignored) => {
        const from = transaction.mapping.mapResult(ignored.from, 1)
        const to = transaction.mapping.mapResult(ignored.to, -1)
        if (from.deleted || to.deleted || from.pos >= to.pos) return []
        return transaction.doc.textBetween(from.pos, to.pos, "", " ") === ignored.word
          ? [{ ...ignored, from: from.pos, to: to.pos }]
          : []
      })
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
    let cancelled = false
    let spellchecker: Awaited<ReturnType<typeof loadSpellchecker>> | null = null
    let timeoutId: number | null = null
    const pendingBlockPositions = new Set<number>()
    replaceAllSpellcheckDecorations(editor, [])

    const updateChangedBlocks = () => {
      timeoutId = null
      if (cancelled || editor.isDestroyed || !spellchecker) return
      const document = editor.state.doc
      for (const blockPosition of pendingBlockPositions) {
        const probe = Math.min(blockPosition + 1, document.content.size)
        const position = document.resolve(probe)
        if (!position.parent.isTextblock) continue
        const currentBlockPosition = position.before(position.depth)
        const from = position.start()
        const to = position.end()
        const ranges = filterIgnoredRanges(
          findMisspelledRangesInBlock(position.parent, currentBlockPosition, spellchecker),
          language,
          ignoredWordsRef.current,
          ignoredOccurrencesRef.current,
        )
        replaceSpellcheckDecorationsInRange(editor, from, to, ranges)
      }
      pendingBlockPositions.clear()
    }

    const onTransaction = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return
      const mappedBlockPositions = [...pendingBlockPositions].map((position) =>
        transaction.mapping.map(position, -1),
      )
      pendingBlockPositions.clear()
      mappedBlockPositions.forEach((position) => pendingBlockPositions.add(position))

      const document = transaction.doc
      const enqueueChangedRange = (from: number, to: number) => {
        // Include one position on either side so textblocks touching either edge
        // are revisited, including when a step maps a replaced range to a point.
        const start = Math.max(0, Math.min(from, to) - 1)
        const end = Math.min(document.content.size, Math.max(from, to) + 1)
        document.nodesBetween(start, end, (node, position) => {
          if (!node.isTextblock) return true
          pendingBlockPositions.add(position)
          return false
        })
      }

      const mapping = transaction.mapping
      for (let mapIndex = mapping.from; mapIndex < mapping.to; mapIndex += 1) {
        const stepMap = mapping.maps[mapIndex]
        const remainingMapping = mapping.slice(mapIndex + 1, mapping.to)
        stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
          enqueueChangedRange(
            remainingMapping.map(newStart, -1),
            remainingMapping.map(newEnd, 1),
          )
        })
      }

      const selection = editor.state.selection.$from
      if (selection.parent.isTextblock) {
        pendingBlockPositions.add(selection.before(selection.depth))
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      // Revisamos el párrafo activo cuando termina la escritura para no recalcularlo por cada tecla.
      timeoutId = window.setTimeout(updateChangedBlocks, 180)
    }

    editor.on("transaction", onTransaction)
    void loadSpellchecker(language).then((spell) => {
      if (cancelled || editor.isDestroyed) return
      spellchecker = spell
      spellcheckerRef.current = spell
      replaceAllSpellcheckDecorations(
        editor,
        filterIgnoredRanges(
          findMisspelledRanges(editor.state.doc, spell),
          language,
          ignoredWordsRef.current,
          ignoredOccurrencesRef.current,
        ),
      )
    }).catch(() => undefined)

    return () => {
      cancelled = true
      if (spellcheckerRef.current === spellchecker) spellcheckerRef.current = null
      editor.off("transaction", onTransaction)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [editor, language])

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
  const refreshDocumentSpellcheck = (spell = spellcheckerRef.current) => {
    if (!spell || editor.isDestroyed) return
    replaceAllSpellcheckDecorations(
      editor,
      filterIgnoredRanges(
        findMisspelledRanges(editor.state.doc, spell),
        language,
        ignoredWordsRef.current,
        ignoredOccurrencesRef.current,
      ),
    )
  }
  const ignoreOccurrence = () => {
    const current = targetRef.current
    if (!current) return
    ignoredOccurrencesRef.current.push({ ...current, language })
    refreshDocumentSpellcheck()
    close()
  }
  const ignoreAllOccurrences = () => {
    const current = targetRef.current
    if (!current) return
    ignoredWordsRef.current.add(spellcheckWordKey(language, current.word))
    refreshDocumentSpellcheck()
    close()
  }
  const addToDictionary = () => {
    const current = targetRef.current
    if (!current) return
    void addWordToSpellcheckDictionary(language, current.word).then((spell) => {
      spellcheckerRef.current = spell
      refreshDocumentSpellcheck(spell)
      close()
    }).catch(() => {
      setEditError("No se pudo agregar la palabra al diccionario.")
    })
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
          <div className="grid grid-cols-1 gap-2 border-t border-[#dadce0] pt-3 dark:border-border sm:grid-cols-3">
            <Button type="button" variant="outline" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-xs" onClick={ignoreOccurrence}>
              Ignorar esta vez
            </Button>
            <Button type="button" variant="outline" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-xs" onClick={ignoreAllOccurrences}>
              Ignorar todas en esta escena
            </Button>
            <Button type="button" variant="outline" className="h-auto min-h-9 whitespace-normal px-2 py-2 text-xs" onClick={addToDictionary}>
              Agregar al diccionario
            </Button>
          </div>
          <p className="text-xs text-[#5f6368] dark:text-muted-foreground">
            El diccionario personal se guarda en este navegador. Ignorar todas solo afecta esta escena abierta.
          </p>
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
