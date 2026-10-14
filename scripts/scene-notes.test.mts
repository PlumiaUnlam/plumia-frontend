import assert from "node:assert/strict"
import test from "node:test"
import { getSchema } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import {
  collectSceneNotes,
  isNoteEmpty,
  noteContentToPlainText,
  normalizeNoteKind,
  parseNoteContent,
} from "../lib/scene-notes"
import { NoteReference } from "../components/editor/note-reference"

const note = (kind: unknown, text: string, id = text) => ({
  type: "noteReference",
  attrs: { id, kind, content: [{ type: "text", text }] },
})

test("numera las notas por tipo y en orden de aparición", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Uno" }, note("footnote", "a"), note("endnote", "b")] },
      { type: "blockquote", content: [{ type: "paragraph", content: [note(undefined, "c"), note("endnote", "d")] }] },
    ],
  }
  const notes = collectSceneNotes(doc)
  assert.deepEqual(
    notes.map(({ kind, number, text }) => [kind, number, text]),
    [["footnote", 1, "a"], ["endnote", 1, "b"], ["footnote", 2, "c"], ["endnote", 2, "d"]],
  )
  assert.deepEqual(collectSceneNotes(null), [])
})

test("cualquier tipo distinto de endnote es nota al pie", () => {
  assert.equal(normalizeNoteKind("endnote"), "endnote")
  assert.equal(normalizeNoteKind("otra"), "footnote")
  assert.equal(normalizeNoteKind(undefined), "footnote")
})

test("el texto plano conserva saltos, aplana párrafos e ignora notas anidadas", () => {
  const content = [
    { type: "text", text: "Ver " },
    { type: "text", text: "Borges", marks: [{ type: "italic" }] },
    { type: "hardBreak" },
    { type: "paragraph", content: [{ type: "text", text: "fuente" }, note("footnote", "x")] },
  ]
  assert.equal(noteContentToPlainText(content), "Ver Borges\nfuente")
  assert.equal(isNoteEmpty(content), false)
  assert.equal(isNoteEmpty([{ type: "text", text: "   " }, { type: "hardBreak" }]), true)
  assert.equal(isNoteEmpty([]), true)
})

test("el contenido serializado inválido se trata como vacío", () => {
  assert.deepEqual(parseNoteContent("{no es json"), [])
  assert.deepEqual(parseNoteContent('{"type":"text"}'), [])
  assert.deepEqual(parseNoteContent('[{"type":"text","text":"a"}]'), [{ type: "text", text: "a" }])
})

test("el nodo sobrevive al JSON con sus atributos", () => {
  const schema = getSchema([StarterKit, NoteReference])
  const json = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hola" }, note("endnote", "Nota", "id-1")] }],
  }
  const loaded = schema.nodeFromJSON(json)
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.toJSON())), json)
  assert.equal(loaded.textContent, "Hola")
})
