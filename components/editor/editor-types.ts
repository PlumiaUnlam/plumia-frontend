import type { Editor } from "@tiptap/react"

export type EditorPaneId = "primary" | "secondary"

export type EditorSectionOption = {
  id: string
  title: string
  chapterTitle: string
  bookTitle: string
}

export type EditorToolbarActions = {
  editor: Editor
  onInsertImage: () => void
  isUploadingImage: boolean
  onAnalyzeChanges?: () => void
  isAnalysisSaving: boolean
  saveNow: () => Promise<unknown>
}
