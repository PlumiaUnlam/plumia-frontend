import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { EditorToolbar } from "./toolbar"

type RichTextEditorProps = {
  initialContent?: string
  onChange?: (html: string) => void
}

export function RichTextEditor({
  initialContent = "",
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="flex flex-col">
      <EditorToolbar editor={editor} />

      <div className="bg-muted/30 py-10">
        <div
          className="
            mx-auto
            min-h-[297mm]
            w-[148mm]
            bg-card
            border
            px-[20mm]
            py-[25mm]
          "
        >
          <EditorContent
          editor={editor}
          className="
            prose
            prose-neutral
            dark:prose-invert
            max-w-none

            prose-p:leading-8
            prose-p:my-0

            text-[16px]
          "
        />
        </div>
      </div>
    </div>
  )
}