import { expect, test } from "@playwright/test"

// El Worker corre en Cloudflare y no se puede alcanzar desde los e2e, así
// que interceptamos cualquier host que use la app para pedir el reset. El
// patrón matchea el host en vez de depender del valor de la env var.
const AUTH_WORKER_PATTERN = /:\/\/[^/]*api-auth\.plumia\.com\.ar(\/|$)/

test.describe("HU-44 CA-139: recuperación de contraseña", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.route(AUTH_WORKER_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })
  })

  test("el enlace de la pantalla de login abre la recuperación", async ({
    page,
  }) => {
    await page.goto("/login")

    await page
      .getByRole("button", { name: "¿Olvidaste tu contraseña?" })
      .click()

    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(
      page.getByText("Te enviaremos un enlace para elegir una contraseña nueva."),
    ).toBeVisible()
  })

  test("valida el email antes de enviar el enlace", async ({ page }) => {
    await page.goto("/forgot-password")

    await page.getByRole("button", { name: "Enviar enlace" }).click()

    await expect(
      page.getByText("El email es obligatorio.", { exact: true }),
    ).toBeVisible()

    await page.getByLabel("Email").fill("no-es-un-email")
    await page.getByRole("button", { name: "Enviar enlace" }).click()

    await expect(
      page.getByText("Introduce un email con formato válido.", { exact: true }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test("envía el enlace y muestra la confirmación", async ({ page }) => {
    const firebaseRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("identitytoolkit.googleapis.com")) {
        firebaseRequests.push(request.url())
      }
    })

    await page.goto("/forgot-password")

    const sent = page.waitForRequest(AUTH_WORKER_PATTERN)

    await page.getByLabel("Email").fill("jane@example.test")
    await page.getByRole("button", { name: "Enviar enlace" }).click()

    const request = await sent
    expect(request.method()).toBe("POST")
    expect(request.headers()["content-type"]).toContain("application/json")
    expect(request.postDataJSON()).toEqual({
      email: "jane@example.test",
      action: "password-reset",
    })

    await expect(
      page.getByText(
        "Si existe una cuenta con ese email te enviaremos un enlace a jane@example.test.",
      ),
    ).toBeVisible()

    const resend = page.getByRole("button", { name: /Reenviar en \d+s/ })
    await expect(resend).toBeVisible()
    await expect(resend).toBeDisabled()

    // El flujo ya no pasa por Firebase: todo lo auténtica el Worker.
    expect(firebaseRequests).toEqual([])
  })

  test("muestra un error si el Worker falla", async ({ page }) => {
    await page.route(AUTH_WORKER_PATTERN, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false }),
      })
    })

    await page.goto("/forgot-password")

    await page.getByLabel("Email").fill("jane@example.test")
    await page.getByRole("button", { name: "Enviar enlace" }).click()

    await expect(
      page.getByText(
        "No se pudo enviar el correo. Intentá de nuevo en unos minutos.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText(/Si existe una cuenta con ese email/),
    ).toBeHidden()

    // El botón vuelve a estar habilitado para reintentar.
    await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeEnabled()
  })

  test("muestra un error si no hay conexión con el Worker", async ({
    page,
  }) => {
    await page.route(AUTH_WORKER_PATTERN, async (route) => {
      await route.abort("failed")
    })

    await page.goto("/forgot-password")

    await page.getByLabel("Email").fill("jane@example.test")
    await page.getByRole("button", { name: "Enviar enlace" }).click()

    await expect(
      page.getByText(
        "No pudimos conectar. Revisá tu conexión a internet y probá de nuevo.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText(/Si existe una cuenta con ese email/),
    ).toBeHidden()
  })

  test("permite volver a iniciar sesión", async ({ page }) => {
    await page.goto("/forgot-password")

    await page.getByRole("button", { name: "Iniciar sesión" }).click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel("Email")).toBeVisible()
  })

  test("muestra la confirmación al volver del enlace", async ({ page }) => {
    await page.goto("/login?reset=success")

    await expect(
      page.getByText(
        "Tu contraseña fue actualizada. Iniciá sesión con la nueva.",
      ),
    ).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()

    await page.goto("/login")
    await expect(
      page.getByText(
        "Tu contraseña fue actualizada. Iniciá sesión con la nueva.",
      ),
    ).toBeHidden()
  })
})
