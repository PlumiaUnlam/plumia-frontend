import assert from "node:assert/strict"
import test from "node:test"
import { getSchema } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { EditorState, TextSelection } from "@tiptap/pm/state"
import { history, undo } from "@tiptap/pm/history"
import { ParagraphFormatting, DEFAULT_PARAGRAPH_ATTRIBUTES } from "../components/editor/paragraph-formatting"
import { normalizeTabStops, nextTabWidth, tabStopDecorations } from "../components/editor/paragraph-tab-stops"
import { registerEditorSaveShortcut } from "../lib/editor-save-shortcut"

const schema = getSchema([StarterKit, ParagraphFormatting])

test("el espaciado y las posiciones sobreviven al JSON sin alterar texto, marcas ni Tab", () => {
  const paragraph = schema.node("paragraph", { spacingBefore: 6, spacingAfter: 12, tabStops: [2.5, 5] }, [schema.text("uno\t\tdos", [schema.marks.bold.create()])])
  const doc = schema.node("doc", null, [paragraph])
  const loaded = schema.nodeFromJSON(doc.toJSON())
  assert.equal(loaded.textContent, "uno\t\tdos")
  assert.equal(loaded.firstChild?.attrs.spacingBefore, 6)
  assert.equal(loaded.firstChild?.attrs.spacingAfter, 12)
  assert.deepEqual(loaded.firstChild?.attrs.tabStops, [2.5, 5])
  assert.equal(loaded.firstChild?.firstChild?.marks[0].type.name, "bold")
  const decorations = tabStopDecorations(loaded).find()
  assert.deepEqual(decorations.map(({ from, to }) => [from, to]), [[4, 5], [5, 6]])
  assert.equal(schema.node("paragraph").attrs.spacingBefore, null)
  assert.equal(tabStopDecorations(schema.node("doc", null, [schema.node("paragraph", null, schema.text("a\tb"))])).find().length, 0)
})

test("modificar el formato de varios párrafos admite deshacer y restablecer", () => {
  let state = EditorState.create({ schema, doc: schema.node("doc", null, [schema.node("paragraph", null, schema.text("a\tb")), schema.node("paragraph", null, schema.text("c\td"))]), plugins: [history()] })
  const initial = state.doc.toJSON()
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)))
  const tr = state.tr
  state.doc.descendants((node, position) => {
    if (node.type.name === "paragraph") tr.setNodeMarkup(position, undefined, { ...node.attrs, spacingAfter: 10, tabStops: [3] })
  })
  state = state.apply(tr)
  assert.equal(state.doc.child(0).attrs.spacingAfter, 10)
  assert.equal(state.doc.child(1).attrs.spacingAfter, 10)
  assert.equal(undo(state, (transaction) => { state = state.apply(transaction) }), true)
  assert.deepEqual(state.doc.toJSON(), initial)
  state = state.apply(state.tr.setNodeMarkup(0, undefined, { ...DEFAULT_PARAGRAPH_ATTRIBUTES }))
  assert.deepEqual(state.doc.child(0).attrs.tabStops, [])
})

test("las posiciones se ordenan y avanzan a la próxima, con intervalo normal al terminar", () => {
  assert.deepEqual(normalizeTabStops([5, 2.5, 5, 0, -1, Infinity, NaN, "3", 31]), [2.5, 5])
  const cm = 96 / 2.54
  assert.ok(Math.abs(nextTabWidth(0, [2.5, 5], 20) - 2.5 * cm) < 0.01)
  assert.ok(Math.abs(nextTabWidth(2.5 * cm, [2.5, 5], 20) - 2.5 * cm) < 0.01)
  assert.equal(nextTabWidth(5 * cm, [2.5, 5], 20), 20)
  assert.equal(nextTabWidth(5 * cm + 10, [2.5, 5], 20), 10)
})

test("Ctrl/Cmd+S guarda el panel activo, cancela Guardar página y limpia el listener", async () => {
  const events = new EventTarget()
  const target = {
    addEventListener: events.addEventListener.bind(events) as Window["addEventListener"],
    removeEventListener: events.removeEventListener.bind(events) as Window["removeEventListener"],
  }
  let pane = "primary"
  const saved: string[] = []
  const errors: unknown[] = []
  const cleanup = registerEditorSaveShortcut(target, async () => { saved.push(pane) }, (error) => errors.push(error))
  const key = (properties: Record<string, unknown>) => {
    const event = new Event("keydown", { cancelable: true })
    Object.assign(event, { key: "s", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, repeat: false }, properties)
    events.dispatchEvent(event)
    return event
  }
  assert.equal(key({ ctrlKey: true }).defaultPrevented, true)
  pane = "secondary"
  assert.equal(key({ metaKey: true }).defaultPrevented, true)
  assert.equal(key({ ctrlKey: true, repeat: true }).defaultPrevented, true)
  assert.equal(key({ ctrlKey: true, shiftKey: true }).defaultPrevented, false)
  assert.equal(key({ ctrlKey: true, isComposing: true }).defaultPrevented, false)
  assert.equal(key({ key: "f", ctrlKey: true }).defaultPrevented, false)
  assert.deepEqual(saved, ["primary", "secondary"])
  cleanup()
  assert.equal(key({ ctrlKey: true }).defaultPrevented, false)
  registerEditorSaveShortcut(target, async () => { throw new Error("Sin conexión") }, (error) => errors.push(error))
  key({ ctrlKey: true })
  await Promise.resolve()
  assert.equal(errors.length, 1)
})
