import assert from "node:assert/strict"
import test from "node:test"

import { isEmail } from "../helpers/validation"
import { errorTextFromBody, isLikelyEnglish } from "../helpers/api-error-text"
import {
  getAvailableRelationTypes,
  isRelationTypeAvailable,
  relationStyleOptions,
} from "../lib/relation-style"

test("errorTextFromBody usa el message de texto del backend", () => {
  assert.equal(
    errorTextFromBody(JSON.stringify({ statusCode: 403, message: "Email verification required" })),
    "Email verification required",
  )
})

test("errorTextFromBody une los mensajes de validación en lista", () => {
  assert.equal(
    errorTextFromBody(JSON.stringify({ message: ["title must be a string", "title should not be empty"] })),
    "title must be a string, title should not be empty",
  )
})

test("errorTextFromBody no deja pasar JSON sin message", () => {
  assert.equal(errorTextFromBody("{}"), "")
  assert.equal(errorTextFromBody(JSON.stringify({ statusCode: 500 })), "")
  assert.equal(errorTextFromBody(JSON.stringify({ message: 42 })), "")
  assert.equal(errorTextFromBody(JSON.stringify({ message: null })), "")
})

test("errorTextFromBody conserva cuerpos que no son un objeto JSON", () => {
  assert.equal(errorTextFromBody("Bad Gateway"), "Bad Gateway")
  assert.equal(errorTextFromBody(""), "")
  assert.equal(errorTextFromBody("null"), "null")
  assert.equal(errorTextFromBody("123"), "123")
  assert.equal(errorTextFromBody("<html>502</html>"), "<html>502</html>")
})

test("isEmail acepta correos válidos y rechaza los mal formados", () => {
  for (const valid of ["a@b.co", "luis.dini@example.com", "x+tag@sub.dominio.org", "o'neil@mail.com"]) {
    assert.equal(isEmail(valid), true, valid)
  }
  for (const invalid of ["", "sin-arroba", "a@b", "a@b.c", "@b.com", ".a@b.com", "a b@c.com", "a@b..com", "a@-.com"]) {
    assert.equal(isEmail(invalid), false, invalid)
  }
})

test("cada tipo de relación ofrecido por el modal está disponible para su par", () => {
  const types: Array<"CHARACTER" | "LOCATION" | "OBJECT" | "ORGANIZATION" | "EVENT" | "CONCEPT" | undefined> = [
    undefined,
    "CHARACTER",
    "LOCATION",
    "OBJECT",
    "ORGANIZATION",
    "EVENT",
    "CONCEPT",
  ]
  const known = new Set(relationStyleOptions.map((option) => option.id))

  for (const source of types) {
    for (const target of types) {
      const available = getAvailableRelationTypes(source, target)
      assert.ok(available.length > 0, `sin relaciones para ${source} -> ${target}`)
      for (const type of available) {
        assert.ok(known.has(type), `${type} no tiene estilo`)
        assert.equal(isRelationTypeAvailable(type, source, target), true)
      }
    }
  }
})

test("isLikelyEnglish detecta mensajes técnicos del servidor en inglés", () => {
  for (const text of [
    "Internal server error",
    "Failed to fetch",
    "Bad Request Exception",
    "Entity with this name already exists",
    "Unauthorized",
    "Forbidden resource",
    "Validation failed",
    "Request timeout",
    "Something went wrong",
  ]) {
    assert.equal(isLikelyEnglish(text), true, text)
  }
})

test("isLikelyEnglish deja pasar los mensajes en español", () => {
  for (const text of [
    "No se pudo guardar el evento ahora",
    "No pudimos conectar con el servidor.",
    "La entidad ya existe",
    "El título es obligatorio",
    "Esta invitación caducó.",
    "Error al guardar la entidad",
    "Intentalo nuevamente.",
    "",
  ]) {
    assert.equal(isLikelyEnglish(text), false, text)
  }
})
