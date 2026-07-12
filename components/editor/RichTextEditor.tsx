import { useRef, useState, type ChangeEvent } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import Image from "@tiptap/extension-image"
import StarterKit from "@tiptap/starter-kit"

import { uploadSceneImage } from "@/services/upload.service"
import type { ProseMirrorJSON } from "@/types/scene"
import { EditorToolbar } from "./toolbar"

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

type RichTextEditorProps = {
  title: string
  subtitle?: string
  sceneId: string
  content?: ProseMirrorJSON | null
  onChange?: (json: ProseMirrorJSON) => void
}

export function RichTextEditor({
  title,
  subtitle,
  sceneId,
  content,
  onChange,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "mx-auto my-6 max-w-full rounded-lg border border-border shadow-sm",
        },
      }),
    ],
    content: content ?? "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON())
    },
  })

  const openImagePicker = () => {
    setUploadError(null)
    fileInputRef.current?.click()
  }

  const handleImageSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      setUploadError("Solo se permiten imagenes JPG, PNG, WEBP o AVIF.")
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("La imagen no puede superar los 10 MB.")
      return
    }

    if (!editor) return

    setIsUploadingImage(true)
    setUploadError(null)

    try {
      const publicUrl = await uploadSceneImage(sceneId, file)

      editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run()
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "No se pudo subir la imagen.",
      )
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (!editor) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleImageSelected}
      />

      <EditorToolbar
        editor={editor}
        onInsertImage={openImagePicker}
        isUploadingImage={isUploadingImage}
      />

      {uploadError && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {uploadError}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div
            className="
              flex
              min-h-[297mm]
              cursor-text
              flex-col
              rounded-lg
              border
              bg-card
              px-10
              py-8
            "
          >
            {title && (
              <>
              <h2 className="mb-6 shrink-0 text-center text-3xl font-bold text-foreground">
                {title}
              </h2>
              <h1 className="mb-6 shrink-0 text-center text-2xl font-bold text-foreground">
                {subtitle}
              </h1>
              </>
            )}

            <EditorContent
              editor={editor}
              className="
                prose
                prose-neutral
                dark:prose-invert

                prose-p:leading-8
                prose-p:my-0
                prose-img:my-6
                prose-img:mx-auto
                prose-img:rounded-lg
                prose-img:border
                prose-img:border-border
                prose-img:shadow-sm

                text-[16px]
                
                flex
                flex-1
                flex-col

                [&_.ProseMirror]:flex-1
                [&_.ProseMirror]:outline-none
              "
            />
          </div>
        </div>
      </div>
    </div>
  )
}
