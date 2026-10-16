import { expect, test, type Page } from "@playwright/test"

// El backend responde esto cuando la cuenta no confirmó el correo. El mensaje
// importa: el frontend lo matchea además del status porque el módulo de lectura
// compartida también devuelve 403 por permisos.
const VERIFICATION_403 = {
  statusCode: 403,
  message: "Email verification required",
  error: "Forbidden",
}

const FALLBACK_DEL_DASHBOARD =
  "No se pudo cargar la lista desde la API; se muestran datos de ejemplo."

const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos."

type FirebaseEstado = {
  // Lo que trae accounts:signInWithPassword, que es lo que ve el gate de login.
  signInVerified: boolean
  // Lo que trae accounts:lookup, que es lo que ve el chequeo de /verify-email.
  lookupVerified: boolean
}

async function routeAuth(page: Page, estado: FirebaseEstado) {
  await page.route(/identitytoolkit\.googleapis\.com/, async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith("/accounts:signInWithPassword")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind: "identitytoolkit#VerifyPasswordResponse",
          localId: "e2e-writer",
          email: "writer@example.test",
          displayName: "Escritora de prueba",
          emailVerified: estado.signInVerified,
          idToken: "e2e-firebase-id-token",
          registered: true,
          refreshToken: "e2e-refresh-token",
          expiresIn: "3600",
        }),
      })
      return
    }

    if (url.pathname.endsWith("/accounts:lookup")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              localId: "e2e-writer",
              email: "writer@example.test",
              displayName: "Escritora de prueba",
              emailVerified: estado.lookupVerified,
            },
          ],
        }),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: 404, message: "no simulado" } }),
    })
  })
}

// Se mockea por puerto, no por host: NEXT_PUBLIC_API_URL puede ser localhost o
// 127.0.0.1 según cómo se haya buildado. Mismo criterio que verify-email.spec.ts.
async function routeBackend(page: Page, projectsStatus: number) {
  await page.route(/^(https?:\/\/[^/]+:3000\/.*)$/, async (route) => {
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
            avatarUrl: null,
            role: "AUTHOR",
            plan: "FREE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      })
      return
    }

    if (url.pathname === "/projects" && route.request().method() === "GET") {
      await route.fulfill({
        status: projectsStatus,
        contentType: "application/json",
        body:
          projectsStatus === 200 ? "[]" : JSON.stringify(VERIFICATION_403),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Endpoint e2e no simulado" }),
    })
  })
}

async function logIn(page: Page) {
  await page.goto("/login")

  const submit = page.getByRole("button", { name: "Iniciar sesión" })

  // El form todavía no es interactuable apenas hidrata; el retry es el mismo
  // que usa e2e/auth.setup.ts.
  await expect(async () => {
    await submit.click()
    await expect(page.getByText("El email es obligatorio.")).toBeVisible()
  }).toPass({ timeout: 10_000 })

  await page.getByLabel("Email").fill("writer@example.test")
  await page.getByLabel("Contraseña").fill("e2e-valid-password")
  await submit.click()
}

test.describe("Cuentas sin correo verificado", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("el login lleva a /verify-email y no al dashboard", async ({ page }) => {
    await routeAuth(page, { signInVerified: false, lookupVerified: false })
    await routeBackend(page, 200)

    await logIn(page)

    await expect(page).toHaveURL(/\/verify-email$/)
    await expect(page).not.toHaveURL(/\/dashboard/)

    // Un correo sin verificar no es un fallo de credenciales.
    await expect(page.getByText(CREDENCIALES_INVALIDAS)).toBeHidden()

    // Y la pantalla a la que llega tiene salida: puede reenviar el correo.
    await expect(
      page.getByRole("button", { name: "Ya verifiqué mi correo" }),
    ).toBeVisible()
  })

  test("el login verificado sigue yendo al dashboard", async ({ page }) => {
    await routeAuth(page, { signInVerified: true, lookupVerified: true })
    await routeBackend(page, 200)

    await logIn(page)

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(
      page.getByRole("heading", { name: "Mis proyectos" }),
    ).toBeVisible()
    await expect(page.getByText(CREDENCIALES_INVALIDAS)).toBeHidden()
  })

  // Red de seguridad: el gate de login mira la claim de Firebase, pero el
  // backend es quien decide. Si aún así responde el 403, el dashboard no tiene
  // que mostrar una lista rota.
  test("el dashboard redirige en vez de mostrar datos de ejemplo", async ({
    page,
  }) => {
    await routeAuth(page, { signInVerified: true, lookupVerified: false })
    await routeBackend(page, 403)

    await logIn(page)

    await expect(page).toHaveURL(/\/verify-email$/)
    await expect(page.getByText(FALLBACK_DEL_DASHBOARD)).toBeHidden()
  })
})
