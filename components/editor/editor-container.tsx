"use client"

import { useCallback, useEffect, useState } from "react"

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
import { AnalysisToast } from "./analysis/analysis-toast"

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
  projectId,
}: {
  sceneId: string
  document: SceneDocument | SceneVersionDocument
  chapterTitle: string
  sceneTitle?: string
  selectedVersionId: string | null
  projectId: string
}) {
  const setCurrentContent = useEditorStore((s) => s.setCurrentContent)
  const saveStatus = useEditorStore((s) => s.saveStatus)
  // Contenido vivo del editor; arranca en lo cargado del backend (baseline).
  const [content, setContent] = useState<ProseMirrorJSON | null>(
    document.content,
  )
  const [analysisFeedback, setAnalysisFeedback] = useState<{
    message: string
    tone: "default" | "success"
  } | null>(null)

  const { saveNow } = useAutosave({
    sceneId,
    versionId: selectedVersionId,
    content,
  })

  const handleAnalyzeChanges = useCallback(() => {
    void saveNow().then((outcome) => {
      if (outcome.status === "failed") return

      if (outcome.status === "saved" && outcome.result.contentChanged) {
        setAnalysisFeedback({
          message: "Cambios guardados; el analisis se ejecutara en segundo plano",
          tone: "success",
        })
        return
      }

      setAnalysisFeedback({
        message: "No hay cambios nuevos para analizar",
        tone: "default",
      })
    })
  }, [saveNow])

  const handleContentChange = useCallback((nextContent: ProseMirrorJSON) => {
    setContent(nextContent)
  }, [])

  const dismissAnalysisFeedback = useCallback(() => {
    setAnalysisFeedback(null)
  }, [])

  useEffect(() => {
    setCurrentContent(content)
  }, [content, setCurrentContent])

  return (
    <>
      <AnalysisToast
        feedback={analysisFeedback}
        onDismiss={dismissAnalysisFeedback}
      />
      <RichTextEditor
        title={chapterTitle}
        subtitle={sceneTitle}
        sceneId={sceneId}
        projectId={projectId}
        content={content}
        versionLabel={
          selectedVersionId
            ? "label" in document && document.label
              ? document.label
              : "Version sin titulo"
            : "Borrador principal"
        }
        onChange={handleContentChange}
        onAnalyzeChanges={
          selectedVersionId === null ? handleAnalyzeChanges : undefined
        }
        isAnalysisSaving={saveStatus === "saving"}
      />
    </>
  )
}

export function EditorContainer({
  sceneId,
  chapterTitle,
  sceneTitle,
  projectId,
}: {
  sceneId: string
  chapterTitle: string
  sceneTitle?: string
  projectId: string
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
      projectId={projectId}
    />
  )
}
