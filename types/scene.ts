import type { JSONContent } from "@tiptap/react"

/**
 * Documento ProseMirror serializado (lo que devuelve `editor.getJSON()`).
 * Es el formato canónico de persistencia del contenido del capítulo.
 */
export type ProseMirrorJSON = JSONContent

/**
 * Capítulo completo tal como lo entrega/recibe el backend.
 * Unidad de carga y guardado del editor (por ahora la escena es tratada
 * como un capítulo 1:1; migrable a Capítulo más adelante).
 */
export type SceneDocument = {
  id: string
  title: string
  /** Documento completo de la escena en ProseMirror JSON. */
  content: ProseMirrorJSON | null
  /** ISO timestamp del último guardado. */
  updatedAt: string
  /** SHA-256 del texto plano (lo calcula el backend). */
  hash: string
}

/** Respuesta del backend al persistir el contenido de una escena. */
export type SaveSceneResult = {
  updatedAt: string
  hash: string
  /**
   * `false` si el SHA-256 del texto plano no cambió respecto del guardado
   * previo (ej: solo se reformateó). El backend usa esto para NO disparar IA.
   */
  contentChanged: boolean
}

export type SceneVersionSummary = {
  id: string
  sceneId: string
  label: string | null
  wordCount: number
  hash: string | null
  createdAt: string
  updatedAt: string
}

export type SceneVersionDocument = SceneVersionSummary & {
  content: ProseMirrorJSON | null
  createdFromId: string | null
}

export type SaveSceneVersionResult = SceneVersionDocument & {
  contentChanged: boolean
}
