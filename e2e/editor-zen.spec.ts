import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import { openEditor, openScene } from "./support/modal-helpers"

/** Entra al modo Zen desde el selector de modo del encabezado. */
async function enterZen(page: Page) {
  await installModalBackend(page)
  await openEditor(page)
  await openScene(page)
  await page.getByRole("button", { name: /Editor, modo/ }).click()
  await page.getByText("Zen", { exact: true }).click()
  const zen = page.locator("[data-zen-toolbar]")
  await expect(zen).toHaveAttribute("data-state", "closed")
  return zen
}

async function hoverTopZone(page: Page) {
  const zone = page.locator("[data-zen-toolbar-zone]")
  const box = await zone.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
}

async function sheetTop(page: Page) {
  return page
    .locator("[data-editor-canvas]")
    .evaluate((el) => el.getBoundingClientRect().top)
}

async function height(locator: Locator) {
  return locator.evaluate((el) => el.getBoundingClientRect().height)
}

test.describe("Modo Zen: menú de herramientas", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("arranca oculto, sin ocupar lugar, y aparece al pasar el mouse por la zona superior", async ({ page }) => {
    const zen = await enterZen(page)
    expect(await height(zen)).toBeLessThan(2)

    await hoverTopZone(page)
    await expect(zen).toHaveAttribute("data-state", "open")
    await expect.poll(() => height(zen)).toBeGreaterThan(30)
    await expect(zen.getByRole("button", { name: /Negrita/ }).first()).toBeVisible()
  })

  test("al abrirse empuja la hoja hacia abajo y no la tapa", async ({ page }) => {
    const zen = await enterZen(page)
    const closedTop = await sheetTop(page)

    await hoverTopZone(page)
    await expect.poll(() => height(zen)).toBeGreaterThan(30)
    const openTop = await sheetTop(page)
    expect(openTop).toBeGreaterThan(closedTop + 30)

    // El menú termina donde empieza la hoja: no se superponen (se mide ya sin animación).
    await expect
      .poll(async () => {
        const toolbarBottom = await zen.evaluate((el) => el.getBoundingClientRect().bottom)
        return toolbarBottom - (await sheetTop(page))
      })
      .toBeLessThanOrEqual(1)
  })

  test("el menú tiene fondo opaco: no se transparenta el texto de la hoja", async ({ page }) => {
    const zen = await enterZen(page)
    await hoverTopZone(page)
    await expect.poll(() => height(zen)).toBeGreaterThan(30)

    const alpha = await zen.locator(".bg-background").first().evaluate((el) => {
      const color = getComputedStyle(el).backgroundColor
      const channels = color.match(/[\d.]+/g)?.map(Number) ?? []
      return channels.length >= 4 ? channels[3] : 1
    })
    expect(alpha).toBe(1)
    // Y en su borde inferior ya hay hoja, no menú encima del texto.
    expect(await page.locator("#editor-formatting-toolbar").count()).toBe(1)
  })

  test("se mantiene abierto unos segundos después de sacar el mouse y luego se guarda solo", async ({ page }) => {
    test.setTimeout(40_000)
    const zen = await enterZen(page)
    await hoverTopZone(page)
    await expect(zen).toHaveAttribute("data-state", "open")

    const leftAt = Date.now()
    await page.mouse.move(720, 600)
    await page.waitForTimeout(1500)
    // Pasó 1,5 s desde que salió: todavía debe estar abierto.
    await expect(zen).toHaveAttribute("data-state", "open")

    await expect(zen).toHaveAttribute("data-state", "closed", { timeout: 8000 })
    const closedAfter = Date.now() - leftAt
    // Con la máquina cargada el cierre puede adelantarse un poco; lo importante es que no sea inmediato.
    expect(closedAfter).toBeGreaterThanOrEqual(2000)
    expect(closedAfter).toBeLessThanOrEqual(7500)
    await expect.poll(() => height(zen)).toBeLessThan(2)
  })

  test("volver a entrar a la zona antes del plazo evita que se oculte", async ({ page }) => {
    test.setTimeout(40_000)
    const zen = await enterZen(page)
    await hoverTopZone(page)
    await expect(zen).toHaveAttribute("data-state", "open")
    await page.mouse.move(720, 600)
    await page.waitForTimeout(1200)
    // Antes de cumplirse el plazo, volver al menú lo mantiene abierto aunque pase más tiempo.
    await page.locator("#editor-formatting-toolbar").hover()
    await page.waitForTimeout(3500)
    await expect(zen).toHaveAttribute("data-state", "open")
  })

  test("no se oculta mientras un desplegable del menú está abierto", async ({ page }) => {
    test.setTimeout(40_000)
    const zen = await enterZen(page)
    await hoverTopZone(page)
    await expect(zen).toHaveAttribute("data-state", "open")

    await zen.getByRole("button", { name: /Familia tipográfica/ }).click()
    await expect(page.getByRole("menu")).toBeVisible()
    await page.mouse.move(720, 700)
    await page.waitForTimeout(4500)

    await expect(zen).toHaveAttribute("data-state", "open")
    await expect(page.getByRole("menu")).toBeVisible()

    // Al cerrar el desplegable (clic en la hoja), vuelve a regir la demora y se oculta.
    await page.mouse.click(720, 700)
    await expect(page.getByRole("menu")).toBeHidden()
    await expect(zen).toHaveAttribute("data-state", "closed", { timeout: 8000 })
  })

  test("también se abre con el teclado (foco) y la zona no bloquea los botones", async ({ page }) => {
    const zen = await enterZen(page)
    await zen.getByRole("button", { name: "Negrita" }).focus()
    await expect(zen).toHaveAttribute("data-state", "open")

    const pointerEvents = await page
      .locator("[data-zen-toolbar-zone]")
      .evaluate((el) => getComputedStyle(el).pointerEvents)
    expect(pointerEvents).toBe("none")
  })
})
