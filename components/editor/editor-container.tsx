"use client"

import { useEffect, useState } from "react"

import {
  getScene,
  resolveSceneContentImages,
  getSceneVersion,
} from "@/services/scene.service"
import { useEditorStore } from "@/stores/editor.store"
import type {
  SceneDocument,
  SceneVersionDocument,
  ProseMirrorJSON,
} from "@/types/scene"
import { useAutosave } from "@/hooks/use-autosave"
import { RichTextEditor } from "./RichTextEditor"

/**
 * Orquesta la carga perezosa del capítulo activo y el autoguardado.
 * Monta una instancia fresca del editor por escena (vía `key={sceneId}`).
 */
function SceneEditor({
  sceneId,
  document,
  chapterTitle,
  sceneTitle,
  selectedVersionId,
}: {
  sceneId: string
  document: SceneDocument | SceneVersionDocument
  chapterTitle: string
  sceneTitle?: string
  selectedVersionId: string | null
}) {
  const setCurrentContent = useEditorStore((s) => s.setCurrentContent)
  // Contenido vivo del editor; arranca en lo cargado del backend (baseline).
  const [content, setContent] = useState<ProseMirrorJSON | null>(
    document.content,
  )

  useAutosave({ sceneId, versionId: selectedVersionId, content })

  useEffect(() => {
    setCurrentContent(content)
  }, [content, setCurrentContent])

  return (
    <RichTextEditor
      title={chapterTitle}
      subtitle={sceneTitle}
      sceneId={sceneId}
      content={content}
      versionLabel={
        selectedVersionId
          ? "label" in document && document.label
            ? document.label
            : "Version sin titulo"
          : "Borrador principal"
      }
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
  const selectedVersionId = useEditorStore((s) => s.selectedSceneVersionId)
  const documentReloadToken = useEditorStore((s) => s.documentReloadToken)
  const [document, setDocument] = useState<
    SceneDocument | SceneVersionDocument | null
  >(null)

  useEffect(() => {
    setActiveScene(sceneId)
  }, [sceneId, setActiveScene])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setDocument(null)
      const request = selectedVersionId
        ? getSceneVersion(sceneId, selectedVersionId)
        : getScene(sceneId)

      const doc = await request
      const resolvedContent = await resolveSceneContentImages(doc.content)

      if (!cancelled) {
        setDocument({
          ...doc,
          content: resolvedContent,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sceneId, selectedVersionId, documentReloadToken])

  const loaded =
    document &&
    (selectedVersionId
      ? document.id === selectedVersionId
      : document.id === sceneId)

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Cargando escena…
      </div>
    )
  }

  return (
    <SceneEditor
      key={`${sceneId}:${selectedVersionId ?? "main"}`}
      sceneId={sceneId}
      document={document}
      chapterTitle={chapterTitle}
      sceneTitle={sceneTitle}
      selectedVersionId={selectedVersionId}
    />
  )
}
