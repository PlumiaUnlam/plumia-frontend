import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { openEditor } from "./support/modal-helpers"

/**
 * Listas desplegables dentro de modales: un toque afuera de la lista debe
 * cerrar SOLO la lista (nunca el modal), la lista tiene que verse completa y
 * por debajo del botón, y Escape cierra primero la lista.
 */

const base = "/projects/" + projectId
const DIALOG = '[data-slot="dialog-content"]'

type Opener = { name: string; open: (page: Page) => Promise<void>; desktopOnly?: boolean }

const OPENERS: Opener[] = [
  {
    name: "Exportar obra",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: "Exportar obra" }).first().click()
    },
  },
  {
    name: "Compartir obra",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: "Compartir obra" }).first().click()
    },
  },
  {
    name: "Nueva relación",
    desktopOnly: true,
    open: async (page) => {
      await page.goto(base + "/worldbuilding?tab=relationships")
      await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    },
  },
  {
    name: "Nueva nota (matriz)",
    desktopOnly: true,
    open: async (page) => {
      await page.goto(base + "/storyboard")
      await page.getByRole("button", { name: "Matriz" }).click()
      await page.getByRole("button", { name: /Nueva nota/ }).first().click()
    },
  },
  {
    name: "Nueva tarjeta",
    open: async (page) => {
      await page.goto(base + "/storyboard")
      await page.getByRole("button", { name: "Nueva tarjeta" }).first().click()
    },
  },
]

async function dialogRect(page: Page) {
  const dialog = page.locator(DIALOG).last()
  await expect(dialog).toBeVisible()
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
  )
  return dialog
}

async function spotsFor(dialog: Locator) {
  const rect = await dialog.boundingBox()
  const title = await dialog.locator('[data-slot="dialog-title"]').first().boundingBox()
  const footer = await dialog.locator('[data-slot="dialog-footer"]').first().boundingBox()
  expect(rect).not.toBeNull()
  const spots: Array<[string, number, number]> = []
  if (title) spots.push(["título", title.x + 4, title.y + title.height / 2])
  if (footer) spots.push(["pie", footer.x + 6, footer.y + footer.height / 2])
  spots.push(["borde derecho del modal", rect!.x + rect!.width - 6, rect!.y + rect!.height / 2])
  spots.push(["fondo oscuro", 4, 4])
  return spots
}

const listOpen = (page: Page) => page.locator('[role="listbox"]:visible')
const dialogOpen = (page: Page) => page.locator(DIALOG)

for (const viewport of [
  { name: "escritorio", width: 1440, height: 900, mobile: false },
  { name: "celular", width: 375, height: 812, mobile: true },
]) {
  test.describe("Listas dentro de modales — " + viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const opener of OPENERS) {
      if (opener.desktopOnly && viewport.mobile) continue

      test(opener.name + ": tocar afuera de la lista cierra solo la lista", async ({ page }) => {
        test.setTimeout(90_000)
        await installModalBackend(page, { secondBook: true })
        await opener.open(page)
        const dialog = await dialogRect(page)

        const controls = dialog.locator('[role="combobox"]:visible')
        const total = await controls.count()
        test.skip(total === 0, "el modal no tiene listas")

        for (let index = 0; index < total; index++) {
          for (const [label, x, y] of await spotsFor(dialog)) {
            await controls.nth(index).click()
            await expect(listOpen(page)).toHaveCount(1)
            await page.waitForTimeout(350) // lo que tarda una persona en tocar de nuevo

            await page.mouse.click(x, y)
            const where = opener.name + " › lista " + (index + 1) + " › toque en " + label
            await expect(listOpen(page), "la lista sigue abierta: " + where).toHaveCount(0)
            await expect(dialogOpen(page), "se cerró también el modal: " + where).toHaveCount(1)
            await page.waitForTimeout(550)
          }
        }
      })
    }

    test("la lista se despliega debajo del botón y no lo tapa (Exportar obra)", async ({ page }) => {
      test.skip(viewport.mobile, "el editor es solo de escritorio")
      await installModalBackend(page, { secondBook: true })
      await openEditor(page)
      await page.getByRole("button", { name: "Exportar obra" }).first().click()
      await dialogRect(page)

      const trigger = page.locator("#export-book")
      await trigger.click()
      const list = listOpen(page).first()
      await expect(list).toBeVisible()
      await list.evaluate((el) =>
        Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
      )
      const triggerBox = await trigger.boundingBox()
      const listBox = await list.boundingBox()
      expect(triggerBox).not.toBeNull()
      expect(listBox).not.toBeNull()
      // La lista empieza donde termina el botón (o arriba de él si no hay lugar), nunca encima.
      const below = listBox!.y >= triggerBox!.y + triggerBox!.height - 1
      const above = listBox!.y + listBox!.height <= triggerBox!.y + 1
      expect(below || above, "la lista tapa al botón").toBe(true)
      expect(listBox!.width).toBeGreaterThanOrEqual(triggerBox!.width - 2)
    })

    test("Exportar obra: el guardián de la lista no es permanente (un toque afuera sin lista cierra el modal)", async ({ page }) => {
      test.skip(viewport.mobile, "el editor es solo de escritorio")
      await installModalBackend(page, { secondBook: true })
      await openEditor(page)
      await page.getByRole("button", { name: "Exportar obra" }).first().click()
      await dialogRect(page)

      await page.locator("#export-book").click()
      await expect(listOpen(page)).toHaveCount(1)
      await page.waitForTimeout(350)
      await page.mouse.click(4, 4)
      await expect(listOpen(page)).toHaveCount(0)
      await expect(dialogOpen(page)).toHaveCount(1)

      await page.waitForTimeout(700)
      await page.mouse.click(4, 4)
      await expect(dialogOpen(page)).toHaveCount(0)
    })
  })
}
