import { create } from "zustand"

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error"

type EditorState = {
  /** Capítulo actualmente cargado en el editor (carga perezosa). */
  activeChapterId: string | null
  /** Estado del autoguardado, reflejado en la UI. */
  saveStatus: SaveStatus
  /** ISO timestamp del último guardado exitoso. */
  lastSavedAt: string | null
  /** Mensaje de error del último guardado fallido. */
  error: string | null

  setActiveChapter: (id: string) => void
  setSaveStatus: (status: SaveStatus) => void
  markSaved: (updatedAt: string) => void
  setError: (message: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeChapterId: null,
  saveStatus: "idle",
  lastSavedAt: null,
  error: null,

  setActiveChapter: (id) =>
    set({ activeChapterId: id, saveStatus: "idle", error: null }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  markSaved: (updatedAt) =>
    set({ saveStatus: "saved", lastSavedAt: updatedAt, error: null }),
  setError: (message) => set({ saveStatus: "error", error: message }),
}))
