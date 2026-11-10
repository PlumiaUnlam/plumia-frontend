import assert from "node:assert/strict"

import { Schema } from "@tiptap/pm/model"
import { EditorState } from "@tiptap/pm/state"

import { findAuthorAnnotationsWithRemovedAnchors } from "../components/editor/author-annotation-decorations"
import type { AuthorAnnotation } from "../types/author-annotation"

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: { inline: true },
  },
})

function createDocument(text: string) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, schema.text(text)),
  ])
}

function createAnnotation(text: string, quote: string): AuthorAnnotation {
  const start = text.indexOf(quote) + 1
  return {
    id: "annotation-1",
    sceneId: "scene-1",
    authorId: "author-1",
    author: {
      id: "author-1",
      name: "Autora",
      lastname: "Prueba",
      displayName: null,
      avatarUrl: null,
    },
    body: "Revisar este fragmento",
    quote,
    anchorFrom: start,
    anchorTo: start + quote.length,
    contextBefore: null,
    contextAfter: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
  }
}

const originalText = "La ciudad duerme mientras otra ciudad despierta."
const annotation = createAnnotation(originalText, "ciudad")
const originalState = EditorState.create({
  schema,
  doc: createDocument(originalText),
})

const unrelatedTransaction = originalState.tr.insertText("Hoy, ", 1)
assert.deepEqual(
  findAuthorAnnotationsWithRemovedAnchors(
    originalState.doc,
    unrelatedTransaction.doc,
    unrelatedTransaction.mapping,
    [annotation],
  ),
  [],
)

const deletionTransaction = originalState.tr.delete(
  annotation.anchorFrom!,
  annotation.anchorTo!,
)
assert.deepEqual(
  findAuthorAnnotationsWithRemovedAnchors(
    originalState.doc,
    deletionTransaction.doc,
    deletionTransaction.mapping,
    [annotation],
  ),
  [annotation.id],
  "Debe eliminar la anotación del rango borrado aunque la cita aparezca en otro lugar",
)

const freeAnnotation = { ...annotation, id: "free", quote: null }
assert.deepEqual(
  findAuthorAnnotationsWithRemovedAnchors(
    originalState.doc,
    deletionTransaction.doc,
    deletionTransaction.mapping,
    [freeAnnotation],
  ),
  [],
  "Las anotaciones sin fragmento asociado se conservan",
)

console.log("Las anotaciones siguen el ciclo de vida de su fragmento asociado.")
