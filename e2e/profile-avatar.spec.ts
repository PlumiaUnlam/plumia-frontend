import { expect, test, type Page } from "@playwright/test"

import { installMockBackend } from "./support/mock-backend"

const timestamp = "2026-01-01T00:00:00.000Z"
const BACKEND_PATTERN = /^(https?:\/\/[^/]+:3000\/.*)$/

// La foto guardada vive en storage, pero el avatar la pide como ruta relativa
// al front (el rewrite la deriva al backend), así que se intercepta del origin
// del front y no del 3000.
const AVATAR_PATH_PATTERN = /\/api\/storage\/profile-image\//

// PNG válido de 1x1: hace falta que el <img> cargue de verdad, porque si
// falla el componente vuelve a las iniciales y el test dejaría de probar lo
// que quiere probar.
const PNG_MINIMO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

// El usuario entra con una foto ya guardada, que es el estado donde se veían
// los dos problemas: el botón seguía diciendo "Cambiar imagen" después de
// quitarla, y las iniciales se dibujaban detrás de la imagen.
async function routeUsuarioConFoto(page: Page) {
  await page.route(BACKEND_PATTERN, async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === "/auth/login") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "e2e-writer",
            name: "Escritora",
            lastname: "Prueba",
            email: "writer@example.test",
            displayName: "Escritora de prueba",
            avatarUrl: "https://storage.example.test/e2e-writer/avatar.png",
            role: "AUTHOR",
            plan: "FREE",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        }),
      })
      return
    }

    await route.fallback()
  })

  await page.route(AVATAR_PATH_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: PNG_MINIMO,
    })
  })
}

test.describe("Foto de perfil en el diálogo de configurar perfil", () => {
  test("las iniciales solo aparecen cuando no hay foto, y el botón sigue el estado", async ({
    page,
  }) => {
    await installMockBackend(page)
    await routeUsuarioConFoto(page)
    await page.goto("/dashboard")

    await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
    await page.getByRole("menuitem", { name: "Configurar perfil" }).click()

    // El avatar del header también vive en la página, así que hay que acotarse
    // al del diálogo para no mezclar los dos.
    const dialog = page.getByRole("dialog")
    const iniciales = dialog.locator('[data-slot="avatar-fallback"]')

    // Con foto guardada la imagen ocupa el avatar sola. El fallback montado
    // atrás se leía a través de un PNG sin fondo.
    await expect(dialog.locator('img[alt="Vista previa"]')).toBeVisible()
    await expect(iniciales).toHaveCount(0)
    await expect(
      dialog.getByRole("button", { name: "Cambiar imagen" }),
    ).toBeVisible()

    // Al quitarla ya no hay imagen que cambiar: vuelven las iniciales y el
    // botón pasa a pedir que la suban.
    await dialog.getByRole("button", { name: "Quitar" }).click()

    await expect(dialog.locator('img[alt="Vista previa"]')).toHaveCount(0)
    await expect(iniciales).toHaveText("ED")
    await expect(
      dialog.getByRole("button", { name: "Subir imagen" }),
    ).toBeVisible()
  })
})
