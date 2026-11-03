import assert from "node:assert/strict"
import test from "node:test"
import { getSchema } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { findCitationRanges } from "../components/editor/editor-citation-focus"

const schema = getSchema([StarterKit])

test("la cita resalta todas las coincidencias exactas y no falla si se repite", () => {
  const repeatedQuote = "Alicia cruzó el puente al amanecer."
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text(repeatedQuote)),
    schema.node("paragraph", null, schema.text(`Luego, ${repeatedQuote}`)),
  ])

  const ranges = findCitationRanges(doc, repeatedQuote)

  assert.equal(ranges.length, 2)
  assert.deepEqual(
    ranges.map(({ from, to }) => doc.textBetween(from, to)),
    [repeatedQuote, repeatedQuote],
  )
})

test("una cita que no esta en el documento no genera un resaltado", () => {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("Alicia cruzó el puente.")),
  ])

  assert.deepEqual(findCitationRanges(doc, "Bruno llegó a la ciudad."), [])
})
