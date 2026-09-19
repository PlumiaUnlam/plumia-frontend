import { create } from "zustand"
import type { ProseMirrorJSON } from "@/types/scene"
import type { SpellcheckLanguage } from "@/types/editor-search"
import type { EditorPaneId } from "@/components/editor/editor-types"

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error"

export type EditorCitationFocus = {
  sceneId: string
  textQuote: string
}

export type EditorSearchFocus = {
  sceneId: string
  query: string
  occurrence: number
}

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
  saveStatusByPane: Record<EditorPaneId, SaveStatus>
  lastSavedAtByPane: Record<EditorPaneId, string | null>
  errorByPane: Record<EditorPaneId, string | null>
  citationFocus: EditorCitationFocus | null
  searchFocus: EditorSearchFocus | null
  spellcheckLanguage: SpellcheckLanguage

  setActiveScene: (id: string) => void
  setSelectedSceneVersion: (id: string | null) => void
  setCurrentContent: (content: ProseMirrorJSON | null) => void
  refreshEditorDocument: () => void
  setSaveStatus: (status: SaveStatus) => void
  markSaved: (updatedAt: string) => void
  setError: (message: string) => void
  setPaneSaveStatus: (paneId: EditorPaneId, status: SaveStatus) => void
  markPaneSaved: (paneId: EditorPaneId, updatedAt: string) => void
  setPaneError: (paneId: EditorPaneId, message: string) => void
  focusCitation: (focus: EditorCitationFocus) => void
  clearCitationFocus: () => void
  focusSearch: (focus: EditorSearchFocus) => void
  clearSearchFocus: () => void
  setSpellcheckLanguage: (language: SpellcheckLanguage) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeSceneId: null,
  selectedSceneVersionId: null,
  currentContent: null,
  documentReloadToken: 0,
  saveStatus: "idle",
  lastSavedAt: null,
  error: null,
  saveStatusByPane: { primary: "idle", secondary: "idle" },
  lastSavedAtByPane: { primary: null, secondary: null },
  errorByPane: { primary: null, secondary: null },
  citationFocus: null,
  searchFocus: null,
  spellcheckLanguage: "es-AR",

  setActiveScene: (id) =>
    set((state) => ({
      activeSceneId: id,
      selectedSceneVersionId: null,
      currentContent: null,
      saveStatus: "idle",
      error: null,
      saveStatusByPane: { ...state.saveStatusByPane, primary: "idle" },
      errorByPane: { ...state.errorByPane, primary: null },
      citationFocus:
        state.citationFocus?.sceneId === id ? state.citationFocus : null,
    })),
  setSelectedSceneVersion: (id) =>
    set((state) => ({
      selectedSceneVersionId: id,
      currentContent: null,
      saveStatus: "idle",
      error: null,
      saveStatusByPane: { ...state.saveStatusByPane, primary: "idle" },
      errorByPane: { ...state.errorByPane, primary: null },
    })),
  setCurrentContent: (content) => set({ currentContent: content }),
  refreshEditorDocument: () =>
    set((state) => ({
      documentReloadToken: state.documentReloadToken + 1,
      currentContent: null,
    })),
  setSaveStatus: (status) =>
    set((state) => ({
      saveStatus: status,
      saveStatusByPane: { ...state.saveStatusByPane, primary: status },
    })),
  markSaved: (updatedAt) =>
    set((state) => ({
      saveStatus: "saved",
      lastSavedAt: updatedAt,
      error: null,
      saveStatusByPane: { ...state.saveStatusByPane, primary: "saved" },
      lastSavedAtByPane: { ...state.lastSavedAtByPane, primary: updatedAt },
      errorByPane: { ...state.errorByPane, primary: null },
    })),
  setError: (message) =>
    set((state) => ({
      saveStatus: "error",
      error: message,
      saveStatusByPane: { ...state.saveStatusByPane, primary: "error" },
      errorByPane: { ...state.errorByPane, primary: message },
    })),
  setPaneSaveStatus: (paneId, status) =>
    set((state) => ({
      saveStatusByPane: { ...state.saveStatusByPane, [paneId]: status },
      ...(paneId === "primary" ? { saveStatus: status } : {}),
    })),
  markPaneSaved: (paneId, updatedAt) =>
    set((state) => ({
      saveStatusByPane: { ...state.saveStatusByPane, [paneId]: "saved" },
      lastSavedAtByPane: {
        ...state.lastSavedAtByPane,
        [paneId]: updatedAt,
      },
      errorByPane: { ...state.errorByPane, [paneId]: null },
      ...(paneId === "primary"
        ? { saveStatus: "saved", lastSavedAt: updatedAt, error: null }
        : {}),
    })),
  setPaneError: (paneId, message) =>
    set((state) => ({
      saveStatusByPane: { ...state.saveStatusByPane, [paneId]: "error" },
      errorByPane: { ...state.errorByPane, [paneId]: message },
      ...(paneId === "primary"
        ? { saveStatus: "error", error: message }
        : {}),
    })),
  focusCitation: (citationFocus) => set({ citationFocus }),
  clearCitationFocus: () => set({ citationFocus: null }),
  focusSearch: (searchFocus) => set({ searchFocus }),
  clearSearchFocus: () => set({ searchFocus: null }),
  setSpellcheckLanguage: (spellcheckLanguage) => set({ spellcheckLanguage }),
}))
