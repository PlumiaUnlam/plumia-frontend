import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  PLUMIA_LOADER_DARK_SRC,
  PLUMIA_LOADER_LIGHT_SRC,
  PlumiaLoader,
} from "../components/ui/plumia-loader"

const publicDir = join(import.meta.dirname, "..", "public")

test("los SVG animados del loader existen en public y traen su animación", () => {
  for (const src of [PLUMIA_LOADER_LIGHT_SRC, PLUMIA_LOADER_DARK_SRC]) {
    const path = join(publicDir, src)
    assert.ok(existsSync(path), `falta ${src}`)
    const svg = readFileSync(path, "utf8")
    assert.match(svg, /@keyframes/)
    assert.match(svg, /prefers-reduced-motion/)
  }
})

test("muestra la variante clara y la oscura según el tema", () => {
  const html = renderToStaticMarkup(createElement(PlumiaLoader))
  assert.ok(html.includes("plumia-loader-claro.svg"))
  assert.ok(html.includes("plumia-loader-oscuro.svg"))
  assert.match(html, /dark:hidden/)
  assert.match(html, /hidden[^"]*dark:block/)
})

test("se anuncia como estado de carga accesible sin texto visible", () => {
  const html = renderToStaticMarkup(createElement(PlumiaLoader))
  assert.match(html, /role="status"/)
  assert.match(html, /aria-label="Cargando"/)
})

test("con showLabel muestra el texto y no lo duplica en aria-label", () => {
  const html = renderToStaticMarkup(
    createElement(PlumiaLoader, { label: "Cargando escena…", showLabel: true }),
  )
  assert.ok(html.includes(">Cargando escena…</span>"))
  assert.doesNotMatch(html, /aria-label="Cargando escena…"/)
})
