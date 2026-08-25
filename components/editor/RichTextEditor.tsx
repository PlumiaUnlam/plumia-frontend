import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import type { ProseMirrorJSON } from "@/types/scene"
import { useEditorStore } from "@/stores/editor.store"
import {
  CitationFocus,
  citationFocusPluginKey,
  findCitationRange,
} from "./editor-citation-focus"
import { EditorToolbar } from "./toolbar"
import { EditorImage } from "./image/editor-image-extension"
import { useEditorImage } from "./image/use-editor-image"
import { EntityLink } from "./entity-link/entity-link-extension"
import { useEntityLink } from "./entity-link/use-entity-link"
import { EntityLinkHoverTooltip } from "./entity-link/entity-link-hover-tooltip"
import { SelectionBubbleMenu } from "./selection-menu/selection-bubble-menu"

type RichTextEditorProps = {
  title: string
  subtitle?: string
  sceneId: string
  projectId: string
  content?: ProseMirrorJSON | null
  versionLabel: string
  onChange?: (json: ProseMirrorJSON) => void
  onAnalyzeChanges?: () => void
  isAnalysisSaving?: boolean
  isZenMode?: boolean
}

export function RichTextEditor({
  title,
  subtitle,
  sceneId,
  projectId,
  content,
  versionLabel,
  onChange,
  onAnalyzeChanges,
  isAnalysisSaving = false,
  isZenMode = false,
}: RichTextEditorProps) {
  const {
    error,
    isUploading,
    registerFileInput,
    openImagePicker,
    handleFileSelected,
    handlePaste,
    bindEditor,
  } = useEditorImage({ sceneId })

  const { goToEntity } = useEntityLink({ projectId })
  const citationFocus = useEditorStore((state) => state.citationFocus)
  const clearCitationFocus = useEditorStore(
    (state) => state.clearCitationFocus,
  )

  const editor = useEditor({
    // El editor se monta después de cargar la escena en el cliente.
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
        },
      }),
      EditorImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "mx-auto my-6 max-w-full",
        },
      }),
      EntityLink,
      CitationFocus,
    ],
    content: content ?? "",
    editorProps: {
      handlePaste,
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON())
    },
  })

  useEffect(() => {
    bindEditor(editor ?? null)
  }, [editor, bindEditor])

  useEffect(() => {
    if (!editor) return

    const clearCitationDecoration = () => {
      if (editor.isDestroyed) return
      editor.view.dispatch(
        editor.state.tr.setMeta(citationFocusPluginKey, { clear: true }),
      )
    }

    if (!citationFocus || citationFocus.sceneId !== sceneId) {
      clearCitationDecoration()
      return
    }

    const range = findCitationRange(editor.state.doc, citationFocus.textQuote)
    if (!range) {
      clearCitationDecoration()
      clearCitationFocus()
      return
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(citationFocusPluginKey, {
        from: range.from,
        to: range.to,
      }),
    )
    const domNode = editor.view.domAtPos(range.from).node
    const scrollTarget =
      domNode instanceof HTMLElement ? domNode : domNode.parentElement
    scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" })
    const timeoutId = window.setTimeout(() => {
      if (editor.isDestroyed) return
      editor.view.dispatch(
        editor.state.tr.setMeta(citationFocusPluginKey, { clear: true }),
      )
      clearCitationFocus()
    }, 2600)

    return () => window.clearTimeout(timeoutId)
  }, [citationFocus, clearCitationFocus, editor, sceneId])

  if (!editor) return null

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <input
        ref={registerFileInput}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileSelected}
      />

      <EditorToolbar
        editor={editor}
        versionLabel={versionLabel}
        onInsertImage={openImagePicker}
        isUploadingImage={isUploading}
        onAnalyzeChanges={onAnalyzeChanges}
        isAnalysisSaving={isAnalysisSaving}
        isZenMode={isZenMode}
      />

      {error && (
        <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
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

            <SelectionBubbleMenu editor={editor} projectId={projectId} />
            <EntityLinkHoverTooltip editor={editor} onGoToEntity={goToEntity} />

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
