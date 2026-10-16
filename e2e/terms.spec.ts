import { expect, test } from "@playwright/test"

test.describe("Términos y condiciones", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.route(
      /^(https:\/\/identitytoolkit\.googleapis\.com\/.*|https?:\/\/[^/]+:3000\/.*)$/,
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ message: "Endpoint e2e no simulado" }),
        })
      },
    )
  })

  // El proxy.ts usa una lista blanca en su matcher, así que esta ruta no
  // debería redirigir a /login por no tener sesión.
  test("la página es pública y muestra sus secciones", async ({ page }) => {
    await page.goto("/terminos-y-condiciones")

    await expect(page).toHaveURL(/\/terminos-y-condiciones$/)
    await expect(
      page.getByText("Términos y condiciones", { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "4. Servicios con inteligencia artificial" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "6. Privacidad de tus datos" }),
    ).toBeVisible()
  })

  test("el enlace del registro abre en otra pestaña sin marcar la aceptación", async ({
    page,
  }) => {
    await page.goto("/register")

    const link = page.getByRole("link", { name: "términos y condiciones" })
    const checkbox = page.getByRole("checkbox")

    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("target", "_blank")
    await expect(checkbox).toHaveAttribute("aria-checked", "false")

    const [popup] = await Promise.all([
      page.context().waitForEvent("page"),
      link.click(),
    ])
    await popup.waitForLoadState()

    expect(popup.url()).toContain("/terminos-y-condiciones")
    await expect(
      popup.getByText("Términos y condiciones", { exact: true }),
    ).toBeVisible()

    // El enlace vive dentro del <label> del checkbox: abrir los términos no
    // puede implicar aceptarlos.
    await expect(checkbox).toHaveAttribute("aria-checked", "false")
    // El registro queda abierto en la pestaña original, sin perder el formulario.
    await expect(page).toHaveURL(/\/register$/)
  })
})
