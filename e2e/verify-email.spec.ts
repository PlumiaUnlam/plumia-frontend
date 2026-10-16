import { expect, test, type Page, type Route } from "@playwright/test"

// El Worker corre en Cloudflare y no se puede alcanzar desde los e2e, así que
// interceptamos cualquier host que use la app. El patrón matchea el host en vez
// de depender del valor de la env var.
const AUTH_WORKER_PATTERN = /:\/\/[^/]*api-auth\.plumia\.com\.ar(\/|$)/
const IDENTITYTOOLKIT_PATTERN = /identitytoolkit\.googleapis\.com/

const UNVERIFIED_USER = {
  localId: "e2e-writer",
  email: "writer@example.test",
  displayName: "Escritora de prueba",
  emailVerified: false,
}

const VERIFIED_USER = { ...UNVERIFIED_USER, emailVerified: true }

type WorkerCall = {
  method: string
  body: unknown
}

type WorkerResponder = (route: Route) => Promise<void>

// Registra los oobCode que Firebase manda por su cuenta. El flujo nuevo usa
// returnOobLink, así que NO debería aparecer ninguno acá.
function trackFirebaseOob(page: Page) {
  const oobRequests: string[] = []

  page.on("request", (request) => {
    const url = request.url()
    if (
      url.includes("identitytoolkit.googleapis.com") &&
      url.includes("sendOobCode")
    ) {
      oobRequests.push(url)
    }
  })

  return oobRequests
}

// Firebase solo se usa para `accounts:lookup` (el reload del auto-chequeo).
// Todo lo demás responde 404: si la app vuelve a llamar a Firebase para enviar
// el mail, ese 404 rompe el flujo y lo hace visible.
async function routeIdentityToolkit(page: Page, user: typeof UNVERIFIED_USER) {
  await page.route(IDENTITYTOOLKIT_PATTERN, async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname.endsWith("/accounts:lookup")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: [user] }),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: 404, message: "Endpoint e2e no simulado" },
      }),
    })
  })
}

// El backend se mockea por puerto, no por host: NEXT_PUBLIC_API_URL puede ser
// localhost o 127.0.0.1 según cómo se haya buildado, y el test no tiene que
// depender de eso. Mismo criterio que e2e/support/mock-backend.ts.
const BACKEND_PATTERN = /^(https?:\/\/[^/]+:3000\/.*)$/

async function routeBackend(page: Page) {
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
        status: 200,
        contentType: "application/json",
        body: "[]",
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

async function routeWorker(page: Page, respond: WorkerResponder) {
  const calls: WorkerCall[] = []

  await page.route(AUTH_WORKER_PATTERN, async (route) => {
    const request = route.request()
    calls.push({ method: request.method(), body: request.postDataJSON() })
    await respond(route)
  })

  return calls
}

// Cada tick del cooldown vuelve a agendar el setTimeout recién después de que
// React re-renderiza, así que un runFor(60_000) de una sola vez solo consume el
// timer que ya estaba vencido. Avanzamos de a un segundo hasta que se desbloquee.
async function expireCooldown(page: Page) {
  const resend = page.getByRole("button", { name: "Reenviar correo" })

  for (let i = 0; i < 100 && !(await resend.count()); i++) {
    await page.clock.runFor(1_000)
  }

  await expect(resend).toBeEnabled()
}

const respondOk: WorkerResponder = async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  })
}

const respond500: WorkerResponder = async (route) => {
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: "boom" }),
  })
}

const respondNetworkError: WorkerResponder = async (route) => {
  await route.abort("failed")
}

test.describe("HU-44 CA-139: verificación de email", () => {
  // /verify-email redirige al dashboard en cuanto detecta emailVerified, así
  // que usamos la sesión que auth.setup.ts guarda como NO verificada.
  test.use({ storageState: "./test-results/.auth/unverified-user.json" })

  test.beforeEach(async ({ page }) => {
    await routeIdentityToolkit(page, UNVERIFIED_USER)
    await routeBackend(page)
  })

  test("reenvía el correo desde el Worker y arranca en cooldown", async ({
    page,
  }) => {
    // Al llegar de registrar ya se envió un mail: hay 60s de cooldown.
    // Congelamos el reloj en vez de esperar un minuto real.
    await page.clock.install()
    const oobRequests = trackFirebaseOob(page)
    const calls = await routeWorker(page, respondOk)

    await page.goto("/verify-email")

    await expect(
      page.getByText("Te enviamos un correo a writer@example.test"),
    ).toBeVisible()

    const cooldownButton = page.getByRole("button", { name: /Reenviar en \d+s/ })
    await expect(cooldownButton).toBeVisible()
    await expect(cooldownButton).toBeDisabled()

    await expireCooldown(page)

    await page.getByRole("button", { name: "Reenviar correo" }).click()

    await expect(
      page.getByText(
        "Te enviamos un correo nuevo. Revisá tu bandeja de entrada.",
      ),
    ).toBeVisible()

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe("POST")
    expect(calls[0].body).toEqual({
      email: "writer@example.test",
      action: "verify-email",
    })

    // El mail lo manda el Worker con returnOobLink: Firebase no debe enviar nada.
    expect(oobRequests).toEqual([])
    await expect(page).toHaveURL(/\/verify-email$/)
  })

  test("muestra un error si el Worker falla", async ({ page }) => {
    await page.clock.install()
    const calls = await routeWorker(page, respond500)

    await page.goto("/verify-email")
    await expireCooldown(page)

    await page.getByRole("button", { name: "Reenviar correo" }).click()

    await expect(
      page.getByText(
        "No se pudo enviar el correo. Intentá de nuevo en unos minutos.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText("Te enviamos un correo nuevo. Revisá tu bandeja de entrada."),
    ).toBeHidden()
    expect(calls).toHaveLength(1)
  })

  test("muestra un error si no hay conexión con el Worker", async ({
    page,
  }) => {
    await page.clock.install()
    const calls = await routeWorker(page, respondNetworkError)

    await page.goto("/verify-email")
    await expireCooldown(page)

    await page.getByRole("button", { name: "Reenviar correo" }).click()

    await expect(
      page.getByText(
        "No pudimos conectar. Revisá tu conexión a internet y probá de nuevo.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText("Te enviamos un correo nuevo. Revisá tu bandeja de entrada."),
    ).toBeHidden()
    expect(calls).toHaveLength(1)
  })

  test("el auto-chequeo lleva al dashboard cuando Firebase ya verificó", async ({
    page,
  }) => {
    // El reload del auto-chequeo devuelve emailVerified: true.
    await routeIdentityToolkit(page, VERIFIED_USER)
    const oobRequests = trackFirebaseOob(page)

    await page.goto("/verify-email")

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(
      page.getByRole("heading", { name: "Mis proyectos" }),
    ).toBeVisible()
    expect(oobRequests).toEqual([])
  })
})
