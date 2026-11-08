import assert from "node:assert/strict"

import { scoreEntityMatch, searchEntities } from "../lib/entity-search"

interface Item {
  name: string
  aliases?: string[]
  description?: string
}

const fields = (item: Item) => ({
  name: item.name,
  aliases: item.aliases,
  category: "Personaje",
  content: [item.description],
})

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

const items: Item[] = [
  { name: "Gepetto", description: "Carpintero que talló a Pinocho" },
  { name: "Hada Azul", aliases: ["Pinocho protector"], description: "Ayuda a Pinocho" },
  { name: "Pinocho", description: "Muñeco de madera, protagonista" },
  { name: "Pepito Grillo", description: "Conciencia de Pinocho" },
  { name: "Aventuras de Pinocho", description: "Libro" },
]

check("el nombre exacto va primero aunque aparezca después en la lista", () => {
  const result = searchEntities(items, "pinocho", fields).map((item) => item.name)
  assert.equal(result[0], "Pinocho")
})

check("orden: nombre exacto, nombre que contiene, alias y por último solo contenido", () => {
  const result = searchEntities(items, "Pinocho", fields).map((item) => item.name)
  assert.deepEqual(result, ["Pinocho", "Aventuras de Pinocho", "Hada Azul", "Gepetto", "Pepito Grillo"])
})

check("ignora mayúsculas y acentos", () => {
  const result = searchEntities([{ name: "Pínocho" }], "PINOCHO", fields)
  assert.equal(result.length, 1)
})

check("empieza con la consulta antes que contiene", () => {
  const list: Item[] = [{ name: "El gran Luis" }, { name: "Luisa" }]
  assert.deepEqual(searchEntities(list, "lui", fields).map((i) => i.name), ["Luisa", "El gran Luis"])
})

check("sin coincidencias devuelve vacío y sin consulta conserva el orden", () => {
  assert.deepEqual(searchEntities(items, "zzz", fields), [])
  assert.deepEqual(searchEntities(items, "  ", fields), items)
})

check("a igual relevancia conserva el orden original", () => {
  const list: Item[] = [{ name: "Ana Sol" }, { name: "Ana Luna" }]
  assert.deepEqual(searchEntities(list, "ana", fields).map((i) => i.name), ["Ana Sol", "Ana Luna"])
})

check("scoreEntityMatch devuelve null si no coincide", () => {
  assert.equal(scoreEntityMatch({ name: "Ana" }, "xyz"), null)
})

console.log(`entity-search: ${passed} pruebas`)
