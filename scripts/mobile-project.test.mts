import assert from "node:assert/strict"
import test from "node:test"
import {
  DESKTOP_ONLY_FEATURES,
  MOBILE_PROJECT_SECTIONS,
  findDesktopOnlyFeature,
  getDesktopOnlyHref,
  getMobileWorldbuildingTabs,
  getProjectSectionHref,
} from "../lib/mobile-project"
import { voiceTitle } from "../lib/voice-title"

test("mobile ofrece worldbuilding, notas, lectores y estadísticas, y deja el editor afuera", () => {
  assert.deepEqual(
    MOBILE_PROJECT_SECTIONS.map((section) => section.segment),
    ["worldbuilding", "storyboard", "shares", "statistics"],
  )
  assert.deepEqual(
    DESKTOP_ONLY_FEATURES.map((feature) => feature.id),
    ["editor", "versions"],
  )
})

test("las rutas escapan el id del proyecto", () => {
  assert.equal(getProjectSectionHref("a b", "storyboard"), "/projects/a%20b/storyboard")
  assert.equal(getDesktopOnlyHref("p1", "editor"), "/projects/p1?desktop=editor")
})

test("solo reconoce funciones de escritorio conocidas", () => {
  assert.equal(findDesktopOnlyFeature("editor")?.label, "Editor")
  assert.equal(findDesktopOnlyFeature("versions")?.id, "versions")
  assert.equal(findDesktopOnlyFeature("otra"), null)
  assert.equal(findDesktopOnlyFeature(null), null)
})

test("en mobile se oculta la pestaña Relaciones", () => {
  const tabs = [{ id: "wiki" }, { id: "relationships" }, { id: "timeline" }]
  assert.deepEqual(
    getMobileWorldbuildingTabs(tabs).map((tab) => tab.id),
    ["wiki", "timeline"],
  )
})

test("el título de una nota por voz es su primera frase, acotada", () => {
  assert.equal(voiceTitle("La emboscada. Cae la noche."), "La emboscada")
  assert.equal(voiceTitle("   "), "Idea registrada por voz")
  assert.equal(voiceTitle("a".repeat(300)).length, 200)
})
