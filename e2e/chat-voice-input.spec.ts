import { expect, test } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import { openEditor } from "./support/modal-helpers"

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
})

test.describe("Dictado de consulta al chat", () => {
  test("HU-56 CA-172: transcribe la pregunta y la deja editable antes de enviarla", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await page.route("**/speech-to-text/transcribe", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "¿Quién encontró el códice?", language: "es" }),
      }),
    )
    await openEditor(page)
    await page.getByRole("button", { name: /Chat IA/ }).click()

    const input = page.getByPlaceholder("Preguntá sobre tu obra o PlumIA...")
    await input.fill("Pregunta anterior")
    await page.getByRole("button", { name: "Dictar pregunta" }).click()
    await page.getByRole("button", { name: "Detener dictado" }).click()

    await expect(input).toHaveValue("Pregunta anterior ¿Quién encontró el códice?")
    await expect(page.getByRole("button", { name: "Enviar consulta" })).toBeEnabled()
    expect(backend.callsTo("POST", /\/chat\/threads\/[^/]+\/messages$/)).toHaveLength(0)
  })

  test("HU-56 CA-173: informa un fallo de transcripción y permite escribir y reintentar", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    let attempts = 0
    await page.route("**/speech-to-text/transcribe", (route) => {
      attempts += 1
      if (attempts === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "No se pudo transcribir la grabación." }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "Transcripción recuperada.", language: "es" }),
      })
    })
    await openEditor(page)
    await page.getByRole("button", { name: /Chat IA/ }).click()

    const input = page.getByPlaceholder("Preguntá sobre tu obra o PlumIA...")
    const alert = page.locator("form [role=alert]")
    await page.getByRole("button", { name: "Dictar pregunta" }).click()
    await page.getByRole("button", { name: "Detener dictado" }).click()
    await expect(alert).toContainText("No se pudo transcribir la grabación.")

    await input.fill("Consulta escrita.")
    await page.getByRole("button", { name: "Dictar pregunta" }).click()
    await page.getByRole("button", { name: "Detener dictado" }).click()
    await expect(input).toHaveValue("Consulta escrita. Transcripción recuperada.")
    await expect(alert).toHaveCount(0)
    expect(attempts).toBe(2)
    expect(backend.callsTo("POST", /\/chat\/threads\/[^/]+\/messages$/)).toHaveLength(0)
  })
})
