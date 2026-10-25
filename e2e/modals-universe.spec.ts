import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { alertNamed, dialogNamed } from "./support/modal-helpers"

const base = `/projects/${projectId}`

async function visit(page: Page, path: string, heading: string | RegExp) {
  await page.goto(`${base}${path}`)
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible()
}

test.describe("Tablero (tarjetas)", () => {
  test("Nueva tarjeta: cancelar no crea nada", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/storyboard", "Ideas")

    await page.getByRole("button", { name: "Nueva tarjeta" }).first().click()
    const dialog = dialogNamed(page, "Nueva Tarjeta")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Crear tarjeta" })).toBeDisabled()
    await dialog.getByLabel("Título de la escena *").fill("Descartada")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()

    expect(backend.callsTo("POST", /storyboard-cards$/)).toHaveLength(0)
  })

  test("Editar tarjeta: carga los datos y guarda los cambios", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/storyboard", "Ideas")

    await page.getByRole("button", { name: "Editar" }).first().click()
    const dialog = dialogNamed(page, "Editar Tarjeta")
    await expect(dialog.getByLabel("Título de la escena *")).toHaveValue(
      "La carta bajo la puerta",
    )
    await dialog.getByLabel("Título de la escena *").fill("La carta bajo la puerta (v2)")
    await dialog.getByRole("button", { name: "Guardar cambios" }).click()

    await expect(dialog).toBeHidden()
    const updates = backend.callsTo("PATCH", /\/storyboard-cards\/card-1$/)
    expect(updates).toHaveLength(1)
    expect(updates[0].body).toMatchObject({ title: "La carta bajo la puerta (v2)" })
    await expect(page.getByText("La carta bajo la puerta (v2)")).toBeVisible()
  })

  test("Eliminar tarjeta: cancelar la conserva y confirmar la borra", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/storyboard", "Ideas")

    await page.getByRole("button", { name: "Eliminar" }).first().click()
    const alert = alertNamed(page, "Eliminar tarjeta")
    await expect(alert).toContainText("La carta bajo la puerta")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /storyboard-cards/)).toHaveLength(0)

    await page.getByRole("button", { name: "Eliminar" }).first().click()
    await alert.getByRole("button", { name: "Eliminar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/storyboard-cards\/card-1$/)).toHaveLength(1)
    await expect(page.getByText("La carta bajo la puerta")).toHaveCount(0)
  })
})

test.describe("Tablero (matriz de arcos)", () => {
  test("Nuevo arco: pide nombre y tipo antes de habilitar el botón y los envía", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/storyboard?view=matrix", /Storyboarding/)

    await page.getByRole("button", { name: "Nuevo arco" }).first().click()
    const dialog = dialogNamed(page, "Nuevo arco narrativo")
    const submit = dialog.getByRole("button", { name: "Crear arco" })
    await expect(submit).toBeDisabled()

    await dialog.getByLabel("Nombre", { exact: true }).fill("Traición y confianza")
    await expect(submit).toBeDisabled()
    await dialog.getByLabel("Tipo", { exact: true }).fill("Subtrama")
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/storyboard-arcs$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      title: "Traición y confianza",
      sourceType: "custom",
      customType: "Subtrama",
    })
    await expect(page.getByText("Traición y confianza")).toBeVisible()
  })

  test("Nueva nota: se asocia al arco y al capítulo elegidos", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/storyboard?view=matrix", /Storyboarding/)

    await page.getByRole("button", { name: "Nueva nota" }).first().click()
    const dialog = dialogNamed(page, "Nueva nota")
    const submit = dialog.getByRole("button", { name: "Crear nota" })
    await expect(submit).toBeDisabled()

    await dialog.getByPlaceholder("Buscar arco...").click()
    await page.getByRole("option", { name: /Arco de Maren/ }).click()
    await dialog.getByPlaceholder("Buscar capítulo...").click()
    await page.getByRole("option", { name: /Capítulo 1/ }).click()
    await dialog.getByLabel("Nota", { exact: true }).fill("Maren descubre la mentira.")
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/storyboard-arcs\/arc-1\/notes$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      chapterId: "e2e-chapter",
      content: "Maren descubre la mentira.",
    })
  })

  test("Eliminar arco y eliminar nota piden confirmación", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/storyboard?view=matrix", /Storyboarding/)

    // Nota
    await page.getByRole("button", { name: "Eliminar nota" }).first().click()
    const noteAlert = alertNamed(page, "Eliminar nota")
    await noteAlert.getByRole("button", { name: "Cancelar" }).click()
    await expect(noteAlert).toBeHidden()
    expect(backend.callsTo("DELETE", /storyboard-matrix-notes/)).toHaveLength(0)
    await page.getByRole("button", { name: "Eliminar nota" }).first().click()
    await noteAlert.getByRole("button", { name: "Eliminar" }).click()
    await expect(noteAlert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/storyboard-matrix-notes\/note-1$/)).toHaveLength(1)

    // Arco
    await page.getByRole("button", { name: "Eliminar arco" }).first().click()
    const arcAlert = alertNamed(page, "Eliminar arco narrativo")
    await expect(arcAlert).toContainText("Arco de Maren")
    await arcAlert.getByRole("button", { name: "Cancelar" }).click()
    expect(backend.callsTo("DELETE", /storyboard-arcs/)).toHaveLength(0)
    await page.getByRole("button", { name: "Eliminar arco" }).first().click()
    await arcAlert.getByRole("button", { name: "Eliminar" }).click()
    await expect(arcAlert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/storyboard-arcs\/arc-1$/)).toHaveLength(1)
  })
})

test.describe("Estadísticas", () => {
  test("Definir metas: valida los valores y guarda cada meta", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/statistics", /Estadísticas de escritura/)

    await page.getByRole("button", { name: /Definir metas/ }).first().click()
    const dialog = dialogNamed(page, "Definir metas de escritura")
    await expect(dialog).toBeVisible()

    await dialog.getByRole("button", { name: "Guardar metas" }).click()
    await expect(dialog.getByText("Definí al menos una meta para continuar.")).toBeVisible()

    await dialog.locator("#daily-target").fill("0")
    await dialog.getByRole("button", { name: "Guardar metas" }).click()
    await expect(dialog.getByText(/Ingresá cantidades válidas/)).toBeVisible()
    expect(backend.callsTo("PUT", /goals/)).toHaveLength(0)

    await dialog.locator("#daily-target").fill("500")
    await dialog.locator("#weekly-target").fill("3500")
    await dialog.getByRole("button", { name: "Guardar metas" }).click()

    await expect(dialog).toBeHidden()
    const daily = backend.callsTo("PUT", /\/goals\/DAILY$/)
    const weekly = backend.callsTo("PUT", /\/goals\/WEEKLY$/)
    expect(daily).toHaveLength(1)
    expect(weekly).toHaveLength(1)
    expect(daily[0].body).toMatchObject({ targetWords: 500 })
    expect(weekly[0].body).toMatchObject({ targetWords: 3500 })
  })
})

test.describe("Universo (worldbuilding)", () => {
  test("Nueva entidad: exige nombre, usa el tipo elegido y Escape no guarda", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/worldbuilding", "Worldbuilding")

    await page.getByRole("button", { name: /Nueva Entidad/ }).first().click()
    const dialog = dialogNamed(page, "Nueva Entidad")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Crear entidad" })).toBeDisabled()
    await dialog.getByLabel("Nombre *").fill("Descartada")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    expect(backend.callsTo("POST", /\/knowledge\/entities$/)).toHaveLength(0)

    await page.getByRole("button", { name: /Nueva Entidad/ }).first().click()
    await dialog.getByLabel("Nombre *").fill("Puerto de Bruma")
    await dialog.getByRole("button", { name: "Lugar" }).click()
    await dialog.getByRole("button", { name: "Crear entidad" }).click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/knowledge\/entities$/)
    expect(created).toHaveLength(1)
    expect(created[0].query).toContain(`projectId=${projectId}`)
    expect(created[0].body).toMatchObject({
      canonicalName: "Puerto de Bruma",
      type: "LOCATION",
    })
  })

  test("Nueva relación: no deja elegir la misma entidad en ambos lados y envía los datos", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/worldbuilding?tab=relationships", "Worldbuilding")

    await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    const dialog = dialogNamed(page, "Nueva Relación")
    const submit = dialog.getByRole("button", { name: "Crear relación" })
    await expect(submit).toBeDisabled()

    await dialog.locator("#relation-source").click()
    await page.getByRole("option", { name: "Tomás Reyes" }).click()
    await dialog.locator("#relation-target").click()
    // La entidad ya elegida en «Desde» no se ofrece en «Hasta».
    await expect(page.getByRole("option", { name: "Tomás Reyes" })).toHaveCount(0)
    await page.getByRole("option", { name: "Maren Solís" }).click()

    await dialog.getByRole("button", { name: "Rival" }).click()
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/knowledge\/relationships$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      sourceEntityId: "tomas-reyes",
      targetEntityId: "maren-solis",
      relationType: "RIVAL",
    })
  })

  test("Nuevo evento: muestra el error del servidor sin cerrar y luego guarda", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    backend.failNext("POST", /\/knowledge\/timeline$/, 500, "No se pudo guardar el evento ahora")
    await visit(page, "/worldbuilding?tab=timeline", "Worldbuilding")

    await page.getByRole("button", { name: /Nuevo Evento/i }).first().click()
    const dialog = dialogNamed(page, "Nuevo evento")
    const submit = dialog.getByRole("button", { name: "Crear evento" })
    await expect(submit).toBeDisabled()

    await dialog.locator("#timeline-title").fill("Llega el invierno")
    await submit.click()
    await expect(dialog.getByText("No se pudo guardar el evento ahora")).toBeVisible()
    await expect(dialog).toBeVisible()

    await submit.click()
    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/knowledge\/timeline$/)
    expect(created).toHaveLength(2)
    expect(created[1].body).toMatchObject({ title: "Llega el invierno" })
    await expect(page.getByText("Llega el invierno")).toBeVisible()
  })

  test("Eliminar evento: cancelar lo conserva y confirmar lo borra", async ({ page }) => {
    const backend = await installModalBackend(page)
    await visit(page, "/worldbuilding?tab=timeline", "Worldbuilding")

    await page.getByRole("button", { name: "Eliminar Desaparece el librero" }).click()
    const alert = alertNamed(page, "Eliminar evento")
    await expect(alert).toContainText("Desaparece el librero")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/knowledge\/timeline/)).toHaveLength(0)

    await page.getByRole("button", { name: "Eliminar Desaparece el librero" }).click()
    await alert.getByRole("button", { name: "Eliminar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/knowledge\/timeline\/t1$/)).toHaveLength(1)
    await expect(page.getByText("Desaparece el librero")).toHaveCount(0)
  })
})

test.describe("Lector compartido", () => {
  async function selectWord(page: Page, word: string) {
    // Simula el gesto de seleccionar texto con el mouse sobre el manuscrito.
    await page.evaluate((target) => {
      const paragraph = document.querySelector<HTMLElement>(".ProseMirror p")
      if (!paragraph?.firstChild) throw new Error("No hay texto para seleccionar")
      const text = paragraph.firstChild
      const start = (text.textContent ?? "").indexOf(target)
      const range = document.createRange()
      range.setStart(text, start)
      range.setEnd(text, start + target.length)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      paragraph.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
      paragraph.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    }, word)
  }

  test("Comentar selección: pide el texto del comentario y lo publica anclado a lo seleccionado", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await page.goto("/shared/invitacion-1?token=token-1")
    await expect(page.locator(".ProseMirror p").first()).toContainText("La noche cubría la ciudad.")

    // Cancelar no publica nada.
    await selectWord(page, "noche")
    const dialog = dialogNamed(page, "Comentar selección")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("“noche”")).toBeVisible()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    expect(backend.callsTo("POST", /\/comments$/)).toHaveLength(0)

    // Publicar: el botón espera el texto.
    await selectWord(page, "noche")
    const submit = dialog.getByRole("button", { name: "Comentar" })
    await expect(submit).toBeDisabled()
    await dialog.getByLabel("Comentario").fill("¿Y si la noche llegara antes?")
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/reading\/invitations\/invitacion-1\/comments$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      selectedText: "noche",
      body: "¿Y si la noche llegara antes?",
    })
    await expect(page.getByText("¿Y si la noche llegara antes?")).toBeVisible()
  })
})
