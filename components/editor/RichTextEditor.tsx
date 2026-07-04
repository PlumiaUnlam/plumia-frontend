import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import type { ProseMirrorJSON } from "@/types/chapter"
import { EditorToolbar } from "./toolbar"

type RichTextEditorProps = {
  title?: string
  content?: ProseMirrorJSON | null
  onChange?: (json: ProseMirrorJSON) => void
}

export function RichTextEditor({
  title,
  content,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: content ?? "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON())
    },
  })

  if (!editor) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorToolbar editor={editor} />

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
                Capitulo 3
              </h2>
              <h1 className="mb-6 shrink-0 text-center text-2xl font-bold text-foreground">
                {title}
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