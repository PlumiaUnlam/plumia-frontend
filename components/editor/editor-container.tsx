"use client"

import { useEffect, useState } from "react"

import { getChapter } from "@/services/chapter.service"
import { useEditorStore } from "@/stores/editor.store"
import type { ChapterDocument, ProseMirrorJSON } from "@/types/chapter"
import { useAutosave } from "@/hooks/use-autosave"
import { RichTextEditor } from "./RichTextEditor"

/**
 * Orquesta la carga perezosa del capítulo activo y el autoguardado.
 * Monta una instancia fresca del editor por capítulo (vía `key={chapterId}`).
 */
function ChapterEditor({ chapter }: { chapter: ChapterDocument }) {
  // Contenido vivo del editor; arranca en lo cargado del backend (baseline).
  const [content, setContent] = useState<ProseMirrorJSON | null>(chapter.content)

  useAutosave({ chapterId: chapter.id, content })

  return (
    <RichTextEditor
      title={chapter.title}
      content={chapter.content}
      onChange={setContent}
    />
  )
}

export function EditorContainer({ chapterId }: { chapterId: string }) {
  const setActiveChapter = useEditorStore((s) => s.setActiveChapter)
  const [chapter, setChapter] = useState<ChapterDocument | null>(null)

  useEffect(() => {
    setActiveChapter(chapterId)
  }, [chapterId, setActiveChapter])

  useEffect(() => {
    let cancelled = false
    getChapter(chapterId).then((doc) => {
      if (!cancelled) setChapter(doc)
    })
    return () => {
      cancelled = true
    }
  }, [chapterId])

  // Mientras carga el nuevo capítulo seguimos mostrando "cargando" (el `chapter`
  // en estado puede ser el anterior hasta que resuelve el fetch).
  const loaded = chapter?.id === chapterId

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando capítulo…
      </div>
    )
  }

  return <ChapterEditor key={chapter.id} chapter={chapter} />
}
