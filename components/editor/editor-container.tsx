"use client"

import { useEffect, useState } from "react"

import { getScene } from "@/services/scene.service"
import { useEditorStore } from "@/stores/editor.store"
import type { SceneDocument, ProseMirrorJSON } from "@/types/scene"
import { useAutosave } from "@/hooks/use-autosave"
import { RichTextEditor } from "./RichTextEditor"

/**
 * Orquesta la carga perezosa del capítulo activo y el autoguardado.
 * Monta una instancia fresca del editor por escena (vía `key={sceneId}`).
 */
function SceneEditor({
  scene,
  chapterTitle,
  sceneTitle,
}: {
  scene: SceneDocument
  chapterTitle: string
  sceneTitle?: string
}) {
  // Contenido vivo del editor; arranca en lo cargado del backend (baseline).
  const [content, setContent] = useState<ProseMirrorJSON | null>(scene.content)

  useAutosave({ sceneId: scene.id, content })

  return (
    <RichTextEditor
      title={chapterTitle}
      subtitle={sceneTitle}
      sceneId={scene.id}
      content={content}
      onChange={setContent}
    />
  )
}

export function EditorContainer({
  sceneId,
  chapterTitle,
  sceneTitle,
}: {
  sceneId: string
  chapterTitle: string
  sceneTitle?: string
}) {
  const setActiveScene = useEditorStore((s) => s.setActiveScene)
  const [scene, setScene] = useState<SceneDocument | null>(null)

  useEffect(() => {
    setActiveScene(sceneId)
  }, [sceneId, setActiveScene])

  useEffect(() => {
    let cancelled = false
    getScene(sceneId).then((doc) => {
      if (!cancelled) setScene(doc)
    })
    return () => {
      cancelled = true
    }
  }, [sceneId])

  const loaded = scene?.id === sceneId

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando escena…
      </div>
    )
  }

  return (
    <SceneEditor
      key={scene.id}
      scene={scene}
      chapterTitle={chapterTitle}
      sceneTitle={sceneTitle}
    />
  )
}
