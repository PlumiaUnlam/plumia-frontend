import { api } from "@/services/api.service"
import type {
  EditorTextStyle,
  SaveEditorTextStyleInput,
} from "@/types/editor-text-style"

type PendingOperation =
  | { type: "create"; style: EditorTextStyle }
  | { type: "update"; style: EditorTextStyle }
  | { type: "delete"; styleId: string }

const cacheKey = (projectId: string) =>
  `plumia:editor-text-styles:${projectId}`
const queueKey = (projectId: string) =>
  `plumia:editor-text-styles:pending:${projectId}`
const endpoint = (projectId: string) =>
  `/projects/${encodeURIComponent(projectId)}/editor-styles`

function readLocalStyles(projectId: string): EditorTextStyle[] | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(cacheKey(projectId))
    return value ? (JSON.parse(value) as EditorTextStyle[]) : null
  } catch {
    return null
  }
}

function writeLocalStyles(projectId: string, styles: EditorTextStyle[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(cacheKey(projectId), JSON.stringify(styles))
  } catch {
    // The server remains the source of truth if local storage is unavailable.
  }
}

function readQueue(projectId: string): PendingOperation[] {
  if (typeof window === "undefined") return []
  try {
    const value = window.localStorage.getItem(queueKey(projectId))
    return value ? (JSON.parse(value) as PendingOperation[]) : []
  } catch {
    return []
  }
}

export function hasPendingEditorTextStyleChanges(projectId: string) {
  return readQueue(projectId).length > 0
}

function writeQueue(projectId: string, queue: PendingOperation[]) {
  if (typeof window === "undefined") return
  try {
    if (queue.length) {
      window.localStorage.setItem(queueKey(projectId), JSON.stringify(queue))
    } else {
      window.localStorage.removeItem(queueKey(projectId))
    }
  } catch {
    // Network errors are still surfaced to the editor if persistence fails.
  }
}

function isConnectionError(error: unknown) {
  return (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (error instanceof TypeError && /fetch|network|load/i.test(error.message))
  )
}

async function sendOperation(
  projectId: string,
  operation: PendingOperation,
): Promise<EditorTextStyle | null> {
  if (operation.type === "create") {
    return api.post<EditorTextStyle>(endpoint(projectId), operation.style)
  }
  if (operation.type === "update") {
    return api.patch<EditorTextStyle>(
      `${endpoint(projectId)}/${operation.style.id}`,
      operation.style,
    )
  }
  await api.delete<void>(`${endpoint(projectId)}/${operation.styleId}`)
  return null
}

async function synchronizeQueue(projectId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return
  const queue = readQueue(projectId)
  for (let index = 0; index < queue.length; index += 1) {
    try {
      await sendOperation(projectId, queue[index])
      writeQueue(projectId, queue.slice(index + 1))
    } catch {
      return
    }
  }
}

export async function getProjectEditorTextStyles(projectId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readLocalStyles(projectId)
    if (cached) return cached
  }
  try {
    await synchronizeQueue(projectId)
    const styles = await api.get<EditorTextStyle[]>(endpoint(projectId))
    writeLocalStyles(projectId, styles)
    return styles
  } catch (error) {
    const cached = readLocalStyles(projectId)
    if (cached) return cached
    throw error
  }
}

function upsertLocalStyle(projectId: string, style: EditorTextStyle) {
  const styles = readLocalStyles(projectId) ?? []
  writeLocalStyles(
    projectId,
    [...styles.filter((item) => item.id !== style.id), style],
  )
}

export async function saveProjectEditorTextStyle(
  projectId: string,
  style: EditorTextStyle,
  isNew: boolean,
): Promise<{ style: EditorTextStyle; pending: boolean }> {
  const operation: PendingOperation = {
    type: isNew ? "create" : "update",
    style,
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    upsertLocalStyle(projectId, style)
    writeQueue(projectId, [...readQueue(projectId), operation])
    return { style, pending: true }
  }

  try {
    const saved = await sendOperation(projectId, operation)
    if (!saved) throw new Error("No se pudo guardar el estilo")
    upsertLocalStyle(projectId, saved)
    return { style: saved, pending: false }
  } catch (error) {
    if (!isConnectionError(error)) throw error
    upsertLocalStyle(projectId, style)
    writeQueue(projectId, [...readQueue(projectId), operation])
    return { style, pending: true }
  }
}

export async function deleteProjectEditorTextStyle(
  projectId: string,
  styleId: string,
): Promise<{ pending: boolean }> {
  const operation: PendingOperation = { type: "delete", styleId }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    writeLocalStyles(
      projectId,
      (readLocalStyles(projectId) ?? []).map((style) =>
        style.id === styleId ? { ...style, isActive: false } : style,
      ),
    )
    writeQueue(projectId, [...readQueue(projectId), operation])
    return { pending: true }
  }

  try {
    await sendOperation(projectId, operation)
    writeLocalStyles(
      projectId,
      (readLocalStyles(projectId) ?? []).map((style) =>
        style.id === styleId ? { ...style, isActive: false } : style,
      ),
    )
    return { pending: false }
  } catch (error) {
    if (!isConnectionError(error)) throw error
    writeLocalStyles(
      projectId,
      (readLocalStyles(projectId) ?? []).map((style) =>
        style.id === styleId ? { ...style, isActive: false } : style,
      ),
    )
    writeQueue(projectId, [...readQueue(projectId), operation])
    return { pending: true }
  }
}
