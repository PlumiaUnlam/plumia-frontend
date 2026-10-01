import assert from "node:assert/strict"
import test from "node:test"
import { getSchema } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { EditorState } from "@tiptap/pm/state"
import { history, undo } from "@tiptap/pm/history"
import nspell from "nspell"
import spanish from "dictionary-es"
import english from "dictionary-en"
import type { Mark } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"
import { findSpellingWord, replaceSpellingWord } from "../components/editor/spelling-word"
import { loadSpellchecker } from "../lib/spellcheck"

const schema = getSchema([StarterKit])
const document = (text: string, marks: Mark[] = []) => schema.node("doc", null, [schema.node("paragraph", null, schema.text(text, marks))])

test("sugiere palabras reales en español e inglés", () => {
  const es = nspell({ aff: Buffer.from(spanish.aff), dic: Buffer.from(spanish.dic) })
  assert.equal(es.correct("inortal"), false)
  assert.ok(es.suggest("inortal").includes("inmortal"))
  assert.equal(es.correct("inmortal"), true)
  const en = nspell({ aff: Buffer.from(english.aff), dic: Buffer.from(english.dic) })
  assert.ok(en.suggest("speling").includes("spelling"))
})

test("encuentra palabras acentuadas y separadas por marcas sin tomar puntuación o emojis", () => {
  const doc = document("🌙 ¡ortografía! d’Artagnan.")
  assert.equal(findSpellingWord(doc, 2), null)
  assert.deepEqual(findSpellingWord(doc, 7), { from: 5, to: 15, word: "ortografía" })
  assert.equal(findSpellingWord(doc, 19)?.word, "d’Artagnan")
  const mixed = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("in"), schema.text("ortal", [schema.marks.bold.create()])])])
  assert.equal(findSpellingWord(mixed, 5)?.word, "inortal")
  const code = schema.node("doc", null, [schema.node("codeBlock", null, schema.text("inortal"))])
  assert.equal(findSpellingWord(code, 4), null)
})

test("reemplaza sólo la palabra, conserva negrita, sitúa el cursor y permite deshacer", () => {
  let state = EditorState.create({ schema, doc: document("Soy inortal.", [schema.marks.bold.create()]), plugins: [history()] })
  const editor = { isDestroyed: false, isEditable: true, get state() { return state }, view: { dispatch(tr: Transaction) { state = state.apply(tr) } } }
  const word = findSpellingWord(state.doc, 8)
  assert.ok(word)
  assert.equal(replaceSpellingWord(editor, word, "inmortal"), true)
  assert.equal(state.doc.textContent, "Soy inmortal.")
  assert.equal(state.doc.firstChild?.firstChild?.marks[0].type.name, "bold")
  assert.equal(state.selection.from, word.from + "inmortal".length)
  assert.equal(undo(state, editor.view.dispatch), true)
  assert.equal(state.doc.textContent, "Soy inortal.")
})

test("rechaza rangos obsoletos o de sólo lectura y no interpreta HTML", () => {
  let state = EditorState.create({ schema, doc: document("inortal") })
  const editor = { isDestroyed: false, isEditable: true, get state() { return state }, view: { dispatch(tr: Transaction) { state = state.apply(tr) } } }
  const word = findSpellingWord(state.doc, 3)
  assert.ok(word)
  state = state.apply(state.tr.insertText("otro", word.from, word.to))
  assert.equal(replaceSpellingWord(editor, word, "inmortal"), false)
  const current = findSpellingWord(state.doc, 3)
  assert.ok(current)
  editor.isEditable = false
  assert.equal(replaceSpellingWord(editor, current, "inmortal"), false)
  editor.isEditable = true
  assert.equal(replaceSpellingWord(editor, current, "<b>texto</b>"), true)
  assert.equal(state.doc.textContent, "<b>texto</b>")
})

test("descarga sólo diccionarios locales, permite reintentar y reutiliza el motor", async () => {
  const originalFetch = globalThis.fetch
  const urls: string[] = []
  try {
    globalThis.fetch = async () => new Response("", { status: 503 })
    await assert.rejects(loadSpellchecker("es-AR"))
    globalThis.fetch = async (url) => {
      const path = String(url)
      urls.push(path)
      return new Response(Buffer.from(path.endsWith(".aff") ? spanish.aff : spanish.dic))
    }
    const first = loadSpellchecker("es-AR")
    assert.equal(loadSpellchecker("es-AR"), first)
    const spell = await first
    assert.equal(spell.correct("inmortal"), true)
    assert.deepEqual(urls.sort(), ["/spellcheck/es.aff", "/spellcheck/es.dic"])
  } finally {
    globalThis.fetch = originalFetch
  }
})
