"use client"

import { Extension, Node, type JSONContent } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Italic, Link2, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  NOTE_KIND_LABELS,
  NOTE_REFERENCE_NODE,
  createNoteId,
  isNoteEmpty,
  normalizeNoteContent,
  normalizeNoteKind,
  noteContentToPlainText,
  parseNoteContent,
  type NoteKind,
} from "@/lib/scene-notes"
import { ToolbarButton } from "./toolbar-button"

export type { NoteKind } from "@/lib/scene-notes"

/** Pedido para que el node view en `pos` abra su popover (al insertar o desde el panel). */
type NoteOpenRequest = { pos: number; isNew: boolean }

const OPEN_REQUEST_META = "noteReferenceOpenRequest"
const TOOLTIP_TEXT_LIMIT = 120
// Los menús devuelven el foco a su disparador al cerrarse; durante este lapso se recupera.
const FOCUS_GUARD_MS = 600

declare module "@tiptap/core" {
  interface Storage {
    noteReference: { openRequest: NoteOpenRequest | null }
  }
  interface Commands<ReturnType> {
    noteReference: {
      insertNote: (kind?: NoteKind) => ReturnType
      updateNote: (
        id: string,
        attrs: Partial<{ kind: NoteKind; content: JSONContent[] }>,
      ) => ReturnType
      removeNote: (id: string) => ReturnType
      openNote: (pos: number) => ReturnType
    }
  }
}

function truncate(text: string, limit: number) {
  const singleLine = text.replace(/\s+/g, " ").trim()
  return singleLine.length > limit ? `${singleLine.slice(0, limit - 1)}…` : singleLine
}

function takeOpenRequest(editor: Editor, pos: number | undefined) {
  const storage = editor.storage.noteReference
  const request = storage.openRequest
  if (!request || request.pos !== pos) return null
  storage.openRequest = null
  return request
}

function normalizeLinkHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed
  }
  return `https://${trimmed}`
}

const NoteDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "paragraph",
})

// La nota es un solo párrafo: Enter agrega un salto de línea.
const NoteEnterAsBreak = Extension.create({
  name: "noteEnterAsBreak",
  priority: 1000,
  addKeyboardShortcuts() {
    return { Enter: () => this.editor.commands.setHardBreak() }
  },
})

function NoteContentEditor({
  initialContent,
  onChange,
  onEditorReady,
}: Readonly<{
  initialContent: JSONContent[]
  onChange: (content: JSONContent[]) => void
  onEditorReady: (editor: Editor | null) => void
}>) {
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  const miniEditor = useEditor({
    immediatelyRender: true,
    extensions: [
      NoteDocument,
      StarterKit.configure({
        document: false,
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: false },
      }),
      NoteEnterAsBreak,
    ],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: initialContent }],
    },
    editorProps: {
      attributes: {
        class:
          "note-editor-content min-h-16 max-h-48 overflow-y-auto rounded-md border border-border bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring [&_a]:text-primary [&_a]:underline",
        "aria-label": "Texto de la nota",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON().content?.[0]?.content ?? [])
    },
  })

  useEffect(() => {
    onEditorReady(miniEditor)
    if (!miniEditor) return
    const frame = requestAnimationFrame(() => miniEditor.commands.focus("end"))
    return () => {
      cancelAnimationFrame(frame)
      onEditorReady(null)
    }
  }, [miniEditor, onEditorReady])

  const state = useEditorState({
    editor: miniEditor,
    selector: ({ editor }) =>
      editor
        ? {
            isBold: editor.isActive("bold"),
            isItalic: editor.isActive("italic"),
            isLink: editor.isActive("link"),
            href: (editor.getAttributes("link").href as string | undefined) ?? "",
            hasSelection: !editor.state.selection.empty,
          }
        : null,
  })

  if (!miniEditor || !state) return null

  const applyLink = () => {
    const href = normalizeLinkHref(linkDraft ?? "")
    const chain = miniEditor.chain().focus().extendMarkRange("link")
    if (href) chain.setLink({ href }).run()
    else chain.unsetLink().run()
    setLinkDraft(null)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <ToolbarButton
          type="button"
          size="icon-sm"
          variant={state.isBold ? "secondary" : "ghost"}
          title="Negrita"
          aria-label="Negrita"
          aria-pressed={state.isBold}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => miniEditor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          type="button"
          size="icon-sm"
          variant={state.isItalic ? "secondary" : "ghost"}
          title="Cursiva"
          aria-label="Cursiva"
          aria-pressed={state.isItalic}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => miniEditor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          type="button"
          size="icon-sm"
          variant={state.isLink || linkDraft !== null ? "secondary" : "ghost"}
          title={state.isLink ? "Editar link" : "Agregar link"}
          aria-label={state.isLink ? "Editar link" : "Agregar link"}
          disabled={!state.isLink && !state.hasSelection}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setLinkDraft((draft) => (draft === null ? state.href : null))}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
      </div>

      {linkDraft !== null && (
        <div className="flex gap-1.5">
          <input
            autoFocus
            data-note-link-input=""
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                applyLink()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                setLinkDraft(null)
                miniEditor.commands.focus()
              }
            }}
            placeholder="https://..."
            aria-label="URL del link"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring"
          />
          <Button type="button" size="sm" onClick={applyLink}>
            {linkDraft.trim() ? "Aplicar" : "Quitar"}
          </Button>
        </div>
      )}

      <EditorContent editor={miniEditor} />
      <p className="text-xs text-muted-foreground">Enter agrega un salto de línea.</p>
    </>
  )
}

function NoteReferenceNodeView({
  editor,
  node,
  selected,
  getPos,
  updateAttributes,
  deleteNode,
}: Readonly<NodeViewProps>) {
  const kind = normalizeNoteKind(node.attrs.kind)
  const content = normalizeNoteContent(node.attrs.content)
  const label = NOTE_KIND_LABELS[kind]
  const plainText = truncate(noteContentToPlainText(content), TOOLTIP_TEXT_LIMIT)

  const [isOpen, setIsOpen] = useState(false)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  const isNewRef = useRef(false)
  const draftRef = useRef<JSONContent[] | null>(null)
  const restoreFocusRef = useRef(false)
  const openedAtRef = useRef(0)
  const miniEditorRef = useRef<Editor | null>(null)

  const openPopover = useCallback((isNew: boolean) => {
    if (!editor.isEditable) return
    isNewRef.current = isNew
    draftRef.current = null
    restoreFocusRef.current = false
    openedAtRef.current = Date.now()
    setIsTooltipOpen(false)
    setIsOpen(true)
  }, [editor])

  // Abre el popover cuando un comando lo pidió para esta nota.
  useEffect(() => {
    const consumeOpenRequest = () => {
      const request = takeOpenRequest(editor, getPos())
      if (request) openPopover(request.isNew)
    }
    consumeOpenRequest()
    editor.on("transaction", consumeOpenRequest)
    return () => {
      editor.off("transaction", consumeOpenRequest)
    }
  }, [editor, getPos, openPopover])

  const focusMainEditorAt = (pos: number) => {
    editor.chain().focus().setTextSelection(Math.min(pos, editor.state.doc.content.size)).run()
  }

  const closePopover = () => {
    const pos = getPos()
    const draft = draftRef.current ?? content
    const restoreFocus = restoreFocusRef.current
    const wasNew = isNewRef.current
    isNewRef.current = false
    draftRef.current = null
    setIsOpen(false)

    if (wasNew && isNoteEmpty(draft)) {
      deleteNode()
      if (restoreFocus && typeof pos === "number") focusMainEditorAt(pos)
      return
    }
    if (JSON.stringify(draft) !== JSON.stringify(content)) {
      updateAttributes({ content: draft })
    }
    if (restoreFocus && typeof pos === "number") focusMainEditorAt(pos + node.nodeSize)
  }

  const handleDelete = () => {
    const pos = getPos()
    isNewRef.current = false
    draftRef.current = null
    setIsOpen(false)
    deleteNode()
    if (typeof pos === "number") focusMainEditorAt(pos)
  }

  const handleEditorReady = useCallback((miniEditor: Editor | null) => {
    miniEditorRef.current = miniEditor
  }, [])

  return (
    <NodeViewWrapper as="sup" className="note-ref-wrapper" contentEditable={false}>
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (open) openPopover(false)
          else closePopover()
        }}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip open={isTooltipOpen && !isOpen} onOpenChange={setIsTooltipOpen}>
            <PopoverAnchor asChild>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "note-ref",
                    `note-ref--${kind}`,
                    selected && "note-ref--selected",
                  )}
                  data-note-reference=""
                  data-note-kind={kind}
                  role="button"
                  tabIndex={-1}
                  aria-label={label}
                  onClick={() => openPopover(false)}
                />
              </TooltipTrigger>
            </PopoverAnchor>
            <TooltipContent side="top" sideOffset={6} className="max-w-72 flex-col items-start gap-0.5">
              <span className="font-semibold">{label}</span>
              <span className="whitespace-normal">{plainText || "Sin texto"}</span>
            </TooltipContent>
          </Tooltip>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="w-80"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => {
              // Escape dentro del campo de URL solo cierra ese campo.
              if (event.target instanceof Element && event.target.closest("[data-note-link-input]")) {
                event.preventDefault()
                return
              }
              restoreFocusRef.current = true
            }}
            onFocusOutside={(event) => {
              // Solo se cierra con clic afuera o Escape; si un menú se llevó el foco al abrir, se recupera.
              event.preventDefault()
              if (Date.now() - openedAtRef.current < FOCUS_GUARD_MS) {
                requestAnimationFrame(() => miniEditorRef.current?.commands.focus("end"))
              }
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                spacing={0}
                value={kind}
                onValueChange={(value) => {
                  if (value) updateAttributes({ kind: normalizeNoteKind(value) })
                }}
                aria-label="Tipo de nota"
              >
                <ToggleGroupItem value="footnote" className="px-2.5 text-xs">Al pie</ToggleGroupItem>
                <ToggleGroupItem value="endnote" className="px-2.5 text-xs">Al final</ToggleGroupItem>
              </ToggleGroup>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </div>

            {isOpen && (
              <NoteContentEditor
                initialContent={content}
                onChange={(next) => {
                  draftRef.current = next
                }}
                onEditorReady={handleEditorReady}
              />
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  restoreFocusRef.current = true
                  closePopover()
                }}
              >
                Listo
              </Button>
            </div>
          </PopoverContent>
        </TooltipProvider>
      </Popover>
    </NodeViewWrapper>
  )
}

export const NoteReference = Node.create({
  name: NOTE_REFERENCE_NODE,

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addStorage() {
    return { openRequest: null }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        // Al pegar una nota copiada se genera un id nuevo para no duplicarlo.
        parseHTML: () => createNoteId(),
        rendered: false,
      },
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
        "data-note-content": JSON.stringify(normalizeNoteContent(node.attrs.content)),
        class: `note-ref note-ref--${kind}`,
      },
    ]
  },

  renderText() {
    return ""
  },

  addCommands() {
    return {
      insertNote:
        (kind = "footnote") =>
        ({ state, tr, dispatch }) => {
          const { $to } = state.selection
          const index = $to.index()
          if (!$to.parent.canReplaceWith(index, index, this.type)) return false
          if (!dispatch) return true

          const pos = $to.pos
          const note = this.type.create({
            id: createNoteId(),
            kind: normalizeNoteKind(kind),
            content: [],
          })
          tr.insert(pos, note)
          tr.setSelection(TextSelection.create(tr.doc, pos + note.nodeSize))
          tr.setMeta(OPEN_REQUEST_META, true)
          tr.scrollIntoView()
          this.storage.openRequest = { pos, isNew: true }
          dispatch(tr)
          return true
        },

      updateNote:
        (id, attrs) =>
        ({ state, tr, dispatch }) => {
          const pos = findNotePosition(state.doc, id)
          if (pos === null) return false
          if (dispatch) {
            const node = state.doc.nodeAt(pos)!
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
            dispatch(tr)
          }
          return true
        },

      removeNote:
        (id) =>
        ({ state, tr, dispatch }) => {
          const pos = findNotePosition(state.doc, id)
          if (pos === null) return false
          if (dispatch) {
            tr.delete(pos, pos + state.doc.nodeAt(pos)!.nodeSize)
            dispatch(tr)
          }
          return true
        },

      openNote:
        (pos) =>
        ({ state, tr, dispatch }) => {
          if (state.doc.nodeAt(pos)?.type !== this.type) return false
          if (dispatch) {
            this.storage.openRequest = { pos, isNew: false }
            tr.setMeta(OPEN_REQUEST_META, true)
            dispatch(tr)
          }
          return true
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteReferenceNodeView)
  },
})

function findNotePosition(
  doc: ProseMirrorNode,
  id: string,
): number | null {
  let found: number | null = null
  doc.descendants((child, pos) => {
    if (found !== null) return false
    if (child.type.name === NOTE_REFERENCE_NODE && child.attrs.id === id) {
      found = pos
      return false
    }
    return true
  })
  return found
}
