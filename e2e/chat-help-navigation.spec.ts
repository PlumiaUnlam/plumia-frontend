import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { openEditor } from "./support/modal-helpers"

async function installHelpAction(page: Page, section: string) {
  await installModalBackend(page)
  await page.route(/\/chat\/threads\/[^/]+\/messages(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      json: [{
        id: "help-message",
        threadId: "thread-1",
        role: "assistant",
        content: "Consultá la ayuda para usar esta función.",
        sources: [],
        actions: [{
          id: "help-action",
          kind: "navigation",
          label: "Abrir función indicada",
          description: "Abrir esta sección de PlumIA",
          route: `/projects/${projectId}/editor`,
          section,
        }],
        createdAt: new Date().toISOString(),
      }],
    })
  })
  await openEditor(page)
}

async function followAction(page: Page) {
  await page.getByRole("button", { name: /Chat IA/ }).click()
  await page.getByRole("button", { name: /Abrir función indicada/ }).click()
}

test.describe("Destinos de la ayuda para escritores", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("abre Historial, permite cerrarlo y volver a abrirlo desde el mismo acceso", async ({ page }) => {
    await installHelpAction(page, "editor-history")
    await followAction(page)
    const history = page.getByRole("dialog", { name: "Historial" })
    await expect(history).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(history).toBeHidden()
    await page.getByRole("button", { name: /Abrir función indicada/ }).click()
    await expect(history).toBeVisible()
    await page.keyboard.press("Escape")
    await page.reload()
    await expect(history).toBeHidden()
  })

  test("muestra las propuestas desde Creación pasando a Revisión y abriendo Wiki", async ({ page }) => {
    await installHelpAction(page, "editor-right-review")
    await page.getByRole("button", { name: "Editor, modo Revisión" }).click()
    await page.getByRole("menuitemradio", { name: "Creación", exact: true }).click()
    await expect(page.getByRole("button", { name: "Editor, modo Creación" })).toBeVisible()
    await followAction(page)
    await expect(page.getByRole("button", { name: "Editor, modo Revisión" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Wiki", exact: true })).toHaveAttribute("aria-pressed", "true")
  })
})
