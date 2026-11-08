import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed, openEditor } from "./support/modal-helpers"

const focusedLabel = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement
    return active ? (active.getAttribute("aria-label") ?? active.textContent?.trim().slice(0, 40) ?? "") : ""
  })

test.describe("Manejo del foco en modales y paneles", () => {
  test("al cerrar un modal el foco vuelve al botón que lo abrió", async ({ page }) => {
    await installModalBackend(page)
    await openEditor(page)
    const trigger = page.getByRole("button", { name: "Agregar libro" })
    await trigger.focus()
    await trigger.click()
    await expect(dialogNamed(page, "Nuevo Libro")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialogNamed(page, "Nuevo Libro")).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("el panel de comentarios del lector enfoca su contenido al abrir y devuelve el foco al cerrar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await installModalBackend(page)
    await page.goto("/shared/invitacion-1?token=token-1")
    const trigger = page.getByRole("button", { name: /Comentarios \(/ })
    await trigger.click()
    const sheet = page.getByRole("dialog", { name: "Comentarios" })
    await expect(sheet).toBeVisible()
    await expect
      .poll(() => sheet.evaluate((el) => el.contains(document.activeElement)), { message: "el foco quedó fuera del panel" })
      .toBe(true)
    await page.keyboard.press("Escape")
    await expect(sheet).toBeHidden()
    await expect.poll(() => focusedLabel(page)).toMatch(/Comentarios \(/)
  })

  test("en el celular, el panel que abre la portada del proyecto recibe el foco", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await installModalBackend(page)
    await page.goto(`/projects/${projectId}`)
    await page.getByText("Escribí tu manuscrito").first().click()
    const panel = page.locator("[role=dialog]:visible").first()
    await expect(panel).toBeVisible()
    await expect
      .poll(() => panel.evaluate((el) => el.contains(document.activeElement)), { message: "el foco quedó fuera del panel" })
      .toBe(true)
  })

  test("el historial de versiones devuelve el foco al botón Historial al cerrarse", async ({ page }) => {
    await installModalBackend(page)
    await openEditor(page)
    const trigger = page.getByRole("button", { name: "Historial", exact: true }).first()
    await trigger.focus()
    await trigger.click()
    const sheet = page.getByRole("dialog").first()
    await expect(sheet).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
