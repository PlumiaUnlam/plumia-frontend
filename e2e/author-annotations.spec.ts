import { expect, test } from "@playwright/test"

import type { AuthorAnnotation } from "@/types/author-annotation"
import { e2eProjectId, installMockBackend } from "./support/mock-backend"

const writer = {
  id: "e2e-writer",
  name: "Escritora",
  lastname: "Prueba",
  displayName: "Escritora de prueba",
  avatarUrl: null,
}

const annotationsNewestFirst: AuthorAnnotation[] = [
  {
    id: "annotation-expected",
    sceneId: "e2e-scene",
    authorId: writer.id,
    author: writer,
    body: "Revisar la frase del final.",
    quote: "esperado",
    anchorFrom: null,
    anchorTo: null,
    contextBefore: null,
    contextAfter: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    resolvedAt: null,
  },
  {
    id: "annotation-city",
    sceneId: "e2e-scene",
    authorId: writer.id,
    author: writer,
    body: "Comprobar este detalle.",
    quote: "ciudad",
    anchorFrom: null,
    anchorTo: null,
    contextBefore: null,
    contextAfter: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
  },
]

test("HU-annotations: ordena, enfoca, resuelve, reabre y elimina anotaciones privadas", async ({
  page,
}) => {
  const backend = await installMockBackend(page, {
    authorAnnotations: annotationsNewestFirst,
  })

  await page.goto(`/projects/${e2eProjectId}/editor`)
  await page.getByRole("button", { name: "El umbral 10 palabras" }).click()

  const editor = page.locator(".ProseMirror")
  await expect(editor).toContainText("La noche cubría la ciudad")
  const markers = page.locator("[data-author-annotation-marker-id]")
  await expect(markers).toHaveCount(2)
  await expect(
    page.locator('[data-author-annotation-marker-id="annotation-city"] > span'),
  ).toHaveText("1")
  await expect(
    page.locator('[data-author-annotation-marker-id="annotation-expected"] > span'),
  ).toHaveText("2")
  await expect(editor.locator(".author-annotation-anchor")).toHaveCount(0)

  const menuBar = page.getByRole("menubar", { name: "Menús del editor" })
  await menuBar.getByRole("menuitem", { name: "Revisar" }).click()
  await page.getByRole("menuitem", { name: "Ocultar iconos de anotación" }).click()
  await expect(markers).toHaveCount(0)

  await menuBar.getByRole("menuitem", { name: "Revisar" }).click()
  await page.getByRole("menuitem", { name: "Mostrar comentarios" }).click()
  await expect(page.getByRole("heading", { name: "Comentarios" })).toBeVisible()
  const cards = page.locator('article[id^="author-annotation-"]')
  await expect(cards).toHaveCount(2)
  await expect
    .poll(() => cards.evaluateAll((items) => items.map((item) => item.id)))
    .toEqual([
      "author-annotation-annotation-city",
      "author-annotation-annotation-expected",
    ])
  await expect(editor.locator(".author-annotation-anchor")).toHaveCount(0)

  const cityMarker = page.locator(
    '[data-author-annotation-marker-id="annotation-city"]',
  )
  const expectedMarker = page.locator(
    '[data-author-annotation-marker-id="annotation-expected"]',
  )
  await cityMarker.click()
  await expect(editor.locator(".author-annotation-anchor")).toHaveText("ciudad")
  await expectedMarker.click()
  await expect(editor.locator(".author-annotation-anchor")).toHaveText("esperado")
  await expectedMarker.click()
  await expect(page.getByRole("heading", { name: "Comentarios" })).toHaveCount(0)
  await expect(editor.locator(".author-annotation-anchor")).toHaveCount(0)

  await cityMarker.click()
  const cityCard = page.locator("#author-annotation-annotation-city")
  await cityCard.getByRole("button", { name: "Resolver anotación" }).click()
  await expect.poll(() => backend.annotationUpdates.length).toBe(1)
  expect(backend.annotationUpdates[0]).toEqual({
    id: "annotation-city",
    payload: { isResolved: true },
  })

  await page.getByRole("button", { name: /Resueltos/ }).click()
  await expect(cityCard).toBeVisible()
  await cityCard.getByRole("button", { name: "Reabrir anotación" }).click()
  await expect.poll(() => backend.annotationUpdates.length).toBe(2)
  expect(backend.annotationUpdates[1]).toEqual({
    id: "annotation-city",
    payload: { isResolved: false },
  })

  await page.getByRole("button", { name: /Abiertos/ }).click()
  await expect(cityCard).toBeVisible()
  await cityCard.getByRole("button", { name: "Resolver anotación" }).click()
  await expect.poll(() => backend.annotationUpdates.length).toBe(3)
  await page.getByRole("button", { name: /Resueltos/ }).click()
  await expect(cityCard).toBeVisible()
  await cityCard.getByRole("button", { name: "Eliminar anotación" }).click()
  await expect(cityCard).toHaveCount(0)
  await expect.poll(() => backend.annotationDeletes).toEqual(["annotation-city"])

  await page.getByRole("button", { name: /Abiertos/ }).click()
  const expectedCard = page.locator("#author-annotation-annotation-expected")
  await expect(expectedCard).toBeVisible()
  await expectedCard.getByRole("button", { name: "Eliminar anotación" }).click()
  await expect(expectedCard).toHaveCount(0)
  await expect.poll(() => backend.annotationDeletes).toEqual([
    "annotation-city",
    "annotation-expected",
  ])
  expect(backend.getAuthorAnnotations()).toHaveLength(0)
})
