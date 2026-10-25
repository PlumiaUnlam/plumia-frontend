import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import {
  alertNamed,
  box,
  dialogNamed,
  openEditor,
} from "./support/modal-helpers"

async function openDashboard(page: Page) {
  await page.goto("/dashboard")
  await expect(page.getByRole("heading", { name: "Mis proyectos" })).toBeVisible()
}

async function openCreateProject(page: Page) {
  await openDashboard(page)
  await page.getByRole("button", { name: "Crear proyecto" }).first().click()
  const dialog = dialogNamed(page, "Crear nuevo proyecto")
  await expect(dialog).toBeVisible()
  return dialog
}

async function openDeleteProject(page: Page) {
  await openDashboard(page)
  await page.getByRole("button", { name: "Acciones de Crónicas del viento" }).click()
  await page.getByRole("menuitem", { name: "Eliminar" }).click()
  const alert = alertNamed(page, "¿Eliminar este proyecto?")
  await expect(alert).toBeVisible()
  return alert
}

/** Ningún elemento del modal desborda su ancho (sin texto cortado ni scroll horizontal). */
async function expectNoHorizontalOverflow(dialog: Locator) {
  const overflowing = await dialog.evaluate((root) => {
    const bad: string[] = []
    for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
      const style = getComputedStyle(el)
      if (style.display === "none" || style.visibility === "hidden") continue
      if (el.classList.contains("sr-only")) continue
      if (el.scrollWidth > el.clientWidth + 1 && style.overflowX === "visible" && el.clientWidth > 0) {
        // Texto truncado a propósito (`truncate`) usa overflow hidden, por eso no entra acá.
        bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
      }
    }
    return bad
  })
  expect(overflowing).toEqual([])
}

test.describe("Anchos de los modales en escritorio (1440px)", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("confirmación 448px, formulario simple 544px y formulario 704px", async ({ page }) => {
    await installModalBackend(page)

    const alert = await openDeleteProject(page)
    expect((await box(alert)).width).toBeCloseTo(448, 0)
    await alert.getByRole("button", { name: "Cancelar" }).click()

    await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    const form = dialogNamed(page, "Crear nuevo proyecto")
    await expect(form).toBeVisible()
    expect((await box(form)).width).toBeCloseTo(704, 0)
    await form.getByRole("button", { name: "Cancelar" }).click()

    await openEditor(page)
    await page.getByRole("button", { name: "Agregar libro" }).click()
    const simple = dialogNamed(page, "Nuevo Libro")
    await expect(simple).toBeVisible()
    expect((await box(simple)).width).toBeCloseTo(544, 0)
  })

  test("el modal queda centrado, con encabezado y botones siempre visibles", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openCreateProject(page)
    const rect = await box(dialog)
    expect(rect.x + rect.width / 2).toBeCloseTo(720, 0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.y + rect.height).toBeLessThanOrEqual(900)
    await expect(dialog.getByRole("heading", { name: "Crear nuevo proyecto" })).toBeInViewport()
    await expect(dialog.getByRole("button", { name: "Crear proyecto" })).toBeInViewport()
    await expectNoHorizontalOverflow(dialog)
  })

  test("en una ventana baja el cuerpo scrollea y los botones siguen a la vista", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 500 })
    await installModalBackend(page)
    const dialog = await openCreateProject(page)
    const rect = await box(dialog)
    expect(rect.height).toBeLessThanOrEqual(500)
    await expect(dialog.getByRole("button", { name: "Crear proyecto" })).toBeInViewport()
    await expect(dialog.getByRole("heading", { name: "Crear nuevo proyecto" })).toBeInViewport()
  })
})

test.describe("Tablet (820px)", () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test("los formularios siguen centrados, con margen a los costados", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openCreateProject(page)
    const rect = await box(dialog)
    expect(rect.width).toBeLessThanOrEqual(704 + 1)
    expect(rect.x).toBeGreaterThan(0)
    expect(rect.x + rect.width).toBeLessThan(820)
    await expectNoHorizontalOverflow(dialog)
  })
})

test.describe("Mobile (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("los formularios ocupan toda la pantalla y los botones van a ancho completo", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openCreateProject(page)
    const rect = await box(dialog)
    expect(rect).toMatchObject({ x: 0, y: 0 })
    expect(rect.width).toBeCloseTo(375, 0)
    expect(rect.height).toBeCloseTo(812, 0)

    const submit = dialog.getByRole("button", { name: "Crear proyecto" })
    const cancel = dialog.getByRole("button", { name: "Cancelar" })
    await expect(submit).toBeInViewport()
    expect((await box(submit)).width).toBeGreaterThan(300)
    expect((await box(cancel)).width).toBeGreaterThan(300)
    await expectNoHorizontalOverflow(dialog)
  })

  test("la confirmación queda centrada con margen", async ({ page }) => {
    await installModalBackend(page)
    const alert = await openDeleteProject(page)
    const rect = await box(alert)
    expect(rect.width).toBeLessThanOrEqual(375 - 32 + 1)
    expect(rect.x).toBeGreaterThanOrEqual(16 - 1)
    expect(rect.x + rect.width / 2).toBeCloseTo(187.5, 0)
    await expectNoHorizontalOverflow(alert)
  })

  test("el selector de EPUB entra en una línea o baja sin cortar el texto", async ({ page }) => {
    await installModalBackend(page)
    const dialog = await openCreateProject(page)
    const picker = dialog.locator('[data-slot="file-picker"]')
    await expect(picker).toBeVisible()
    await expect(dialog.getByText("Solo .epub · máx. 50 MB")).toBeVisible()
    const rect = await box(picker)
    expect(rect.x + rect.width).toBeLessThanOrEqual(375)
  })

  test("al subir un EPUB largo el nombre se acorta con puntos suspensivos y no rompe el modal", async ({
    page,
  }) => {
    await installModalBackend(page)
    const dialog = await openCreateProject(page)
    await dialog.getByLabel("Importar obra desde EPUB (opcional)").setInputFiles({
      name: "una-novela-con-un-nombre-de-archivo-extremadamente-largo-para-probar-el-corte.epub",
      mimeType: "application/epub+zip",
      buffer: Buffer.from("PK"),
    })
    await expect(dialog.getByRole("button", { name: "Quitar archivo" })).toBeVisible()
    await expectNoHorizontalOverflow(dialog)
    const picker = dialog.locator('[data-slot="file-picker"]')
    expect((await box(picker)).x + (await box(picker)).width).toBeLessThanOrEqual(375)
  })
})
