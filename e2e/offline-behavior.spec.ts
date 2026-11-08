import { expect, test } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import { e2eProjectId, installMockBackend } from "./support/mock-backend"
import {
  dialogNamed,
  openEditor,
  openEditorMenu,
  openScene,
} from "./support/modal-helpers"

test("HU-03 CA-009: conserva el borrador abierto y reintenta el guardado al reconectar", async ({
  page,
}) => {
  const backend = await installMockBackend(page)
  let failNextSceneSave = true
  await page.route(/\/scenes\/e2e-scene(?:\?.*)?$/, async (route) => {
    if (route.request().method() === "PATCH" && failNextSceneSave) {
      failNextSceneSave = false
      await route.abort("failed")
      return
    }
    await route.fallback()
  })

  await page.goto(`/projects/${e2eProjectId}/editor`)
  await page.getByRole("button", { name: "El umbral 10 palabras" }).click()
  const editor = page.locator(".ProseMirror")
  await editor.click()
  await editor.press("End")
  await editor.type(" La conexión se recupera y el borrador se guarda.")

  await page
    .getByRole("menubar", { name: "Menús del editor" })
    .getByRole("menuitem", { name: "Archivo" })
    .click()
  await page.getByRole("menuitem", { name: "Guardar cambios" }).click()

  const saveError = page.locator('[role="status"]').filter({ hasText: "Error al guardar" })
  await expect(saveError).toBeVisible()
  await expect(editor).toContainText("La conexión se recupera y el borrador se guarda.")
  expect(backend.sceneWrites).toHaveLength(0)

  await page.context().setOffline(true)
  await page.context().setOffline(false)
  await expect.poll(() => backend.sceneWrites.length).toBe(1)
  expect(JSON.stringify(backend.getSceneContent())).toContain(
    "La conexión se recupera y el borrador se guarda.",
  )
})

test("HU-15 CA-046: guarda estilos offline en el dispositivo y los sincroniza al reconectar", async ({
  page,
}) => {
  const backend = await installModalBackend(page)
  await openEditor(page)
  await openScene(page)
  await page.evaluate(() => {
    localStorage.removeItem("plumia:editor-text-styles:e2e-project")
    localStorage.removeItem("plumia:editor-text-styles:pending:e2e-project")
  })
  await page.context().setOffline(true)

  await page.locator(".ProseMirror").click()
  await page.keyboard.press("ControlOrMeta+a")
  await openEditorMenu(page, "Formato", "Estilos de texto")
  await page.getByRole("menuitem", { name: /Guardar selección como estilo/ }).click()
  const dialog = dialogNamed(page, "Guardar estilo reutilizable")
  await dialog.getByLabel("Nombre del estilo").fill("Estilo sin conexión")
  await dialog.getByRole("button", { name: "Guardar estilo" }).click()
  await expect(dialog).toBeHidden()

  const pendingOffline = await page.evaluate(() => ({
    cached: localStorage.getItem("plumia:editor-text-styles:e2e-project"),
    queue: localStorage.getItem("plumia:editor-text-styles:pending:e2e-project"),
  }))
  expect(pendingOffline.cached).toContain("Estilo sin conexión")
  expect(pendingOffline.queue).toContain('"type":"create"')
  expect(backend.callsTo("POST", /\/editor-styles$/)).toHaveLength(0)

  await openEditorMenu(page, "Formato", "Estilos de texto")
  await expect(page.getByText(/Sin conexión: el estilo quedó guardado en este dispositivo/)).toBeVisible()

  await page.context().setOffline(false)
  await expect.poll(() => backend.callsTo("POST", /\/editor-styles$/).length).toBe(1)
  await expect.poll(() =>
    page.evaluate(() => localStorage.getItem("plumia:editor-text-styles:pending:e2e-project")),
  ).toBeNull()
  await expect(page.getByText("Los cambios de estilo pendientes ya se sincronizaron.")).toBeVisible()
})
