import { expect, test } from "@playwright/test"

import {
  e2eProjectId,
  installMockBackend,
} from "./support/mock-backend"

test("HU-01 CA-001/002: valida el título y crea un proyecto en el panel", async ({
  page,
}) => {
  const backend = await installMockBackend(page)

  await page.goto("/dashboard")
  await expect(
    page.getByRole("heading", { name: "Mis proyectos" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Crear proyecto" }).click()
  await expect(
    page.getByRole("heading", { name: "Crear nuevo proyecto" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Crear proyecto" }).last().click()
  await expect(page.getByLabel("Nombre del Proyecto")).toHaveAttribute(
    "aria-invalid",
    "true",
  )
  await expect(
    page.getByText("El nombre del proyecto es obligatorio."),
  ).toBeVisible()
  expect(backend.projectCreates).toHaveLength(0)

  await page.getByLabel("Nombre del Proyecto").fill("La ciudad sumergida")
  await page.getByLabel("Descripción").fill("Una novela de misterio")
  await page.getByLabel("Género").fill("Misterio")
  await page.getByRole("button", { name: "Crear proyecto" }).last().click()

  await expect(page.getByText("La ciudad sumergida", { exact: true })).toBeVisible()
  expect(backend.projectCreates).toHaveLength(1)
  expect(backend.projectCreates[0]).toMatchObject({
    title: "La ciudad sumergida",
    description: "Una novela de misterio",
    genre: "Misterio",
  })
})

test("HU-02 CA-004: agrega un capítulo al libro y lo muestra en el árbol", async ({
  page,
}) => {
  const backend = await installMockBackend(page)

  await page.goto(`/projects/${e2eProjectId}/editor`)
  await expect(page.getByRole("heading", { name: "Crónicas del viento" })).toBeVisible()
  await page.getByRole("button", { name: "Libro I", exact: true }).hover()
  await page.getByRole("button", { name: "Agregar capítulo a Libro I" }).click()
  await expect(
    page.getByRole("heading", { name: "Nuevo Capítulo" }),
  ).toBeVisible()
  await page.getByLabel("Nombre del Capítulo").fill("Capítulo 2: La señal")
  await page.getByRole("button", { name: "Crear Capítulo" }).click()

  await expect(
    page.getByText("Capítulo 2: La señal", { exact: true }),
  ).toBeVisible()
  expect(backend.structureCreates).toEqual([
    {
      kind: "chapter",
      payload: { title: "Capítulo 2: La señal", sortKey: "002" },
    },
  ])
})

test("HU-03 CA-007: aplica formato, guarda la escena y conserva el formato al reabrir", async ({
  page,
}) => {
  const backend = await installMockBackend(page)

  await page.goto(`/projects/${e2eProjectId}/editor`)
  await page.getByRole("button", { name: "El umbral 10 palabras" }).click()
  const editor = page.locator(".ProseMirror")
  await expect(editor).toContainText("La noche cubría la ciudad.")
  await page.getByRole("button", { name: "Mostrar herramientas" }).click()
  await editor.click()
  await editor.press("ControlOrMeta+a")
  await page.getByRole("button", { name: "Negrita" }).click()
  await expect(editor.locator("strong")).toHaveText([
    "La noche cubría la ciudad.",
    "La noche llegó antes de lo esperado.",
  ])

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/scenes/e2e-scene") &&
      response.request().method() === "PATCH",
  )
  await page
    .getByRole("menubar", { name: "Menús del editor" })
    .getByRole("menuitem", { name: "Archivo" })
    .click()
  await page.getByRole("menuitem", { name: "Guardar cambios" }).click()
  await saveResponse

  await expect.poll(() => backend.sceneWrites.length).toBe(1)
  expect(
    JSON.stringify(backend.getSceneContent()),
  ).toContain('"type":"bold"')

  await page.reload()
  await page.getByRole("button", { name: "El umbral 10 palabras" }).click()
  await expect(page.locator(".ProseMirror strong")).toHaveText([
    "La noche cubría la ciudad.",
    "La noche llegó antes de lo esperado.",
  ])
})

test("HU-04 CA-011/012: reemplaza todas las coincidencias y persiste el manuscrito", async ({
  page,
}) => {
  const backend = await installMockBackend(page)

  await page.goto(`/projects/${e2eProjectId}/editor`)
  await page.getByRole("button", { name: "El umbral 10 palabras" }).click()
  await expect(page.locator(".ProseMirror")).toBeVisible()
  await page
    .getByRole("menubar", { name: "Menús del editor" })
    .getByRole("menuitem", { name: "Editar" })
    .click()
  await page.getByRole("menuitem", { name: "Buscar y reemplazar" }).click()

  await page.getByLabel("Buscar", { exact: true }).fill("noche")
  await page.getByLabel("Reemplazar por").fill("madrugada")
  await expect(page.getByText("2 ocurrencias en 1 escena")).toBeVisible()
  await page.getByRole("button", { name: "Reemplazar todo" }).click()
  await expect(
    page.getByRole("heading", { name: "Confirmar reemplazo" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Confirmar reemplazo" }).click()

  await expect(
    page.getByText("Se reemplazaron 2 ocurrencias correctamente."),
  ).toBeVisible()
  await expect(page.locator(".ProseMirror")).toContainText(
    "La madrugada cubría la ciudad.",
  )
  await expect(page.locator(".ProseMirror")).toContainText(
    "La madrugada llegó antes de lo esperado.",
  )
  expect(backend.sceneWrites).toHaveLength(1)
  expect(JSON.stringify(backend.getSceneContent())).not.toContain("noche")
})

test("HU-37/38 CA-112/117: crea una tarjeta de idea y la deja en su columna", async ({
  page,
}) => {
  const backend = await installMockBackend(page)

  await page.goto(`/projects/${e2eProjectId}/storyboard`)
  const ideasColumn = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Ideas" }) })
  await expect(ideasColumn).toBeVisible()
  await ideasColumn.getByRole("button", { name: "Nueva tarjeta" }).click()

  await expect(page.getByRole("heading", { name: "Nueva Tarjeta" })).toBeVisible()
  await page.getByLabel("Título de la escena *").fill("La carta bajo la puerta")
  await page
    .getByLabel("Descripción")
    .fill("La protagonista encuentra una pista que cambia su plan.")
  await page.getByRole("button", { name: "Crear tarjeta" }).click()

  await expect(ideasColumn.getByText("La carta bajo la puerta")).toBeVisible()
  expect(backend.storyboardCreates).toEqual([
    expect.objectContaining({
      title: "La carta bajo la puerta",
      description: "La protagonista encuentra una pista que cambia su plan.",
      status: "ideas",
    }),
  ])
})
