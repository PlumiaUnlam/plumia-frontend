import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import {
  VIEWPORTS,
  auditPage,
  exploreTriggers,
  makeCollector,
  report,
  settle,
  watchRuntime,
  type Theme,
  type ViewportSpec,
} from "./support/ui-audit-core"

/**
 * Auditoría genérica de interfaz. Recorre cada pantalla en varios tamaños y
 * temas, abre todo lo que se puede abrir (modales, menús, listas) y revisa:
 * desbordes, texto cortado, solapes, elementos tapados, nombres accesibles,
 * foco, cierre con Escape / X / Cancelar y errores de consola.
 *
 * Los hallazgos "duros" hacen fallar el test; los "blandos" (táctil pequeño,
 * foco perdido, clic afuera) solo se guardan en test-results/ui-audit/.
 */

// Es larga (≈13 min): se corre aparte con `pnpm test:ui-audit`.
test.skip(!process.env.UI_AUDIT, "Auditoría larga: usar pnpm test:ui-audit")

const base = `/projects/${projectId}`

const APP_PAGES = [
  { name: "dashboard", url: "/dashboard" },
  { name: "hub", url: base },
  { name: "editor", url: `${base}/editor` },
  { name: "worldbuilding-wiki", url: `${base}/worldbuilding` },
  { name: "worldbuilding-relaciones", url: `${base}/worldbuilding?tab=relationships` },
  { name: "worldbuilding-linea", url: `${base}/worldbuilding?tab=timeline` },
  { name: "worldbuilding-resumenes", url: `${base}/worldbuilding?tab=summaries` },
  { name: "tablero", url: `${base}/storyboard` },
  { name: "estadisticas", url: `${base}/statistics` },
  { name: "compartidos", url: `${base}/shares` },
  { name: "lector-compartido", url: "/shared/invitacion-1?token=token-1" },
]

const combos = VIEWPORTS.flatMap((viewport) =>
  (["light", "dark"] as Theme[])
    .filter((theme) => theme === "light" || viewport.name === "movil-375" || viewport.name === "escritorio-1440")
    .map((theme) => ({ viewport, theme })),
)

async function runPageAudit(
  page: Page,
  entry: { name: string; url: string },
  viewport: ViewportSpec,
  theme: Theme,
  prefix: string,
  longText: boolean,
) {
  const collector = makeCollector()
  watchRuntime(page, collector)
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript(
    ({ value, rootFontPx }) => {
      window.localStorage.setItem("plumia-theme", value)
      if (rootFontPx) {
        document.addEventListener("DOMContentLoaded", () => {
          const style = document.createElement("style")
          style.textContent = `html { font-size: ${rootFontPx}px !important; }`
          document.head.appendChild(style)
        })
      }
    },
    { value: theme, rootFontPx: viewport.rootFontPx },
  )
  await installModalBackend(page, { longText })

  await page.goto(entry.url)
  await settle(page)
  await auditPage(page, collector, "carga inicial", viewport.touch)
  await exploreTriggers(page, entry.url, collector, viewport.touch)

  const failures = report(`${prefix}${viewport.name}-${theme}-${entry.name}`, collector)
  expect(failures, failures.join("\n")).toEqual([])
}

for (const { viewport, theme } of combos) {
  test.describe(`Auditoría UI ${viewport.name} ${theme}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const entry of APP_PAGES) {
      test(`${entry.name}`, async ({ page }) => {
        test.setTimeout(420_000)
        await runPageAudit(page, entry, viewport, theme, "", false)
      })
    }
  })
}

// Textos larguísimos: nada debe salirse de su caja ni empujar el diseño.
for (const viewport of VIEWPORTS.filter((v) =>
  ["movil-320", "tablet-768", "escritorio-1440"].includes(v.name),
)) {
  test.describe(`Auditoría UI textos largos ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const entry of APP_PAGES.filter((page) => page.name !== "lector-compartido")) {
      test(`${entry.name}`, async ({ page }) => {
        test.setTimeout(420_000)
        await runPageAudit(page, entry, viewport, "light", "largo-", true)
      })
    }
  })
}

test.describe("Auditoría UI páginas públicas", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const viewport of VIEWPORTS) {
    for (const entry of [
      { name: "login", url: "/login" },
      { name: "registro", url: "/register" },
      { name: "recuperar", url: "/forgot-password" },
      { name: "terminos", url: "/terminos-y-condiciones" },
    ]) {
      test(`${entry.name} ${viewport.name}`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const collector = makeCollector()
        watchRuntime(page, collector)
        await page.goto(entry.url)
        await settle(page)
        await auditPage(page, collector, "carga inicial", viewport.touch)
        await exploreTriggers(page, entry.url, collector, viewport.touch)
        const failures = report(`publica-${viewport.name}-${entry.name}`, collector)
        expect(failures, failures.join("\n")).toEqual([])
      })
    }
  }
})
