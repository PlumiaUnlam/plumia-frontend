import { expect, test } from "@playwright/test"

test.describe("HU-44 CA-138: formulario de registro", () => {
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

    await page.goto("/register")
  })

  test("pide nombre, apellido y nombre de usuario por separado", async ({
    page,
  }) => {
    await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Apellido", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Nombre de usuario")).toBeVisible()

    const submit = page.getByRole("button", { name: "Crear cuenta" })

    await expect(async () => {
      await submit.click()
      await expect(
        page.getByText("El nombre es obligatorio.", { exact: true }),
      ).toBeVisible()
    }).toPass({ timeout: 10_000 })

    await expect(
      page.getByText("El apellido es obligatorio.", { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText("El nombre de usuario es obligatorio.", { exact: true }),
    ).toBeVisible()

    await expect(page).toHaveURL(/\/register$/)
  })

  test("no crea la cuenta si faltan los campos de nombre", async ({
    page,
  }) => {
    await page.getByLabel("Nombre", { exact: true }).fill("Jane")
    await page.getByLabel("Apellido", { exact: true }).fill("Doe")
    await page.getByLabel("Nombre de usuario").fill("jane.doe")
    await page.getByLabel("Email").fill("jane@example.test")
    await page
      .getByLabel("Contraseña", { exact: true })
      .fill("e2e-valid-password")
    await page
      .getByLabel("Confirmar contraseña")
      .fill("e2e-valid-password")

    await page.getByRole("button", { name: "Crear cuenta" }).click()

    await expect(
      page.getByText("El nombre de usuario es obligatorio.", { exact: true }),
    ).toBeHidden()
    await expect(page).toHaveURL(/\/register$/)
  })
})