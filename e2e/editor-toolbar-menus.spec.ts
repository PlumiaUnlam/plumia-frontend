import { expect, test } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import { openEditor, openScene } from "./support/modal-helpers"

const TOOLBAR_MENUS = [
  "Abrir biblioteca de viñetas",
  "Abrir biblioteca de numeración",
  "Más formato",
  "Resaltado y color",
  "Cambiar color de texto",
]

const SIZES = [
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1280, height: 600 },
]

test.describe("Desplegables de la barra del editor", () => {
  for (const size of SIZES) {
    test("quedan dentro de la pantalla a " + size.width + "x" + size.height, async ({ page }) => {
      test.setTimeout(60_000)
      await page.setViewportSize(size)
      await installModalBackend(page)
      await openEditor(page)
      await openScene(page)
      await page.getByRole("button", { name: "Mostrar herramientas" }).click()

      for (const name of TOOLBAR_MENUS) {
        await page.getByRole("button", { name }).first().click()
        const menu = page.getByRole("menu").last()
        await expect(menu).toBeVisible()
        // Se espera a que termine la animación de apertura antes de medir.
        await menu.evaluate((el) =>
          Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
        )
        const rect = await menu.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
        })
        expect(rect.top, name + ": arriba").toBeGreaterThanOrEqual(-1)
        expect(rect.left, name + ": izquierda").toBeGreaterThanOrEqual(-1)
        expect(rect.bottom, name + ": abajo").toBeLessThanOrEqual(size.height + 1)
        expect(rect.right, name + ": derecha").toBeLessThanOrEqual(size.width + 1)
        await page.keyboard.press("Escape")
        await expect(page.getByRole("menu")).toBeHidden()
      }
    })
  }
})
