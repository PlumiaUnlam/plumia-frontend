import { expect, test, type Page } from "@playwright/test"

import { INSTRUMENTATION, domCounters, resources } from "./support/browser-resources"
import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed } from "./support/modal-helpers"

/**
 * Pruebas de uso de recursos. Se instrumentan timers, listeners globales y
 * observers del navegador y se comprueba que navegar entre pantallas o abrir
 * y cerrar modales no deje cosas colgadas (efectos sin limpiar).
 */

async function quiet(page: Page) {
  await page.waitForLoadState("load")
  await page.waitForTimeout(900)
}

/** Recorre las pantallas principales navegando con los enlaces de la propia app. */
async function navigationCycle(page: Page) {
  await page.getByRole("link", { name: /Abrir Crónicas del viento/ }).click()
  await page.waitForURL(/\/projects\//)
  await quiet(page)

  await page.getByRole("link", { name: "Estadísticas" }).first().click()
  await page.waitForURL(/\/statistics/)
  await quiet(page)

  await page.getByRole("button", { name: /^Worldbuilding,/ }).click()
  await page.getByRole("menuitem", { name: "Línea temporal" }).click()
  await page.waitForURL(/\/worldbuilding/)
  await quiet(page)

  await page.getByRole("button", { name: /^Tablero,/ }).click()
  await page.getByRole("menuitem", { name: "Matriz" }).click()
  await page.waitForURL(/\/storyboard/)
  await quiet(page)

  await page.getByRole("link", { name: "Volver al dashboard" }).click()
  await page.waitForURL(/\/dashboard/)
  await quiet(page)
}

test.describe("Recursos del navegador", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("navegar entre pantallas no acumula timers, listeners, observers ni nodos", async ({ page }) => {
    test.setTimeout(120_000)
    await page.addInitScript(INSTRUMENTATION)
    await installModalBackend(page)
    const cdp = await page.context().newCDPSession(page)
    await page.goto("/dashboard")
    await quiet(page)

    await navigationCycle(page) // calentamiento: carga de código y cachés
    await page.waitForTimeout(500)
    const before = await resources(page)
    const beforeDom = await domCounters(cdp)

    for (let i = 0; i < 3; i++) await navigationCycle(page)
    await page.waitForTimeout(500)
    const after = await resources(page)
    const afterDom = await domCounters(cdp)

    const report = JSON.stringify({ before, after, beforeDom, afterDom })
    console.log("RECURSOS", report)
    expect(after.intervals, "intervalos colgados " + report).toBeLessThanOrEqual(before.intervals + 1)
    expect(after.observers, "observers sin desconectar " + report).toBeLessThanOrEqual(before.observers + 2)
    expect(after.listeners, "listeners globales acumulados " + report).toBeLessThanOrEqual(before.listeners + 4)
    expect(after.timeouts, "timeouts pendientes " + report).toBeLessThanOrEqual(before.timeouts + 6)
    expect(afterDom.nodes, "nodos del DOM " + report).toBeLessThanOrEqual(beforeDom.nodes * 1.25 + 300)
    expect(afterDom.jsEventListeners, "listeners del DOM " + report).toBeLessThanOrEqual(beforeDom.jsEventListeners * 1.3 + 60)
    expect(afterDom.heapMb, "memoria JS " + report).toBeLessThanOrEqual(beforeDom.heapMb + 20)
  })

  test("abrir y cerrar un modal 15 veces no deja nada colgado", async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript(INSTRUMENTATION)
    await installModalBackend(page)
    const cdp = await page.context().newCDPSession(page)
    await page.goto("/projects/" + projectId + "/storyboard")
    await quiet(page)

    const cycle = async () => {
      await page.getByRole("button", { name: "Nueva tarjeta" }).first().click()
      await expect(dialogNamed(page, "Nueva Tarjeta")).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(page.locator('[role="dialog"]')).toHaveCount(0)
    }

    for (let i = 0; i < 3; i++) await cycle()
    await page.waitForTimeout(400)
    const before = await resources(page)
    const beforeDom = await domCounters(cdp)

    for (let i = 0; i < 15; i++) await cycle()
    await page.waitForTimeout(400)
    const after = await resources(page)
    const afterDom = await domCounters(cdp)

    const report = JSON.stringify({ before, after, beforeDom, afterDom })
    console.log("RECURSOS", report)
    expect(after.listeners, "listeners globales " + report).toBeLessThanOrEqual(before.listeners + 1)
    expect(after.intervals, "intervalos " + report).toBeLessThanOrEqual(before.intervals)
    expect(after.observers, "observers " + report).toBeLessThanOrEqual(before.observers + 1)
    expect(afterDom.nodes, "nodos " + report).toBeLessThanOrEqual(beforeDom.nodes + 120)
    expect(await page.locator('[data-slot="dialog-overlay"]').count()).toBe(0)
  })

  test("una pantalla quieta no dispara más pedidos de red de los esperables", async ({ page }) => {
    test.setTimeout(120_000)
    await installModalBackend(page)

    const screens = [
      "/dashboard",
      "/projects/" + projectId + "/editor",
      "/projects/" + projectId + "/worldbuilding",
      "/projects/" + projectId + "/worldbuilding?tab=timeline",
      "/projects/" + projectId + "/storyboard",
      "/projects/" + projectId + "/statistics",
    ]

    for (const url of screens) {
      const counts = new Map<string, number>()
      const onRequest = (request: { url: () => string; method: () => string }) => {
        const target = new URL(request.url())
        if (target.port !== "3000") return
        const key = request.method() + " " + target.pathname + target.search
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      page.on("request", onRequest)
      await page.goto(url)
      await page.waitForTimeout(7000)
      page.off("request", onRequest)

      const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
      const total = entries.reduce((sum, [, n]) => sum + n, 0)
      const summary = url + " → " + total + " pedidos; más repetidos: " + JSON.stringify(entries.slice(0, 4))
      expect(entries[0]?.[1] ?? 0, "pedido repetido " + summary).toBeLessThanOrEqual(3)
      expect(total, "demasiados pedidos " + summary).toBeLessThanOrEqual(60)
    }
  })
})
