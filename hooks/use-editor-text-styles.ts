"use client"

import useSWR from "swr"

import {
  deleteProjectEditorTextStyle,
  getProjectEditorTextStyles,
  saveProjectEditorTextStyle,
} from "@/services/editor-text-style.service"
import type {
  EditorTextStyle,
  SaveEditorTextStyleInput,
} from "@/types/editor-text-style"

const stylesKey = (projectId: string) =>
  `/projects/${encodeURIComponent(projectId)}/editor-styles`

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16)
    return (token === "x" ? random : (random & 0x3) | 0x8).toString(16)
  })
}

export function useEditorTextStyles(projectId: string) {
  const key = projectId ? stylesKey(projectId) : null
  const { data, error, isLoading, mutate } = useSWR<EditorTextStyle[]>(
    key,
    () => getProjectEditorTextStyles(projectId),
  )
  const styles = data ?? []

  const saveStyle = async (
    input: SaveEditorTextStyleInput,
    existing?: EditorTextStyle,
  ) => {
    const now = new Date().toISOString()
    const candidate: EditorTextStyle = {
      id: existing?.id ?? input.id ?? makeId(),
      projectId,
      name: input.name.trim(),
      kind: input.kind,
      definition: input.definition,
      isActive: existing?.isActive ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    const previous = styles
    await mutate(
      [...previous.filter((style) => style.id !== candidate.id), candidate],
      { revalidate: false },
    )

    try {
      const result = await saveProjectEditorTextStyle(
        projectId,
        candidate,
        !existing,
      )
      await mutate(
        (current = []) => [
          ...current.filter((style) => style.id !== result.style.id),
          result.style,
        ],
        { revalidate: false },
      )
      return result
    } catch (saveError) {
      await mutate(previous, { revalidate: false })
      throw saveError
    }
  }

  const removeStyle = async (styleId: string) => {
    const previous = styles
    await mutate(
      previous.map((style) =>
        style.id === styleId ? { ...style, isActive: false } : style,
      ),
      { revalidate: false },
    )
    try {
      const result = await deleteProjectEditorTextStyle(projectId, styleId)
      return result
    } catch (removeError) {
      await mutate(previous, { revalidate: false })
      throw removeError
    }
  }

  return { styles, error, isLoading, saveStyle, removeStyle, refresh: mutate }
}
