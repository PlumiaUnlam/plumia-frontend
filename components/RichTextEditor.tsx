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
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-white">
        <EditorToolbar editor={editor} />
      </div>

      <div className="flex-1 bg-background px-2 py-3 sm:px-3 lg:px-4 overflow-y-auto">
        <div className="mx-auto min-h-[297mm] w-full max-w-[820px] bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8 lg:px-10 lg:py-10">
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