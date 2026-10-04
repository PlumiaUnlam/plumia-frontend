"use client"

import { useEffect, useMemo } from "react"
import { Extension, Node, mergeAttributes } from "@tiptap/core"
import Image from "@tiptap/extension-image"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

import { ParagraphFormatting } from "@/components/editor/paragraph-formatting"
import { EntityLink } from "@/components/editor/entity-link/entity-link-extension"
import type {
  ReaderComment,
  TextSelectionAnchor,
} from "@/types/sharing"
import type { ProseMirrorJSON } from "@/types/scene"

export type SharedSceneProps = {
  sceneId: string
  title: string | null
  content: ProseMirrorJSON | null
  comments: ReaderComment[]
  activeCommentId: string | null
  canComment: boolean
  onSelection: (selection: TextSelectionAnchor) => void
  onCommentClick: (commentId: string) => void
}

const commentPluginKey = new PluginKey("sharedReaderComments")

type CommentDecorationState = {
  comments: ReaderComment[]
  activeCommentId: string | null
}

const SharedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      storageKey: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-storage-key"),
        renderHTML: (attributes) =>
          typeof attributes.storageKey === "string"
            ? { "data-storage-key": attributes.storageKey }
            : {},
      },
      width: {
        default: null,
        renderHTML: (attributes) =>
          typeof attributes.width === "number"
            ? {
                width: String(attributes.width),
                style: `width: ${attributes.width}px; max-width: 100%; height: auto;`,
              }
            : {},
      },
    }
  },
}).configure({
  inline: false,
  allowBase64: false,
  HTMLAttributes: { class: "mx-auto my-6 max-w-full rounded-md" },
})

const SharedEntityLink = EntityLink.extend({
  renderHTML() {
    return ["span", 0]
  },
})

const SharedSceneDivider = Node.create({
  name: "sceneDivider",
  group: "block",
  atom: true,
  selectable: false,
  addAttributes() {
    return { variant: { default: "flourish" } }
  },
  parseHTML() {
    return [{ tag: "div[data-scene-divider]" }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-scene-divider": "true",
        class: "my-8 text-center text-xl tracking-[0.5em] text-muted-foreground",
      }),
      "❦",
    ]
  },
})

export function SharedScene({
  sceneId,
  title,
  content,
  comments,
  activeCommentId,
  canComment,
  onSelection,
  onCommentClick,
}: SharedSceneProps) {
  const commentHighlights = useMemo(
    () =>
      Extension.create({
        name: "sharedCommentHighlights",
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: commentPluginKey,
              state: {
                init: (_config, state) =>
                  buildCommentDecorations(state.doc, {
                    comments,
                    activeCommentId,
                  }),
                apply(transaction, current) {
                  const updatedState = transaction.getMeta(
                    commentPluginKey,
                  ) as CommentDecorationState | undefined
                  return updatedState
                    ? buildCommentDecorations(transaction.doc, updatedState)
                    : current.map(transaction.mapping, transaction.doc)
                },
              },
              props: {
                decorations: (state) => commentPluginKey.getState(state),
                handleClick(_view, _position, event) {
                  const target = event.target
                  if (!(target instanceof Element)) return false
                  const highlight = target.closest<HTMLElement>("[data-comment-id]")
                  const commentId = highlight?.dataset.commentId
                  if (!commentId) return false
                  onCommentClick(commentId)
                  return true
                },
              },
            }),
          ]
        },
      }),
    [activeCommentId, comments, onCommentClick],
  )

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit,
      ParagraphFormatting,
      SharedImage,
      SharedSceneDivider,
      SharedEntityLink,
      commentHighlights,
    ],
    content: content ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class:
          "shared-reader-prose min-h-12 outline-none selection:bg-primary/20",
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.view.dispatch(
      editor.state.tr.setMeta(commentPluginKey, {
        comments,
        activeCommentId,
      } satisfies CommentDecorationState),
    )
  }, [activeCommentId, comments, editor])

  const captureSelection = () => {
    if (!canComment || !editor) return
    window.setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
      const range = selection.getRangeAt(0)
      if (!editor.view.dom.contains(range.commonAncestorContainer)) return

      try {
        const start = editor.view.posAtDOM(
          range.startContainer,
          range.startOffset,
        )
        const end = editor.view.posAtDOM(range.endContainer, range.endOffset)
        const selectedText = selection.toString().trim()
        if (!selectedText || start === end) return
        onSelection({
          snapshotSceneId: sceneId,
          anchorFrom: Math.min(start, end),
          anchorTo: Math.max(start, end),
          selectedText,
        })
      } catch {
        // Ignore selections that fall outside the ProseMirror document.
      }
    }, 0)
  }

  return (
    <article className="border-b border-border/60 py-8 last:border-b-0">
      {title && (
        <h3 className="mb-5 text-center font-serif text-xl font-semibold text-foreground/90">
          {title}
        </h3>
      )}
      <div onMouseUp={captureSelection}>
        <EditorContent editor={editor} />
      </div>
    </article>
  )
}

function buildCommentDecorations(
  document: ProseMirrorNode,
  { comments, activeCommentId }: CommentDecorationState,
): DecorationSet {
  const maximum = document.content.size
  const decorations = comments.flatMap((comment) => {
    const from = Math.max(1, Math.min(comment.anchorFrom, maximum))
    const to = Math.max(from, Math.min(comment.anchorTo, maximum))
    if (to <= from) return []
    return [
      Decoration.inline(from, to, {
        class:
          [
            "shared-comment-highlight",
            comment.status === "RESOLVED"
              ? "shared-comment-highlight--resolved"
              : "",
            comment.id === activeCommentId
              ? "shared-comment-highlight--active"
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        "data-comment-id": comment.id,
      }),
    ]
  })
  return DecorationSet.create(document, decorations)
}
