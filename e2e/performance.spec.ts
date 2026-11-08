import { expect, test, type Page } from "@playwright/test"

import { INSTRUMENTATION, domCounters, resources } from "./support/browser-resources"
import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed, openEditor, openScene } from "./support/modal-helpers"

/**
 * Rendimiento y comportamiento oculto: pedidos repetidos al servidor, actividad
 * en reposo, bloqueos al escribir, y modales que se abren y cierran muchas veces
 * sin dejar nada colgado. Los umbrales son holgados a propósito (corre en
 * paralelo con otros tests) pero atrapan los errores típicos: efectos encadenados
 * que vuelven a pedir lo mismo, intervalos de más y fugas.
 */

const base = `/projects/${projectId}`

const PAGES = [
  { name: "dashboard", url: "/dashboard" },
  { name: "hub del proyecto", url: base },
  { name: "editor", url: `${base}/editor` },
  { name: "worldbuilding (entidades)", url: `${base}/worldbuilding` },
  { name: "worldbuilding (relaciones)", url: `${base}/worldbuilding?tab=relationships` },
  { name: "worldbuilding (línea temporal)", url: `${base}/worldbuilding?tab=timeline` },
  { name: "worldbuilding (resúmenes)", url: `${base}/worldbuilding?tab=summaries` },
  { name: "tablero (tarjetas)", url: `${base}/storyboard` },
  { name: "tablero (matriz)", url: `${base}/storyboard?view=matrix` },
  { name: "estadísticas", url: `${base}/statistics` },
  { name: "compartidos", url: `${base}/shares` },
]

const API = /^https?:\/\/[^/]+:3000\//

function trackApi(page: Page) {
  const counts = new Map<string, number>()
  page.on("request", (request) => {
    if (!API.test(request.url())) return
    const url = new URL(request.url())
    const key = `${request.method()} ${url.pathname}${url.search}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return {
    counts,
    total: () => Array.from(counts.values()).reduce((sum, value) => sum + value, 0),
    max: () => Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? ["", 0],
    reset: () => counts.clear(),
  }
}

test.describe("Pedidos al servidor", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const entry of PAGES) {
    test(`${entry.name}: no repite el mismo pedido ni dispara una ráfaga al cargar`, async ({ page }) => {
      test.setTimeout(60_000)
      await installModalBackend(page)
      const api = trackApi(page)
      await page.goto(entry.url)
      await page.waitForLoadState("load")
      await page.waitForTimeout(2500)

      const [worstKey, worstCount] = api.max()
      const report = JSON.stringify(Object.fromEntries(api.counts))
      console.log(`PEDIDOS ${entry.name}: total=${api.total()} peor=${worstKey} x${worstCount}`)
      expect(worstCount, `«${worstKey}» se pidió ${worstCount} veces: ${report}`).toBeLessThanOrEqual(3)
      expect(api.total(), `demasiados pedidos al cargar: ${report}`).toBeLessThanOrEqual(45)
    })

    test(`${entry.name}: en reposo no hay pedidos constantes`, async ({ page }) => {
      test.setTimeout(60_000)
      await installModalBackend(page)
      const api = trackApi(page)
      await page.goto(entry.url)
      await page.waitForLoadState("load")
      await page.waitForTimeout(2500)

      api.reset()
      await page.waitForTimeout(5000)
      const report = JSON.stringify(Object.fromEntries(api.counts))
      expect(api.total(), `pedidos con la pantalla quieta: ${report}`).toBeLessThanOrEqual(3)
    })
  }
})

test.describe("Fluidez al escribir", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("escribir en el editor no deja la interfaz bloqueada", async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript(() => {
      const blocks: number[] = []
      ;(window as unknown as { __longTasks: number[] }).__longTasks = blocks
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) blocks.push(entry.duration)
        }).observe({ entryTypes: ["longtask"] })
      } catch {
        // El navegador no expone longtask: el test no puede medir y se omite abajo.
      }
    })
    await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    const editor = page.locator(".ProseMirror")
    await editor.click()
    await page.keyboard.press("ControlOrMeta+End")
    await page.evaluate(() => ((window as unknown as { __longTasks: number[] }).__longTasks.length = 0))

    const text = "El viento traía olor a sal y a tinta vieja mientras la ciudad dormía. ".repeat(4)
    await page.keyboard.type(text, { delay: 8 })
    await page.waitForTimeout(600)

    const tasks = await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks)
    const worst = Math.max(0, ...tasks)
    const blocked = tasks.reduce((sum, value) => sum + Math.max(0, value - 50), 0)
    console.log(`ESCRITURA tareas largas=${tasks.length} peor=${Math.round(worst)}ms bloqueo=${Math.round(blocked)}ms`)
    expect(worst, "una tarea bloqueó la pantalla más de 600 ms mientras se escribía").toBeLessThan(600)
    expect(blocked, "bloqueo acumulado al escribir").toBeLessThan(2500)
    await expect(editor).toContainText("olor a sal y a tinta vieja")
  })
})

test.describe("Guardado automático", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("escribir seguido agrupa los guardados y no manda uno por tecla", async ({ page }) => {
    test.setTimeout(120_000)
    await installModalBackend(page)
    const saves: string[] = []
    page.on("request", (request) => {
      const { pathname } = new URL(request.url())
      if (API.test(request.url()) && request.method() !== "GET" && /^\/scenes\/[^/]+$/.test(pathname)) {
        saves.push(request.method())
      }
    })
    await openEditor(page)
    await openScene(page)
    await page.locator(".ProseMirror").click()
    await page.keyboard.press("ControlOrMeta+End")

    const text = "Escribo sin parar para ver cuántos guardados se disparan. ".repeat(3)
    await page.keyboard.type(text, { delay: 15 })

    // El guardado espera una pausa de escritura (30 s): al poco rato todavía no se mandó nada.
    await page.waitForTimeout(3000)
    expect(saves.length, `se guardó ${saves.length} veces mientras se escribía`).toBe(0)

    // Pasada la pausa se manda un único guardado con todo lo escrito.
    await expect.poll(() => saves.length, { timeout: 45_000, intervals: [1000] }).toBeGreaterThanOrEqual(1)
    await page.waitForTimeout(2000)
    console.log(`AUTOGUARDADO teclas=${text.length} guardados=${saves.length}`)
    expect(saves.length, `se mandaron ${saves.length} guardados para ${text.length} teclas`).toBeLessThanOrEqual(2)
  })
})

test.describe("Modales abiertos y cerrados muchas veces", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  const CYCLES: Array<{ name: string; setup: (page: Page) => Promise<void>; open: (page: Page) => Promise<void>; title: string }> = [
    {
      name: "Configuración",
      title: "Configuración",
      setup: async (page) => {
        await page.goto("/dashboard")
      },
      open: async (page) => {
        await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
        await page.getByRole("menuitem", { name: "Configuración" }).click()
      },
    },
    {
      name: "Exportar obra",
      title: "Exportar un libro",
      setup: async (page) => {
        await openEditor(page)
      },
      open: async (page) => {
        await page.getByRole("button", { name: "Exportar obra" }).first().click()
      },
    },
    {
      name: "Nueva entidad",
      title: "Nueva Entidad",
      setup: async (page) => {
        await page.goto(`${base}/worldbuilding`)
      },
      open: async (page) => {
        await page.getByRole("button", { name: /Nueva Entidad/ }).first().click()
      },
    },
    {
      name: "Nueva relación",
      title: "Nueva Relación",
      setup: async (page) => {
        await page.goto(`${base}/worldbuilding?tab=relationships`)
      },
      open: async (page) => {
        await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
      },
    },
  ]

  for (const cycle of CYCLES) {
    test(`${cycle.name}: 12 aperturas no acumulan nodos, listeners ni timers`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.addInitScript(INSTRUMENTATION)
      await installModalBackend(page)
      const cdp = await page.context().newCDPSession(page)
      await cycle.setup(page)
      await page.waitForLoadState("load")
      await page.waitForTimeout(900)

      const once = async () => {
        await cycle.open(page)
        await expect(dialogNamed(page, cycle.title)).toBeVisible()
        await page.waitForTimeout(250)
        await page.keyboard.press("Escape")
        await expect(page.locator('[role="dialog"]')).toHaveCount(0)
      }

      for (let i = 0; i < 3; i++) await once()
      await page.waitForTimeout(400)
      const before = await resources(page)
      const beforeDom = await domCounters(cdp)

      for (let i = 0; i < 12; i++) await once()
      await page.waitForTimeout(500)
      const after = await resources(page)
      const afterDom = await domCounters(cdp)

      const report = JSON.stringify({ before, after, beforeDom, afterDom })
      console.log(`CICLOS ${cycle.name}`, report)
      expect(after.listeners, "listeners globales " + report).toBeLessThanOrEqual(before.listeners + 1)
      expect(after.intervals, "intervalos " + report).toBeLessThanOrEqual(before.intervals)
      expect(after.observers, "observers " + report).toBeLessThanOrEqual(before.observers + 1)
      expect(afterDom.nodes, "nodos " + report).toBeLessThanOrEqual(beforeDom.nodes + 150)
      expect(afterDom.heapMb, "memoria JS " + report).toBeLessThanOrEqual(beforeDom.heapMb + 15)
      expect(await page.locator('[data-slot="dialog-overlay"]').count()).toBe(0)
    })
  }
})
