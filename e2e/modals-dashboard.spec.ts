import { expect, test, type Page } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import { alertNamed, dialogNamed } from "./support/modal-helpers"

async function openDashboard(page: Page) {
  await page.goto("/dashboard")
  await expect(
    page.getByRole("heading", { name: "Mis proyectos" }),
  ).toBeVisible()
}

async function openProjectMenu(page: Page, action: "Editar" | "Eliminar") {
  await page
    .getByRole("button", { name: "Acciones de Crónicas del viento" })
    .click()
  await page.getByRole("menuitem", { name: action }).click()
}

test.describe("Modales del panel de proyectos", () => {
  test("Crear proyecto: Enter envía el formulario y el proyecto aparece en la lista", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openDashboard(page)

    await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    const dialog = dialogNamed(page, "Crear nuevo proyecto")
    await expect(dialog).toBeVisible()

    const name = dialog.getByLabel("Nombre del Proyecto")
    await name.fill("La ciudad sumergida")
    await dialog.getByLabel("Género").fill("Misterio")
    await name.press("Enter")

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /^\/projects$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      title: "La ciudad sumergida",
      genre: "Misterio",
    })
    await expect(page.getByText("La ciudad sumergida")).toBeVisible()
  })

  test("Crear proyecto: Cancelar y Escape cierran sin crear nada", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openDashboard(page)

    await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    const dialog = dialogNamed(page, "Crear nuevo proyecto")
    await dialog.getByLabel("Nombre del Proyecto").fill("Borrador")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()

    await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()

    expect(backend.callsTo("POST", /^\/projects/)).toHaveLength(0)
  })

  test("Importar EPUB: el selector muestra el archivo, permite quitarlo y rechaza otros formatos", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openDashboard(page)

    await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    const dialog = dialogNamed(page, "Crear nuevo proyecto")
    await expect(dialog.getByRole("button", { name: "Buscar archivo" })).toBeVisible()
    await expect(dialog.getByText("Solo .epub · máx. 50 MB")).toBeVisible()

    const input = dialog.getByLabel("Importar obra desde EPUB (opcional)")

    // Un archivo que no es EPUB se rechaza con un mensaje claro.
    await input.setInputFiles({
      name: "notas.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hola"),
    })
    await expect(dialog.getByText("Seleccioná un archivo .epub.")).toBeVisible()

    // Un EPUB válido se muestra por nombre y completa el título si estaba vacío.
    await input.setInputFiles({
      name: "mi-novela.epub",
      mimeType: "application/epub+zip",
      buffer: Buffer.from("PK"),
    })
    await expect(dialog.getByText("mi-novela.epub")).toBeVisible()
    await expect(dialog.getByLabel("Nombre del Proyecto")).toHaveValue("mi-novela")

    await dialog.getByRole("button", { name: "Quitar archivo" }).click()
    await expect(dialog.getByText("mi-novela.epub")).toBeHidden()
    await expect(dialog.getByText("Solo .epub · máx. 50 MB")).toBeVisible()
  })

  test("Importar EPUB: si la importación falla se muestra el error y el modal sigue abierto", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openDashboard(page)

    await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    const dialog = dialogNamed(page, "Crear nuevo proyecto")
    await dialog.getByLabel("Importar obra desde EPUB (opcional)").setInputFiles({
      name: "mi-novela.epub",
      mimeType: "application/epub+zip",
      buffer: Buffer.from("PK"),
    })
    await dialog.getByRole("button", { name: "Crear proyecto" }).click()

    await expect(dialog.getByText(/No se pudo importar el EPUB/)).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(backend.callsTo("POST", /\/projects\/import\/epub$/)).toHaveLength(1)
    expect(backend.callsTo("POST", /^\/projects$/)).toHaveLength(0)
  })

  test("Editar proyecto: carga los datos actuales y guarda los cambios", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openDashboard(page)

    await openProjectMenu(page, "Editar")
    const dialog = dialogNamed(page, "Editar proyecto")
    await expect(dialog).toBeVisible()
    const name = dialog.getByLabel("Nombre del Proyecto")
    await expect(name).toHaveValue("Crónicas del viento")
    await expect(dialog.getByLabel("Género")).toHaveValue("Fantasía")
    // Importar un EPUB solo existe al crear, no al editar.
    await expect(dialog.getByLabel("Importar obra desde EPUB (opcional)")).toHaveCount(0)

    await name.fill("Crónicas del mar")
    await dialog.getByRole("button", { name: "Guardar cambios" }).click()

    await expect(dialog).toBeHidden()
    const updates = backend.callsTo("PATCH", /^\/projects\/e2e-project$/)
    expect(updates).toHaveLength(1)
    expect(updates[0].body).toMatchObject({ title: "Crónicas del mar" })
    await expect(page.getByText("Crónicas del mar")).toBeVisible()
  })

  test("Editar proyecto: cancelar no guarda", async ({ page }) => {
    const backend = await installModalBackend(page)
    await openDashboard(page)

    await openProjectMenu(page, "Editar")
    const dialog = dialogNamed(page, "Editar proyecto")
    await dialog.getByLabel("Nombre del Proyecto").fill("Otro nombre")
    await dialog.getByRole("button", { name: "Cancelar" }).click()

    await expect(dialog).toBeHidden()
    expect(backend.callsTo("PATCH", /^\/projects\//)).toHaveLength(0)
    await expect(page.getByText("Crónicas del viento")).toBeVisible()
  })

  test("Eliminar proyecto: cancelar no borra y confirmar borra", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openDashboard(page)

    await openProjectMenu(page, "Eliminar")
    const alert = alertNamed(page, "¿Eliminar este proyecto?")
    await expect(alert).toBeVisible()
    await expect(alert).toContainText("Crónicas del viento")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /^\/projects\//)).toHaveLength(0)

    await openProjectMenu(page, "Eliminar")
    await alert.getByRole("button", { name: "Eliminar proyecto" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /^\/projects\/e2e-project$/)).toHaveLength(1)
    await expect(page.getByText("Crónicas del viento")).toHaveCount(0)
  })

  test("Eliminar proyecto: mientras se elimina, Escape no cierra y los botones quedan bloqueados", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    backend.setMutationDelay(1500)
    await openDashboard(page)

    await openProjectMenu(page, "Eliminar")
    const alert = alertNamed(page, "¿Eliminar este proyecto?")
    await alert.getByRole("button", { name: "Eliminar proyecto" }).click()

    await expect(alert.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    await page.keyboard.press("Escape")
    await expect(alert).toBeVisible()

    await expect(alert).toBeHidden({ timeout: 6000 })
    expect(backend.callsTo("DELETE", /^\/projects\/e2e-project$/)).toHaveLength(1)
  })
})
