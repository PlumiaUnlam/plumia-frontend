import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, makeProject, projectId } from "./support/modal-backend"

async function openSettings(page: Page) {
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
  await page.getByRole("menuitem", { name: "Configuración" }).click()
  const dialog = page.getByRole("dialog", { name: "Configuración" })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe("Configuración: pestañas y textos", () => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 375, height: 700 },
  ]) {
    test(`las pestañas siguen visibles al desplazar «Reconocimiento» y «Inconsistencias» (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await installModalBackend(page)
      const dialog = await openSettings(page)

      for (const name of ["Reconocimiento", "Inconsistencias"]) {
        await dialog.getByRole("tab", { name }).click()
        const body = dialog.locator('[data-slot="dialog-body"]')
        await body.evaluate((el) => {
          el.scrollTop = el.scrollHeight
        })

        // Con el contenido desplazado hasta abajo, la barra de pestañas sigue a la vista.
        const bodyBox = (await body.boundingBox())!
        for (const tabName of ["Datos de la cuenta", "Reconocimiento"]) {
          const tab = dialog.getByRole("tab", { name: tabName })
          const box = (await tab.boundingBox())!
          expect(box.y, `«${tabName}» sale por arriba en ${name}`).toBeGreaterThanOrEqual(bodyBox.y - 1)
          expect(box.y + box.height).toBeLessThanOrEqual(bodyBox.y + bodyBox.height + 1)
        }
      }

      // Y desde ahí se puede volver a otra pestaña.
      await dialog.getByRole("tab", { name: "Datos de la cuenta" }).click()
      await expect(dialog.getByRole("tab", { name: "Datos de la cuenta" })).toHaveAttribute("data-state", "active")
      await expect(dialog.getByText("Nombre visible")).toBeVisible()
    })
  }

  test("«Reconocimiento» muestra los tipos de entidad en español y con aire entre campos", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await installModalBackend(page)
    const dialog = await openSettings(page)
    await dialog.getByRole("tab", { name: "Reconocimiento" }).click()

    for (const label of ["Personaje", "Ubicación", "Objeto", "Organización", "Evento", "Concepto"]) {
      await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible()
    }
    for (const english of ["CHARACTER", "LOCATION", "OBJECT", "ORGANIZATION", "EVENT", "CONCEPT"]) {
      await expect(dialog.getByText(english, { exact: true })).toHaveCount(0)
    }

    // La etiqueta de un control no queda pegada al control de arriba.
    const gap = await dialog.evaluate((root) => {
      const first = root.querySelector<HTMLInputElement>("#entity-threshold-CHARACTER")!
      const label = root.querySelector<HTMLElement>('label[for="entity-threshold-LOCATION"]')!
      return label.getBoundingClientRect().top - first.getBoundingClientRect().bottom
    })
    expect(gap).toBeGreaterThanOrEqual(8)
  })

  test("«Inconsistencias»: el selector y el campo de confianza no quedan pegados", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await installModalBackend(page)
    const dialog = await openSettings(page)
    await dialog.getByRole("tab", { name: "Inconsistencias" }).click()

    const mode = dialog.locator("#relationship-review-mode")
    await mode.scrollIntoViewIfNeeded()
    const label = dialog.locator('label[for="relationship-review-threshold"]')
    const modeBox = (await mode.boundingBox())!
    const labelBox = (await label.boundingBox())!
    expect(labelBox.y - (modeBox.y + modeBox.height)).toBeGreaterThanOrEqual(8)
  })
})

test.describe("Buscador de entidades de la wiki", () => {
  test("el nombre de la entidad va primero y después las menciones en otros textos", async ({ page }) => {
    await installModalBackend(page)
    const entity = (id: string, name: string, description: string, aliases: string[] = []) => ({
      id,
      canonicalName: name,
      type: "CHARACTER",
      description,
      aliases,
      imageUrl: null,
      projectId,
      isActive: true,
      attributes: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    const entities = [
      entity("e-gepetto", "Gepetto", "Talló a Pinocho en un trozo de pino."),
      entity("e-hada", "Hada Azul", "Protege a Pinocho.", ["Guardiana de Pinocho"]),
      entity("e-pinocho", "Pinocho", "Muñeco de madera y protagonista."),
      entity("e-grillo", "Pepito Grillo", "Es la conciencia de Pinocho."),
    ]
    await page.route(/\/knowledge\/entities(\?.*)?$/, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(entities) })
        : route.fallback(),
    )

    await page.goto("/projects/" + projectId + "/worldbuilding")
    const items = page.locator('aside [data-slot="item"]')
    await expect(items.first()).toBeVisible()

    await page.getByPlaceholder("Buscar entidades...").fill("pinocho")
    await expect(items).toHaveCount(4)
    // Primero la entidad llamada «Pinocho»; luego el alias; al final solo las menciones.
    await expect(items.nth(0)).toContainText("Pinocho")
    await expect(items.nth(0)).not.toContainText("Gepetto")
    await expect(items.nth(1)).toContainText("Hada Azul")

    // Sin acentos ni mayúsculas también la encuentra.
    await page.getByPlaceholder("Buscar entidades...").fill("PÍNOCHO")
    await expect(items.first()).toContainText("Pinocho")
  })
})

test.describe('Buscador de proyectos del dashboard', () => {
  test('primero los proyectos cuyo título coincide y después los que solo lo mencionan', async ({ page }) => {
    await installModalBackend(page)
    const base = makeProject()
    const projects = [
      { ...base, id: 'p-1', title: 'Cuentos del bosque', description: 'Incluye una versión de Pinocho', genre: 'Fantasía' },
      { ...base, id: 'p-2', title: 'Pinocho en la ciudad', description: 'Reescritura', genre: 'Fantasía' },
      { ...base, id: 'p-3', title: 'Otra obra', description: 'Sin relación', genre: 'Pinocho' },
    ]
    await page.route(/\/projects(\?.*)?$/, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projects) })
        : route.fallback(),
    )
    await page.goto('/dashboard')
    const titles = page.locator('[data-slot="card-title"]')
    await expect(titles).toHaveCount(3)

    await page.getByLabel('Buscar proyectos').fill('pinocho')
    await expect(titles).toHaveCount(3)
    await expect(titles.first()).toHaveText('Pinocho en la ciudad')
  })
})

test.describe('Selector de entidades de las tarjetas', () => {
  test('al buscar, la entidad cuyo nombre coincide aparece antes que las que solo lo contienen', async ({ page }) => {
    await installModalBackend(page)
    const entity = (id: string, name: string) => ({
      id,
      canonicalName: name,
      type: 'CHARACTER',
      description: name,
      aliases: [],
      imageUrl: null,
      projectId,
      isActive: true,
      attributes: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const entities = [entity('e-1', 'Hijo de Pinocho'), entity('e-2', 'Gepetto'), entity('e-3', 'Pinocho')]
    await page.route(/\/knowledge\/entities(\?.*)?$/, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entities) })
        : route.fallback(),
    )
    await page.goto('/projects/' + projectId + '/storyboard')
    await page.getByRole('button', { name: 'Nueva tarjeta' }).first().click()
    const dialog = page.locator('[data-slot="dialog-content"]')
    await dialog.getByPlaceholder('Buscar y seleccionar entidades...').fill('pinocho')

    const options = page.getByRole('option')
    await expect(options).toHaveCount(2)
    await expect(options.first()).toContainText('Pinocho')
    await expect(options.first()).not.toContainText('Hijo de')
  })
})
