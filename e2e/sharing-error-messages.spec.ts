import { expect, test, type Route } from "@playwright/test"

const BACKEND_PATTERN = /^(https?:\/\/[^/]+:3000\/.*)$/
const IDENTITYTOOLKIT_PATTERN = /identitytoolkit\.googleapis\.com/

// El lector compartido abre la invitación con GET /reading/invitations/:slug.
// El backend responde con `{ statusCode, message, error }` y el message viene
// en inglés, así que el frontend tiene que traducirlo antes de mostrarlo.
async function routeInvitacion(
  route: Route,
  status: number,
  message: string,
) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ statusCode: status, message, error: "Error" }),
  })
}

async function abrirInvitacion(
  page: import("@playwright/test").Page,
  status: number,
  message: string,
) {
  // El lector solo pide el manuscrito si hay sesión de Firebase
  // (shared-reader.tsx:94). La sesión persistida vive en IndexedDB y Firebase
  // la renueva contra accounts:lookup al arrancar: si ese request sale a la
  // red real y falla, cierra la sesión y el lector muestra el gate de Google.
  // Por eso hay que mockear el host aunque el caso de prueba no lo toque.
  await page.route(IDENTITYTOOLKIT_PATTERN, async (route) => {
    const url = new URL(route.request().url())

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
              emailVerified: true,
            },
          ],
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        idToken: "e2e-firebase-id-token",
        refreshToken: "e2e-refresh-token",
        expiresIn: "3600",
        user_id: "e2e-writer",
      }),
    })
  })

  // Corremos con el estado autenticado que deja auth.setup.ts. Con `?token=`
  // el flujo usa el accept, no el GET.
  await page.route(BACKEND_PATTERN, async (route) => {
    const url = new URL(route.request().url())

    if (/^\/reading\/invitations\/[^/]+(\/accept)?$/.test(url.pathname)) {
      await routeInvitacion(route, status, message)
      return
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: "Endpoint e2e no simulado" }),
    })
  })

  await page.goto("/shared/libro-de-prueba?token=e2e-token")
}

test.describe("Mensajes de error del lector compartido", () => {
  test("una invitación vencida se explica en español", async ({ page }) => {
    await abrirInvitacion(page, 410, "Share invitation has expired")

    await expect(page.getByText("Esta invitación caducó.")).toBeVisible()
    await expect(page.getByText("Share invitation has expired")).toBeHidden()
  })

  test("una invitación revocada se explica en español", async ({ page }) => {
    await abrirInvitacion(
      page,
      410,
      "Share invitation is no longer active",
    )

    await expect(
      page.getByText("Esta invitación ya no está activa."),
    ).toBeVisible()
    await expect(
      page.getByText("Share invitation is no longer active"),
    ).toBeHidden()
  })

  test("una invitación inexistente se explica en español", async ({ page }) => {
    await abrirInvitacion(page, 404, "Share invitation not found")

    await expect(
      page.getByText("No encontramos esta invitación."),
    ).toBeVisible()
    await expect(page.getByText("Share invitation not found")).toBeHidden()
  })

  // Regresión del gate de verificación: el módulo de lectura también devuelve
  // 403 por permisos. Un 403 acá NO significa que el correo esté sin verificar.
  test("un 403 por permisos no se confunde con correo sin verificar", async ({
    page,
  }) => {
    await abrirInvitacion(
      page,
      403,
      "You do not have access to this version",
    )

    await expect(
      page.getByText("No tenés acceso a esta versión."),
    ).toBeVisible()
    await expect(
      page.getByText("You do not have access to this version"),
    ).toBeHidden()
    await expect(
      page.getByText("Tu correo todavía no está verificado."),
    ).toBeHidden()
  })
})
