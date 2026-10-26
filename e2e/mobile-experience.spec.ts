import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"

// Micrófono falso de Chromium: emite un tono, así el hook detecta señal de audio.
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
})

const home = `/projects/${projectId}`

async function stubVoiceBackend(page: Page, transcript: string) {
  await page.route("**/speech-to-text/transcribe", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ text: transcript, language: "es" }),
    }),
  )
}

test.describe("Hub del proyecto", () => {
  test("muestra las secciones de mobile y bloquea lo que es solo de PC", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(home)

    await expect(page.getByRole("heading", { name: "Crónicas del viento" })).toBeVisible()
    for (const name of ["Worldbuilding", "Notas e ideas", "Estadísticas"]) {
      await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible()
    }
    await expect(page.getByRole("navigation", { name: "Secciones del proyecto" })).toBeVisible()

    await page.getByRole("button", { name: /Editor/ }).click()
    const notice = page.getByRole("dialog", { name: "Disponible en computadora" })
    await expect(notice).toBeVisible()
    await notice.getByRole("button", { name: "Entendido" }).click()
    await expect(notice).toBeHidden()
  })

  test("abrir el editor por enlace directo vuelve al hub con el aviso", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(`${home}/editor`)

    await expect(page).toHaveURL(new RegExp(`${home}\\?desktop=editor`))
    await expect(page.getByRole("dialog", { name: "Disponible en computadora" })).toBeVisible()
    await page.getByRole("button", { name: "Entendido" }).click()
    await expect(page).toHaveURL(new RegExp(`${home}$`))
  })
})

test.describe("Worldbuilding en mobile", () => {
  test("sin Relaciones, y la wiki alterna entre lista y detalle", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(`${home}/worldbuilding`)

    await expect(page.getByRole("tab", { name: /Wiki del Universo/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Relaciones/ })).toHaveCount(0)
    await expect(page.getByText("Selecciona una entidad")).toBeHidden()

    await page.getByText("Tomás Reyes").first().click()
    await expect(page.getByRole("button", { name: "Entidades" })).toBeVisible()
    await expect(page.getByPlaceholder("Buscar entidades...")).toBeHidden()

    await page.getByRole("button", { name: "Entidades" }).click()
    await expect(page.getByPlaceholder("Buscar entidades...")).toBeVisible()
  })

  test("un enlace a Relaciones cae en la wiki", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(`${home}/worldbuilding?tab=relationships`)
    await expect(page.getByRole("tab", { name: /Wiki del Universo/ })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })
})

test.describe("Notas por voz en mobile", () => {
  test("una columna a la vez, sin matriz, y la nota por voz crea una tarjeta en Ideas", async ({ page }) => {
    const backend = await installModalBackend(page)
    await stubVoiceBackend(page, "La emboscada en el bosque. Cae la noche.")
    await page.goto(`${home}/storyboard`)

    await expect(page.getByRole("tab", { name: /Ideas/ })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("button", { name: "Matriz" })).toBeHidden()
    await page.getByRole("tab", { name: /Planificado/ }).click()
    await expect(page.getByRole("heading", { name: "Planificado" })).toBeVisible()
    await page.getByRole("tab", { name: /Ideas/ }).click()

    await page.getByRole("button", { name: "Grabar nota por voz" }).click()
    await page.getByRole("button", { name: "Detener y guardar la nota" }).click()

    await expect(page.getByText("La emboscada en el bosque", { exact: true })).toBeVisible()
    const creates = backend.callsTo("POST", /storyboard-cards$/)
    expect(creates).toHaveLength(1)
    expect(creates[0].body).toMatchObject({
      title: "La emboscada en el bosque",
      description: "La emboscada en el bosque. Cae la noche.",
      status: "ideas",
    })
  })

  test("si falla la carga del audio la nota queda guardada y se reintenta sin duplicarla", async ({ page }) => {
    const backend = await installModalBackend(page)
    await stubVoiceBackend(page, "La emboscada en el bosque. Cae la noche.")
    let uploadAttempts = 0
    await page.route("**/api/storage/upload-url", (route) => {
      uploadAttempts += 1
      if (uploadAttempts === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Almacenamiento no disponible" }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          presignedUrl: "http://127.0.0.1:3101/e2e-audio-upload",
          publicUrl: "http://127.0.0.1:3101/e2e-audio-upload",
          storageKey: "storyboard-audio/e2e.webm",
        }),
      })
    })
    await page.route("**/e2e-audio-upload", (route) => route.fulfill({ status: 200 }))
    await page.route("**/storyboard-cards/*/audio", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    )
    await page.goto(`${home}/storyboard`)

    await page.getByRole("button", { name: "Grabar nota por voz" }).click()
    await page.getByRole("button", { name: "Detener y guardar la nota" }).click()

    await expect(page.getByText(/no se pudo guardar la nota de voz/)).toBeVisible()
    await page.getByRole("button", { name: "Reintentar" }).click()

    await expect(page.getByText("Nota guardada en Ideas")).toBeVisible()
    expect(uploadAttempts).toBe(2)
    expect(backend.callsTo("POST", /storyboard-cards$/)).toHaveLength(1)
  })

  test("si la transcripción falla no se crea ninguna tarjeta", async ({ page }) => {
    const backend = await installModalBackend(page)
    await page.route("**/speech-to-text/transcribe", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    )
    await page.goto(`${home}/storyboard`)

    await page.getByRole("button", { name: "Grabar nota por voz" }).click()
    await page.getByRole("button", { name: "Detener y guardar la nota" }).click()

    await expect(page.getByRole("alert")).toBeVisible()
    expect(backend.callsTo("POST", /storyboard-cards$/)).toHaveLength(0)
  })
})

test("estadísticas se abren desde la barra inferior", async ({ page }) => {
  await installModalBackend(page)
  await page.goto(home)
  await page.getByRole("navigation", { name: "Secciones del proyecto" }).getByRole("link", { name: "Stats" }).click()
  await expect(page).toHaveURL(/\/statistics$/)
})

test.describe("Lector compartido en mobile", () => {
  async function selectWord(page: Page, word: string) {
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

  test("seleccionar texto ofrece comentar; el comentario queda en el panel de comentarios", async ({ page }) => {
    const backend = await installModalBackend(page)
    await page.goto("/shared/invitacion-1?token=token-1")
    await expect(page.locator(".ProseMirror p").first()).toContainText("La noche cubría la ciudad.")

    // La selección no abre el formulario sola: aparece la barra y se puede descartar.
    await selectWord(page, "noche")
    const bar = page.getByRole("region", { name: "Comentar selección" })
    await expect(bar).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Comentar selección" })).toBeHidden()
    await bar.getByRole("button", { name: "Descartar selección" }).click()
    await expect(bar).toBeHidden()

    await selectWord(page, "noche")
    await bar.getByRole("button", { name: "Comentar" }).click()
    const dialog = page.getByRole("dialog", { name: "Comentar selección" })
    await dialog.getByLabel("Comentario").fill("¿Y si la noche llegara antes?")
    await dialog.getByRole("button", { name: "Comentar" }).click()
    await expect(dialog).toBeHidden()

    const created = backend.callsTo("POST", /\/reading\/invitations\/invitacion-1\/comments$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ selectedText: "noche", body: "¿Y si la noche llegara antes?" })

    await page.getByRole("button", { name: /Comentarios \(1\)/ }).click()
    const sheet = page.getByRole("dialog", { name: "Comentarios" })
    await expect(sheet.getByText("¿Y si la noche llegara antes?", { exact: true })).toBeVisible()
  })
})

test.describe("Lectores y comentarios (autora)", () => {
  test("sin versiones compartidas explica cómo compartir", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(`${home}/shares`)

    await expect(page.getByRole("heading", { name: "Lectores y comentarios" })).toBeVisible()
    await expect(page.getByText("Todavía no compartiste tu obra")).toBeVisible()
  })

  test("lista las versiones compartidas con sus comentarios pendientes y abre el lector", async ({ page }) => {
    await installModalBackend(page)
    const share = {
      id: "share-1",
      slug: "invitacion-1",
      invitedEmail: "lectora@example.com",
      permission: "COMMENT",
      status: "ACCEPTED",
      expiresAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      frozenAt: "2026-01-01T00:00:00.000Z",
    }
    const comment = (id: string, status: string) => ({
      id,
      snapshotSceneId: "e2e-scene",
      anchorFrom: 1,
      anchorTo: 6,
      selectedText: "La noche",
      body: "Me gusta",
      prefix: null,
      suffix: null,
      status,
      isVisible: true,
      replies: [],
      statusHistory: [],
      author: { id: null, displayName: "Lectora" },
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    })
    await page.route("**/books/*/shares", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([share]) }),
    )
    await page.route("**/reading/invitations/invitacion-1/comments", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([comment("c1", "OPEN"), comment("c2", "OPEN"), comment("c3", "RESOLVED")]),
      }),
    )
    await page.goto(`${home}/shares`)

    const row = page.getByRole("link", { name: /Abrir versión compartida con lectora@example.com/ })
    await expect(row).toBeVisible()
    await expect(row.getByLabel("2 comentarios pendientes")).toBeVisible()
    await row.click()
    await expect(page).toHaveURL(/\/shared\/invitacion-1$/)
  })
})
