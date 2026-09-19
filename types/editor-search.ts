import type { ProseMirrorJSON } from "@/types/scene"

export type SpellcheckLanguage = "es-AR" | "en-US"

export type EditorSearchMatch = {
  id: string
  sceneId: string
  sceneTitle: string
  chapterTitle: string
  bookTitle: string
  occurrence: number
  context: string
  matchedText: string
  nodePath: number[]
  offset: number
}

export type EditorSearchDocument = {
  sceneId: string
  content: ProseMirrorJSON | null
}

