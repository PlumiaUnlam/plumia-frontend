"use client"

import { Fragment, useEffect, useMemo, type ReactNode } from "react"
import {
  Extension,
  Node,
  mergeAttributes,
  type JSONContent,
} from "@tiptap/core"
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
import {
  NOTE_REFERENCE_NODE,
  collectSceneNotes,
  normalizeNoteContent,
  normalizeNoteKind,
  noteContentToPlainText,
  parseNoteContent,
  type NoteKind,
} from "@/lib/scene-notes"

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

const SharedNoteReference = Node.create({
  name: NOTE_REFERENCE_NODE,
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      id: { default: null, rendered: false },
      kind: {
        default: "footnote",
        parseHTML: (element: HTMLElement) =>
          normalizeNoteKind(element.getAttribute("data-note-kind")),
        rendered: false,
      },
      content: {
        default: [],
        parseHTML: (element: HTMLElement) =>
          parseNoteContent(element.getAttribute("data-note-content")),
        rendered: false,
      },
    }
  },
  parseHTML() {
    return [{ tag: "sup[data-note-reference]" }]
  },
  renderHTML({ node }) {
    const kind = normalizeNoteKind(node.attrs.kind)
    return [
      "sup",
      {
        "data-note-reference": "",
        "data-note-kind": kind,
        class: `note-ref note-ref--${kind}`,
        title: noteContentToPlainText(normalizeNoteContent(node.attrs.content)),
      },
    ]
  },
})

const NOTE_SECTIONS: Array<{ kind: NoteKind; title: string }> = [
  { kind: "footnote", title: "Notas al pie" },
  { kind: "endnote", title: "Notas al final" },
]

function hasMark(marks: JSONContent["marks"], ...types: string[]) {
  return marks?.some((mark) => types.includes(mark.type))
}

function renderNoteNodes(nodes: JSONContent[], keyPrefix = ""): ReactNode[] {
  return nodes.flatMap((node, index): ReactNode[] => {
    const key = `${keyPrefix}${index}`
    if (node.type === "hardBreak") return [<br key={key} />]
    if (node.type === NOTE_REFERENCE_NODE || node.type === "image") return []
    if (node.type !== "text") {
      return Array.isArray(node.content)
        ? renderNoteNodes(node.content, `${key}-`)
        : []
    }
    if (!node.text) return []

    let element: ReactNode = node.text
    if (hasMark(node.marks, "bold", "strong")) element = <strong>{element}</strong>
    if (hasMark(node.marks, "italic", "em")) element = <em>{element}</em>
    const href = node.marks?.find((mark) => mark.type === "link")?.attrs?.href
    if (typeof href === "string" && /^(https?:|mailto:)/i.test(href.trim())) {
      element = (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {element}
        </a>
      )
    }
    return [<Fragment key={key}>{element}</Fragment>]
  })
}

function SharedSceneNotes({ content }: Readonly<{ content: ProseMirrorJSON | null }>) {
  const notes = useMemo(
    () => collectSceneNotes(content as JSONContent | null),
    [content],
  )
  if (notes.length === 0) return null

  return (
    <aside
      aria-label="Notas de la escena"
      className="mt-8 border-t border-border/60 pt-4 font-serif text-sm leading-7 text-foreground/85"
    >
      {NOTE_SECTIONS.map(({ kind, title }) => {
        const items = notes.filter((note) => note.kind === kind)
        if (items.length === 0) return null
        return (
          <section key={kind} className="mb-4 last:mb-0">
            <h4 className="mb-1 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </h4>
            <ol className="m-0 list-none space-y-1 p-0">
              {items.map((note) => (
                <li key={`${kind}-${note.number}`} className="flex gap-2">
                  <span
                    className={
                      kind === "endnote"
                        ? "shrink-0 font-semibold text-primary"
                        : "shrink-0 font-semibold text-muted-foreground"
                    }
                  >
                    {note.number}.
                  </span>
                  <span className="min-w-0 flex-1">
                    {renderNoteNodes(note.content)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </aside>
  )
}

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
      SharedNoteReference,
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
      <SharedSceneNotes content={content} />
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
