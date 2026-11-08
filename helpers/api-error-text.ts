/**
 * Texto de error de una respuesta no exitosa del backend.
 *
 * - JSON con `message` de texto: ese texto (NestJS responde
 *   `{ statusCode, message, error }`).
 * - JSON con `message` como lista (errores de validación): se une con comas.
 * - JSON sin `message` (ej. `{}`): "" para que quien llama use su mensaje
 *   genérico en vez de mostrarle JSON crudo a la persona.
 * - Cuerpo que no es JSON (o JSON de un solo valor): se conserva tal cual.
 */
export function errorTextFromBody(body: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return body
  }

  if (typeof parsed !== "object" || parsed === null) return body

  const { message } = parsed as { message?: unknown }
  if (typeof message === "string") return message
  if (Array.isArray(message)) return message.join(", ")
  return ""
}

const ENGLISH_WORDS = new Set(
  (
    "the to is was were are be been not and or of in on for with from by an this that it its failed fail failure " +
    "error errors invalid missing required cannot unable unexpected internal server bad request forbidden " +
    "unauthorized found exists exist already does did has have must should could would please try again token " +
    "expired access denied allowed permission resource validation entity project user conflict timeout gateway " +
    "service unavailable something went wrong login password email address"
  ).split(" "),
)
const SPANISH_WORDS = new Set(
  (
    "el la los las un una unos unas de del al en y o que se no por para con sin es son fue ser esta este estos " +
    "estas su sus tu tus mi lo le les como más pero ya hay puede pudo pudieron nuevamente intentá intentalo"
  ).split(" "),
)

/**
 * Heurística para no mostrarle a la persona mensajes técnicos en inglés que
 * vienen del servidor (ej. "Internal server error", "Failed to fetch").
 * Un texto con tildes, ñ o signos de apertura se considera español.
 */
export function isLikelyEnglish(text: string): boolean {
  if (/[áéíóúñü¿¡]/i.test(text)) return false
  const words = text.toLowerCase().match(/[a-z']+/g) ?? []
  let english = 0
  let spanish = 0
  for (const word of words) {
    if (ENGLISH_WORDS.has(word)) english += 1
    else if (SPANISH_WORDS.has(word)) spanish += 1
  }
  return english > 0 && english >= spanish
}
