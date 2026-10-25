import { expect, type Locator, type Page } from "@playwright/test"

import { projectId } from "./modal-backend"

/** Modal de formulario o confirmación con ese título (nombre accesible). */
export const dialogNamed = (page: Page, name: string | RegExp): Locator =>
  page.getByRole("dialog", { name })

export const alertNamed = (page: Page, name: string | RegExp): Locator =>
  page.getByRole("alertdialog", { name })

export async function openEditor(page: Page) {
  await page.goto(`/projects/${projectId}/editor`)
  await expect(
    page.getByRole("heading", { name: "Crónicas del viento" }),
  ).toBeVisible()
}

export async function openScene(page: Page) {
  await page.getByRole("button", { name: "El umbral 10 palabras" }).click()
  await expect(page.locator(".ProseMirror")).toContainText(
    "La noche cubría la ciudad.",
  )
}

export async function openEditorMenu(
  page: Page,
  menu: string,
  item: string | RegExp,
) {
  await page
    .getByRole("menubar", { name: "Menús del editor" })
    .getByRole("menuitem", { name: menu })
    .click()
  await page.getByRole("menuitem", { name: item }).click()
}

/** Abre el menú «Opciones de …» del árbol del proyecto y elige una acción. */
export async function openTreeMenu(page: Page, title: string, action: string) {
  await page
    .getByRole("menuitem", { name: `Opciones de ${title}` })
    .click({ force: true })
  await page.getByRole("menuitem", { name: action, exact: true }).last().click()
}

/** Mide el elemento una vez terminadas las animaciones de apertura (arrancan al 95% de escala). */
export async function box(locator: Locator) {
  await locator.evaluate((element) =>
    Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  )
  const value = await locator.boundingBox()
  expect(value).not.toBeNull()
  return value!
}
