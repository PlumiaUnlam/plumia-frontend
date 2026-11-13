import type { Entity } from "@/types/entity"

/*
 * Preguntas sugeridas al abrir un chat nuevo. Cada una apunta sin ambigüedad a
 * uno de los tres usos del chat y se validó contra el enrutamiento real:
 * - la obra en sí (quién es un personaje o qué se sabe de una entidad),
 * - metadatos de la obra (dónde aparece por primera vez),
 * - cómo usar PlumIA (dónde se ve la ficha de una entidad).
 * Nombran una entidad real del proyecto para mostrar el valor con datos propios.
 */

const MAX_NAME_LENGTH = 60

/** Ayuda de PlumIA: siempre se enruta a la documentación de la app. */
export const APP_HELP_SUGGESTION =
  "¿En qué sección de PlumIA veo la ficha completa de un personaje?"

/** Para obras todavía sin entidades en la Wiki. */
export const DEFAULT_CHAT_PROMPT_SUGGESTIONS: readonly string[] = [
  "¿Qué pasa en el primer capítulo?",
  "¿Qué tipo de preguntas puedo hacerte en este chat?",
  "¿Cómo analizo mi obra para completar la Wiki?",
]

export function buildChatPromptSuggestions(
  entities: readonly Entity[],
): readonly string[] {
  const featured = pickFeaturedEntity(entities)
  if (!featured) return DEFAULT_CHAT_PROMPT_SUGGESTIONS

  const name = featured.canonicalName.trim()
  return [
    featured.type === "CHARACTER"
      ? `¿Quién es ${name}?`
      : `¿Qué información tenés sobre ${name}?`,
    `¿En qué capítulo aparece por primera vez ${name}?`,
    APP_HELP_SUGGESTION,
  ]
}

/** Prefiere al protagonista, después cualquier personaje y luego otra entidad. */
function pickFeaturedEntity(entities: readonly Entity[]): Entity | null {
  const usable = entities.filter((entity) => {
    const name = entity.canonicalName.trim()
    return entity.isActive !== false && name.length > 0 && name.length <= MAX_NAME_LENGTH
  })
  const characters = usable.filter((entity) => entity.type === "CHARACTER")
  return (
    characters.find(isProtagonist) ?? characters[0] ?? usable[0] ?? null
  )
}

function isProtagonist(entity: Entity): boolean {
  if (!entity.attributes || typeof entity.attributes !== "object") return false
  return Object.values(entity.attributes as Record<string, unknown>).some(
    (value) => typeof value === "string" && /protagonista/i.test(value),
  )
}
