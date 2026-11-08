import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { alertNamed, dialogNamed } from "./support/modal-helpers"

/** true si, en el centro del elemento, el punto más alto de la pantalla es el propio elemento. */
async function isOnTop(locator: Locator) {
  await expect(locator).toBeVisible()
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const top = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    )
    return top !== null && element.contains(top)
  })
}

async function openEntityEditor(page: Page) {
  await page.goto("/projects/" + projectId + "/worldbuilding")
  await expect(page.getByRole("heading", { name: "Worldbuilding" })).toBeVisible()
  await page.getByText("Tomás Reyes", { exact: true }).first().click()
  await page.getByRole("button", { name: "Editar", exact: true }).click()
  const dialog = dialogNamed(page, "Editar Entidad")
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe("Capas de modales y desplegables", () => {
  test("la confirmación de borrar imagen se ve por encima del modal Editar Entidad", async ({ page }) => {
    await installModalBackend(page)
    // Se registra después del backend simulado para que tenga prioridad.
    await page.route(/\/publishing\/images\/tomas-reyes$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "img-1",
            entityId: "tomas-reyes",
            prompt: "retrato",
            imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            imageType: "PRIMARY",
            isPrimary: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ]),
      }),
    )
    const dialog = await openEntityEditor(page)

    await dialog.getByRole("button", { name: "Eliminar imagen" }).click({ force: true })
    const alert = alertNamed(page, "Eliminar imagen")
    await expect(alert).toBeVisible()
    // Mientras hay otro modal encima, Radix marca este como aria-hidden: se busca por CSS.
    const editor = page.locator('[data-slot="dialog-content"]', { hasText: "Editar Entidad" })
    await expect(editor).toBeVisible()
    expect(await isOnTop(alert.getByRole("button", { name: "Cancelar" }))).toBe(true)

    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    await expect(editor).toBeVisible()
  })

  test("los desplegables de un modal sin capa también quedan por encima", async ({ page }) => {
    await installModalBackend(page)
    await page.goto("/projects/" + projectId + "/worldbuilding?tab=relationships")
    await expect(page.getByRole("heading", { name: "Worldbuilding" })).toBeVisible()

    await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    const dialog = dialogNamed(page, "Nueva Relación")
    await dialog.locator("#relation-source").click()
    expect(await isOnTop(page.getByRole("option", { name: "Tomás Reyes" }))).toBe(true)

    await page.getByRole("option", { name: "Tomás Reyes" }).click()
    await expect(page.getByRole("option", { name: "Tomás Reyes" })).toBeHidden()
    await expect(dialog).toBeVisible()
  })
})

test.describe("Escape dentro de un modal con lista abierta", () => {
  test("Escape cierra solo la lista de entidades y deja abierto «Nueva nota»", async ({ page }) => {
    await installModalBackend(page)
    await page.goto("/projects/" + projectId + "/storyboard")
    await page.getByRole("button", { name: "Matriz" }).click()
    await page.getByRole("button", { name: /Nueva nota/ }).first().click()

    const editor = page.locator('[data-slot="dialog-content"]', { hasText: "Nueva nota" })
    await expect(editor).toBeVisible()
    await editor.getByRole("combobox").first().click()
    await expect(page.getByRole("listbox")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(page.getByRole("listbox")).toBeHidden()
    await expect(editor).toBeVisible()

    // Un segundo Escape sí cierra el modal.
    await page.keyboard.press("Escape")
    await expect(editor).toBeHidden()
  })
})

test.describe("Escape con la lista abierta desde su botón", () => {
  test("Escape cierra solo la lista abierta con el botón «Mostrar opciones»", async ({ page }) => {
    await installModalBackend(page)
    await page.goto("/projects/" + projectId + "/storyboard")
    await page.getByRole("button", { name: "Matriz" }).click()
    await page.getByRole("button", { name: /Nueva nota/ }).first().click()

    const editor = page.locator('[data-slot="dialog-content"]', { hasText: "Nueva nota" })
    await expect(editor).toBeVisible()
    await editor.getByRole("button", { name: "Mostrar opciones" }).first().click()
    await expect(page.getByRole("listbox")).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(page.getByRole("listbox")).toBeHidden()
    await expect(editor).toBeVisible()
  })
})
