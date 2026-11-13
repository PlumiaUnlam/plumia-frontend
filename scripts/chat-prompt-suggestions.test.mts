import assert from "node:assert/strict"

import {
  APP_HELP_SUGGESTION,
  buildChatPromptSuggestions,
  DEFAULT_CHAT_PROMPT_SUGGESTIONS,
} from "../lib/chat-prompt-suggestions"
import type { Entity, EntityType } from "../types/entity"

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

function entity(
  canonicalName: string,
  type: EntityType,
  overrides: Partial<Entity> = {},
): Entity {
  return {
    id: canonicalName,
    canonicalName,
    type,
    description: null,
    aliases: [],
    imageUrl: null,
    projectId: "p1",
    isActive: true,
    attributes: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

check("sin entidades usa el set fijo que no depende de la Wiki", () => {
  assert.deepEqual(buildChatPromptSuggestions([]), DEFAULT_CHAT_PROMPT_SUGGESTIONS)
})

check("con un personaje cubre la obra, los metadatos y la ayuda de PlumIA", () => {
  assert.deepEqual(buildChatPromptSuggestions([entity("Mara Voss", "CHARACTER")]), [
    "¿Quién es Mara Voss?",
    "¿En qué capítulo aparece por primera vez Mara Voss?",
    APP_HELP_SUGGESTION,
  ])
})

check("prefiere a la protagonista antes que otros personajes y lugares", () => {
  const [first] = buildChatPromptSuggestions([
    entity("Atalaya antigua", "LOCATION"),
    entity("Adrián Rivas", "CHARACTER", { attributes: { rol: "Mentor ambiguo" } }),
    entity("Eliana Vale", "CHARACTER", { attributes: { rol: "Protagonista" } }),
  ])
  assert.equal(first, "¿Quién es Eliana Vale?")
})

check("si no hay personajes pregunta por la entidad sin asumir que es una persona", () => {
  const [first, second] = buildChatPromptSuggestions([entity("Atalaya antigua", "LOCATION")])
  assert.equal(first, "¿Qué información tenés sobre Atalaya antigua?")
  assert.equal(second, "¿En qué capítulo aparece por primera vez Atalaya antigua?")
})

check("ignora entidades inactivas, sin nombre o con nombres demasiado largos", () => {
  const suggestions = buildChatPromptSuggestions([
    entity("Inactiva", "CHARACTER", { isActive: false }),
    entity("   ", "CHARACTER"),
    entity("x".repeat(61), "CHARACTER"),
  ])
  assert.deepEqual(suggestions, DEFAULT_CHAT_PROMPT_SUGGESTIONS)
})

check("evita nombres con iniciales si hay otro personaje", () => {
  const [first] = buildChatPromptSuggestions([
    entity("John H. Watson", "CHARACTER"),
    entity("Sherlock Holmes", "CHARACTER"),
  ])
  assert.equal(first, "¿Quién es Sherlock Holmes?")
})

check("usa un nombre con iniciales si es el único disponible", () => {
  const [first] = buildChatPromptSuggestions([entity("John H. Watson", "CHARACTER")])
  assert.equal(first, "¿Quién es John H. Watson?")
})

check("recorta espacios del nombre", () => {
  const [first] = buildChatPromptSuggestions([entity("  Inés Vale  ", "CHARACTER")])
  assert.equal(first, "¿Quién es Inés Vale?")
})

console.log(`\n${passed} pruebas de sugerencias del chat en verde`)
