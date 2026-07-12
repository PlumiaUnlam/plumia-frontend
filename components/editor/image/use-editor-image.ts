"use client"

import { useCallback, useRef, useState, type ChangeEvent } from "react"
import type { Editor } from "@tiptap/react"
import type { EditorView } from "@tiptap/pm/view"

import { uploadSceneImage } from "@/services/upload.service"
import {
  getImageFileFromClipboard,
  validateEditorImageFile,
} from "./image.utils"

type UseEditorImageOptions = {
  sceneId: string
}

export function useEditorImage({ sceneId }: UseEditorImageOptions) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const insertImage = useCallback(
    async (file: File) => {
      const validationError = validateEditorImageFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      const currentEditor = editorRef.current
      if (!currentEditor) return

      setIsUploading(true)
      setError(null)

      try {
        const { storageKey, url } = await uploadSceneImage(sceneId, file)

        currentEditor
          .chain()
          .focus()
          .setImage({
            src: url,
            alt: file.name,
            storageKey,
            width: null,
          } as never)
          .run()
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "No se pudo subir la imagen.",
        )
      } finally {
        setIsUploading(false)
      }
    },
    [sceneId],
  )

  const registerFileInput = useCallback((node: HTMLInputElement | null) => {
    fileInputRef.current = node
  }, [])

  const openImagePicker = useCallback(() => {
    setError(null)
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""

      if (!file) return

      await insertImage(file)
    },
    [insertImage],
  )

  const handlePaste = useCallback(
    (_view: EditorView, event: ClipboardEvent) => {
      const file = getImageFileFromClipboard(event)
      if (!file) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()

      void insertImage(file)
      return true
    },
    [insertImage],
  )

  const bindEditor = useCallback((nextEditor: Editor | null) => {
    editorRef.current = nextEditor
  }, [])

  return {
    error,
    isUploading,
    registerFileInput,
    openImagePicker,
    handleFileSelected,
    handlePaste,
    bindEditor,
  }
}
