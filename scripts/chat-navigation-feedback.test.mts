import assert from "node:assert/strict"

import { resolveNavigationFeedback } from "../lib/chat-navigation-feedback"

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

const toolbar = {
  label: "Mostrar u ocultar la barra de herramientas de formato",
  route: "/projects/p1/editor",
}

check("un destino en otra pantalla navega", () => {
  assert.deepEqual(resolveNavigationFeedback(toolbar, "/projects/p1/statistics"), { kind: "navigate" })
})

check("la barra de herramientas ya estando en el editor se muestra y avisa", () => {
  const result = resolveNavigationFeedback(toolbar, "/projects/p1/editor")
  assert.equal(result.kind, "reveal-toolbar")
})

check("cualquier otra sección en la que ya estás avisa en vez de no hacer nada", () => {
  const result = resolveNavigationFeedback(
    { label: "Exportar el libro", route: "/projects/p1/editor" },
    "/projects/p1/editor",
  )
  assert.equal(result.kind, "already-here")
  if (result.kind === "already-here") assert.match(result.message, /Exportar el libro/)
})

check("una pestaña distinta de la misma pantalla sí navega", () => {
  const action = { label: "Línea temporal", route: "/projects/p1/worldbuilding?tab=timeline" }
  assert.deepEqual(resolveNavigationFeedback(action, "/projects/p1/worldbuilding", "tab=wiki"), { kind: "navigate" })
  assert.equal(resolveNavigationFeedback(action, "/projects/p1/worldbuilding", "tab=timeline").kind, "already-here")
})

check("la barra final en la ruta no cambia el resultado", () => {
  assert.equal(resolveNavigationFeedback(toolbar, "/projects/p1/editor/").kind, "reveal-toolbar")
})

check("una sección del panel derecho abre su pestaña en el editor", () => {
  const stats = {
    label: "El panel Stats del Editor",
    route: "/projects/p1/editor",
    section: "editor-right-stats" as const,
  }
  const result = resolveNavigationFeedback(stats, "/projects/p1/editor")
  assert.equal(result.kind, "reveal-panel")
  if (result.kind === "reveal-panel") {
    assert.equal(result.tab, "stats")
    assert.doesNotMatch(result.message, /ya estás|te mostré/i)
  }
})

check("la sección de la barra de herramientas no depende de la etiqueta", () => {
  const action = { label: "Formato", route: "/projects/p1/editor", section: "editor-toolbar" as const }
  assert.equal(resolveNavigationFeedback(action, "/projects/p1/editor").kind, "reveal-toolbar")
})

check("desde otra pantalla una sección del editor navega", () => {
  const chat = { label: "Chat", route: "/projects/p1/editor", section: "editor-right-chat" as const }
  assert.deepEqual(resolveNavigationFeedback(chat, "/projects/p1/worldbuilding"), { kind: "navigate" })
})

check("los avisos son objetivos y amables, sin tono de reproche", () => {
  const result = resolveNavigationFeedback(
    { label: "Exportar el libro", route: "/projects/p1/editor" },
    "/projects/p1/editor",
  )
  assert.equal(result.kind, "already-here")
  if (result.kind === "already-here") assert.doesNotMatch(result.message, /ya estás|te mostré/i)
})

check("el historial se abre aunque el editor ya esté a la vista", () => {
  const action = { label: "Crear una versión", route: "/projects/p1/editor", section: "editor-history" as const }
  assert.equal(resolveNavigationFeedback(action, "/projects/p1/editor").kind, "reveal-history")
  assert.equal(resolveNavigationFeedback(action, "/projects/p1/statistics").kind, "navigate")
})

check("revisar propuestas pide Wiki y anuncia el modo Revisión", () => {
  const action = { label: "Propuestas", route: "/projects/p1/editor", section: "editor-right-review" as const }
  const result = resolveNavigationFeedback(action, "/projects/p1/editor")
  assert.equal(result.kind, "reveal-panel")
  if (result.kind === "reveal-panel") {
    assert.equal(result.tab, "wiki")
    assert.match(result.message, /Revisión/)
  }
})

console.log(`chat-navigation-feedback: ${passed} pruebas`)
