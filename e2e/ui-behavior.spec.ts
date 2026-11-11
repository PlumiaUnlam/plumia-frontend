import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed, openEditor } from "./support/modal-helpers"

const base = "/projects/" + projectId

async function openNewCard(page: Page) {
  await page.goto(base + "/storyboard")
  await page.getByRole("button", { name: "Nueva tarjeta" }).first().click()
  const dialog = dialogNamed(page, "Nueva Tarjeta")
  await expect(dialog).toBeVisible()
  return dialog
}

async function openNewEntity(page: Page) {
  await page.goto(base + "/worldbuilding")
  await page.getByRole("button", { name: /Nueva Entidad/ }).first().click()
  const dialog = dialogNamed(page, "Nueva Entidad")
  await expect(dialog).toBeVisible()
  return dialog
}

async function insideDialog(dialog: Locator) {
  return dialog.evaluate((root) => {
    const active = document.activeElement
    return !!active && root.contains(active)
  })
}

test.describe("Foco y teclado dentro de los modales", () => {
  test("el foco inicial cae dentro del modal y Tab no escapa de él", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openNewEntity(page)
    expect(await insideDialog(dialog)).toBe(true)

    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab")
      expect(await insideDialog(dialog), "Tab " + (i + 1) + " sacó el foco del modal").toBe(true)
    }
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Shift+Tab")
      expect(await insideDialog(dialog), "Shift+Tab " + (i + 1) + " sacó el foco del modal").toBe(true)
    }
  })

  test("al cerrar con Escape el foco vuelve al botón que abrió el modal", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(base + "/storyboard")
    const trigger = page.getByRole("button", { name: "Nueva tarjeta" }).first()
    await trigger.click()
    const dialog = dialogNamed(page, "Nueva Tarjeta")
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("con un modal abierto la página de fondo no se desplaza", async ({ page }) => {
    await installModalBackend(page)
    await page.setViewportSize({ width: 1440, height: 500 })
    await page.goto(base + "/worldbuilding")
    await page.getByRole("button", { name: /Nueva Entidad/ }).first().click()
    await expect(dialogNamed(page, "Nueva Entidad")).toBeVisible()

    const lock = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      return { overflow: body.overflow, pointerEvents: body.pointerEvents }
    })
    // Radix bloquea el scroll y los clics de la página mientras el modal está abierto.
    expect(lock.overflow === "hidden" || lock.pointerEvents === "none").toBe(true)
  })

  test("Enter envía un formulario simple una sola vez y Escape no envía nada", async ({ page }) => {
    const backend = await installModalBackend(page)
    const dialog = await openNewCard(page)
    await dialog.getByLabel("Título de la escena *").fill("Una escena")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    expect(backend.callsTo("POST", /storyboard-cards$/)).toHaveLength(0)
  })
})

test.describe("Estado de los modales al reabrirlos", () => {
  test("«Nueva tarjeta»: lo escrito y cancelado no reaparece", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openNewCard(page)
    await dialog.getByLabel("Título de la escena *").fill("Borrador que se descarta")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole("button", { name: "Nueva tarjeta" }).first().click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Título de la escena *")).toHaveValue("")
    await expect(dialog.getByRole("button", { name: "Crear tarjeta" })).toBeDisabled()
  })

  test("«Nueva entidad»: nombre, descripción y etiquetas se limpian al reabrir", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openNewEntity(page)
    await dialog.locator("#entity-name").fill("Entidad descartada")
    await dialog.locator("#entity-description").fill("Texto que no debe quedar")
    await dialog.getByPlaceholder("Agregar etiqueta...").fill("etiqueta")
    await dialog.getByRole("button", { name: "Agregar" }).click()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole("button", { name: /Nueva Entidad/ }).first().click()
    await expect(dialog).toBeVisible()
    await expect(dialog.locator("#entity-name")).toHaveValue("")
    await expect(dialog.locator("#entity-description")).toHaveValue("")
    await expect(dialog.getByText("etiqueta", { exact: true })).toHaveCount(0)
  })

  test("«Nueva relación»: las entidades elegidas no se arrastran a la próxima apertura", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(base + "/worldbuilding?tab=relationships")
    await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    const dialog = dialogNamed(page, "Nueva Relación")
    await dialog.locator("#relation-source").click()
    await page.getByRole("option", { name: "Tomás Reyes" }).click()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    await expect(dialog.locator("#relation-source")).toContainText("Seleccionar entidad")
    await expect(dialog.getByRole("button", { name: "Crear relación" })).toBeDisabled()
  })
})

test.describe("Acciones repetidas", () => {
  test("doble clic en «Crear tarjeta» crea una sola tarjeta", async ({ page }) => {
    const backend = await installModalBackend(page)
    const dialog = await openNewCard(page)
    await dialog.getByLabel("Título de la escena *").fill("Una sola vez")
    await dialog.getByRole("button", { name: "Crear tarjeta" }).dblclick().catch(() => undefined)
    await expect(dialog).toBeHidden()
    await page.waitForTimeout(400)
    expect(backend.callsTo("POST", /storyboard-cards$/)).toHaveLength(1)
  })

  test("doble clic en «Crear entidad» crea una sola entidad", async ({ page }) => {
    const backend = await installModalBackend(page)
    const dialog = await openNewEntity(page)
    await dialog.locator("#entity-name").fill("Solo una")
    await dialog.getByRole("button", { name: "Crear entidad" }).dblclick().catch(() => undefined)
    await expect(dialog).toBeHidden()
    await page.waitForTimeout(400)
    expect(backend.callsTo("POST", /\/knowledge\/entities$/)).toHaveLength(1)
  })

  test("con el servidor lento, el botón queda bloqueado y el modal no se puede cerrar a medias", async ({ page }) => {
    const backend = await installModalBackend(page)
    backend.setMutationDelay(1500)
    const dialog = await openNewCard(page)
    await dialog.getByLabel("Título de la escena *").fill("Lenta")
    const submit = dialog.getByRole("button", { name: "Crear tarjeta" })
    await submit.click()

    await expect(submit).toBeDisabled()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeVisible()

    await expect(dialog).toBeHidden({ timeout: 6000 })
    expect(backend.callsTo("POST", /storyboard-cards$/)).toHaveLength(1)
  })
})

test.describe("Cierres anidados", () => {
  test("Editar entidad: cancelar la confirmación de borrar una imagen deja abierto el modal", async ({ page }) => {
    await installModalBackend(page)
    await page.route(/\/publishing\/images\/tomas-reyes$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "img-1",
            entityId: "tomas-reyes",
            prompt: "retrato",
            imageUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            imageType: "PRIMARY",
            isPrimary: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ]),
      }),
    )
    await page.goto(base + "/worldbuilding")
    await page.getByText("Tomás Reyes", { exact: true }).first().click()
    await page.getByRole("button", { name: "Editar", exact: true }).click()
    const editor = page.locator('[data-slot="dialog-content"]', { hasText: "Editar Entidad" })
    await expect(editor).toBeVisible()

    await editor.getByRole("button", { name: "Eliminar imagen" }).click({ force: true })
    const alert = page.getByRole("alertdialog", { name: "Eliminar imagen" })
    await expect(alert).toBeVisible()

    // Una confirmación no se cierra con un clic afuera y el modal de abajo tampoco.
    await page.mouse.click(2, 2)
    await expect(alert).toBeVisible()
    await expect(editor).toBeVisible()

    // Cancelar cierra solo la confirmación.
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    await expect(editor).toBeVisible()

    // Escape también cierra solo la confirmación.
    await editor.getByRole("button", { name: "Eliminar imagen" }).click({ force: true })
    await expect(alert).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(alert).toBeHidden()
    await expect(editor).toBeVisible()
  })

  test("Compartir obra: abrir y cerrar no deja restos en la página", async ({ page }) => {
    await installModalBackend(page)
    await openEditor(page)
    await page.getByRole("button", { name: "Compartir obra" }).first().click()
    const dialog = dialogNamed(page, "Compartir un libro")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cerrar" }).last().click()
    await expect(dialog).toBeHidden()

    // Sin overlays colgados: la página vuelve a responder.
    expect(await page.locator('[data-slot="dialog-overlay"]').count()).toBe(0)
    const pointer = await page.evaluate(() => getComputedStyle(document.body).pointerEvents)
    expect(pointer).not.toBe("none")
  })
})
