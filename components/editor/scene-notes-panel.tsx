"use client"

import { useEditorState, type Editor } from "@tiptap/react"

import {
  NOTE_REFERENCE_NODE,
  normalizeNoteContent,
  normalizeNoteKind,
  noteContentToPlainText,
  type NoteKind,
} from "@/lib/scene-notes"

type PanelNote = {
  pos: number
  kind: NoteKind
  number: number
  text: string
}

const SECTIONS: Array<{ kind: NoteKind; title: string }> = [
  { kind: "footnote", title: "Notas al pie" },
  { kind: "endnote", title: "Notas al final" },
]

function collectPanelNotes(editor: Editor): PanelNote[] {
  const notes: PanelNote[] = []
  const counters: Record<NoteKind, number> = { footnote: 0, endnote: 0 }
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== NOTE_REFERENCE_NODE) return true
    const kind = normalizeNoteKind(node.attrs.kind)
    counters[kind] += 1
    notes.push({
      pos,
      kind,
      number: counters[kind],
      text: noteContentToPlainText(normalizeNoteContent(node.attrs.content)),
    })
    return false
  })
  return notes
}

export function SceneNotesPanel({ editor }: Readonly<{ editor: Editor }>) {
  const notes = useEditorState({
    editor,
    selector: ({ editor: current }) => collectPanelNotes(current),
    equalityFn: (previous, next) =>
      JSON.stringify(previous) === JSON.stringify(next),
  })

  if (!notes || notes.length === 0) return null

  const goToNote = (pos: number) => {
    editor.chain().focus().setNodeSelection(pos).scrollIntoView().openNote(pos).run()
  }

  return (
    <section
      aria-label="Notas de la escena"
      className="mt-10 shrink-0 border-t border-border pt-4 text-sm"
    >
      {SECTIONS.map(({ kind, title }) => {
        const items = notes.filter((note) => note.kind === kind)
        if (items.length === 0) return null
        return (
          <div key={kind} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </h3>
            <ol className="m-0 list-none space-y-1 p-0">
              {items.map((note) => (
                <li key={note.pos}>
                  <button
                    type="button"
                    onClick={() => goToNote(note.pos)}
                    className="flex w-full gap-2 rounded-md px-2 py-1 text-left hover:bg-muted"
                  >
                    <span
                      className={
                        kind === "endnote"
                          ? "shrink-0 font-semibold text-primary"
                          : "shrink-0 font-semibold text-muted-foreground"
                      }
                    >
                      {note.number}.
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-line text-foreground/90">
                      {note.text.trim() || (
                        <span className="italic text-muted-foreground">Nota vacía</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </section>
  )
}
