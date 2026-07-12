import { create } from "zustand"
import type { ProseMirrorJSON } from "@/types/scene"

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error"

type EditorState = {
  /** Capítulo actualmente cargado en el editor (carga perezosa). */
  activeSceneId: string | null
  selectedSceneVersionId: string | null
  currentContent: ProseMirrorJSON | null
  documentReloadToken: number
  /** Estado del autoguardado, reflejado en la UI. */
  saveStatus: SaveStatus
  /** ISO timestamp del último guardado exitoso. */
  lastSavedAt: string | null
  /** Mensaje de error del último guardado fallido. */
  error: string | null

  setActiveScene: (id: string) => void
  setSelectedSceneVersion: (id: string | null) => void
  setCurrentContent: (content: ProseMirrorJSON | null) => void
  refreshEditorDocument: () => void
  setSaveStatus: (status: SaveStatus) => void
  markSaved: (updatedAt: string) => void
  setError: (message: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeSceneId: null,
  selectedSceneVersionId: null,
  currentContent: null,
  documentReloadToken: 0,
  saveStatus: "idle",
  lastSavedAt: null,
  error: null,

  setActiveScene: (id) =>
    set({
      activeSceneId: id,
      selectedSceneVersionId: null,
      currentContent: null,
      saveStatus: "idle",
      error: null,
    }),
  setSelectedSceneVersion: (id) =>
    set({
      selectedSceneVersionId: id,
      currentContent: null,
      saveStatus: "idle",
      error: null,
    }),
  setCurrentContent: (content) => set({ currentContent: content }),
  refreshEditorDocument: () =>
    set((state) => ({
      documentReloadToken: state.documentReloadToken + 1,
      currentContent: null,
    })),
  setSaveStatus: (status) => set({ saveStatus: status }),
  markSaved: (updatedAt) =>
    set({ saveStatus: "saved", lastSavedAt: updatedAt, error: null }),
  setError: (message) => set({ saveStatus: "error", error: message }),
}))
