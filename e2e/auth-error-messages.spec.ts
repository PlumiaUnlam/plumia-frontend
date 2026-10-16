import { expect, test, type Page, type Route } from "@playwright/test"

// register() fuerza un refresh con getIdToken(true), que va a securetoken y no
// a identitytoolkit: si ese host queda sin mockear el request sale a la red
// real y Firebase devuelve un código que no tiene nada que ver con el caso.
const FIREBASE_HOSTS_PATTERN = /(?:identitytoolkit|securetoken)\.googleapis\.com/
const BACKEND_PATTERN = /^(https?:\/\/[^/]+:3000\/.*)$/
// El Worker corre en Cloudflare: sin mockearlo la llamada se va por la red
// real y el resultado del test depende de internet.
const AUTH_WORKER_PATTERN = /:\/\/[^/]*api-auth\.plumia\.com\.ar(\/|$)/

const timestamp = "2026-01-01T00:00:00.000Z"

const BACKEND_USER = {
  id: "e2e-writer",
  name: "Escritora",
  lastname: "Prueba",
  email: "writer@example.test",
  displayName: "Escritora de prueba",
  avatarUrl: null,
  role: "AUTHOR",
  plan: "FREE",
  createdAt: timestamp,
  updatedAt: timestamp,
}

// Así responde el endpoint de Firebase y así lo traduce el SDK a un code
// `auth/*`. El mapeo está en @firebase/auth (ServerError -> AuthErrorCode):
// INVALID_PASSWORD -> auth/wrong-password, TOO_MANY_ATTEMPTS_TRY_LATER ->
// auth/too-many-requests, EMAIL_EXISTS -> auth/email-already-in-use.
function firebaseServerBody(code: string, status: number) {
  return { error: { code: status, message: code } }
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

// El SDK decodifica el idToken como JWT (lee el `exp` para saber si hay que
// refrescar). Un string plano revienta con "Cannot read properties of
// undefined (reading 'length')" adentro de Firebase, que no tiene nada que ver
// con lo que se está probando. `register()` además fuerza un refresh, que va a
// securetoken y vuelve a necesitar un JWT parseable.
function fakeJwt(emailVerified = true) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url")

  return [
    encode({ alg: "none", typ: "JWT" }),
    encode({
      sub: "e2e-writer",
      email: "writer@example.test",
      email_verified: emailVerified,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    "e2e-signature",
  ].join(".")
}

// `cuentaResponde` decide qué devuelven accounts:signInWithPassword y
// accounts:signUp. El resto de los endpoints de Firebase responden un token
// válido para que no intervengan en el caso que se está probando.
async function routeFirebase(
  page: Page,
  cuentaResponde: (route: Route) => Promise<void>,
) {
  await page.route(FIREBASE_HOSTS_PATTERN, async (route) => {
    const url = new URL(route.request().url())

    // El refresh devuelve snake_case y el campo del token es `access_token`,
    // no `idToken` (ver @firebase/auth: accessToken: response.access_token).
    if (url.hostname.startsWith("securetoken.")) {
      await json(route, {
        access_token: fakeJwt(),
        expires_in: "3600",
        refresh_token: "e2e-refresh-token",
        token_type: "Bearer",
        user_id: "e2e-writer",
      })
      return
    }

    const esCreacionDeCuenta =
      url.pathname.endsWith("/accounts:signInWithPassword") ||
      url.pathname.endsWith("/accounts:signUp")

    if (esCreacionDeCuenta) {
      await cuentaResponde(route)
      return
    }

    // Cada endpoint pide un cuerpo distinto. Devolver una respuesta con forma
    // de token para todos hace que el SDK revienta al parsear accounts:lookup
    // (lee `users.length` sobre undefined).
    if (url.pathname.endsWith("/accounts:lookup")) {
      await json(route, {
        users: [
          {
            localId: "e2e-writer",
            email: "writer@example.test",
            displayName: "Escritora de prueba",
            emailVerified: true,
          },
        ],
      })
      return
    }

    await json(route, {
      idToken: fakeJwt(),
      refreshToken: "e2e-refresh-token",
      expiresIn: "3600",
      user_id: "e2e-writer",
    })
  })
}

async function routeAuthWorker(page: Page) {
  await page.route(AUTH_WORKER_PATTERN, async (route) => {
    await json(route, { ok: true })
  })
}

// `authLoginStatus` es el status de POST /auth/login, que es el que arma la
// sesión en el backend después de que Firebase ya validó la contraseña.
// `authLoginMessage` hace falta cuando el caso depende del texto concreto que
// manda el backend y no solo del status.
async function routeBackend(
  page: Page,
  authLoginStatus = 200,
  authLoginMessage = "Internal server error",
) {
  await page.route(BACKEND_PATTERN, async (route) => {
    const url = new URL(route.request().url())

    if (url.pathname === "/auth/login") {
      if (authLoginStatus === 200) {
        await json(route, { user: BACKEND_USER })
        return
      }

      await json(
        route,
        {
          statusCode: authLoginStatus,
          message: authLoginMessage,
          error: "Internal Server Error",
        },
        authLoginStatus,
      )
      return
    }

    await json(route, { message: "Endpoint e2e no simulado" }, 404)
  })
}

async function enviarLogin(page: Page, password = "e2e-valid-password") {
  await page.goto("/login")

  const submit = page.getByRole("button", { name: "Iniciar sesión" })

  // El form todavía no es interactuable apenas hidrata; el retry es el mismo
  // que usa e2e/auth.setup.ts.
  await expect(async () => {
    await submit.click()
    await expect(page.getByText("El email es obligatorio.")).toBeVisible()
  }).toPass({ timeout: 10_000 })

  await page.getByLabel("Email").fill("writer@example.test")
  await page.getByLabel("Contraseña").fill(password)
  await submit.click()
}

async function enviarRegistro(page: Page) {
  await page.goto("/register")

  const submit = page.getByRole("button", { name: "Crear cuenta" })

  await expect(async () => {
    await submit.click()
    await expect(page.getByText("El email es obligatorio.")).toBeVisible()
  }).toPass({ timeout: 10_000 })

  await page.getByLabel("Nombre", { exact: true }).fill("Escritora")
  await page.getByLabel("Apellido").fill("Prueba")
  await page.getByLabel("Nombre de usuario").fill("e2e-writer")
  await page.getByLabel("Email").fill("writer@example.test")
  await page.getByLabel("Contraseña", { exact: true }).fill("e2e-valid-password")
  await page.getByLabel("Confirmar contraseña").fill("e2e-valid-password")
  await page
    .getByLabel("Acepto los términos y condiciones")
    .check()
  await submit.click()
}

test.describe("Mensajes de error del flujo de autenticación", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("una contraseña incorrecta sigue diciendo que la contraseña es incorrecta", async ({
    page,
  }) => {
    await routeFirebase(page, (route) =>
      json(route, firebaseServerBody("INVALID_PASSWORD", 400), 400),
    )
    await routeBackend(page)

    await enviarLogin(page)

    await expect(
      page.getByText("Email o contraseña incorrectos."),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("demasiados intentos no se disfraza de contraseña mal", async ({
    page,
  }) => {
    await routeFirebase(page, (route) =>
      json(
        route,
        firebaseServerBody("TOO_MANY_ATTEMPTS_TRY_LATER", 400),
        400,
      ),
    )
    await routeBackend(page)

    await enviarLogin(page)

    await expect(
      page.getByText("Demasiados intentos. Esperá unos minutos y volvé a intentar."),
    ).toBeVisible()
    await expect(
      page.getByText("Email o contraseña incorrectos."),
    ).toBeHidden()
  })

  test("sin conexión con Firebase pide revisar la internet, no la contraseña", async ({
    page,
  }) => {
    await page.route(FIREBASE_HOSTS_PATTERN, async (route) => {
      await route.abort("connectionrefused")
    })
    await routeBackend(page)

    await enviarLogin(page)

    await expect(
      page.getByText(
        "No pudimos conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText("Email o contraseña incorrectos."),
    ).toBeHidden()
    await expect(page).toHaveURL(/\/login$/)
  })

  // Este es el caso que motivó el cambio: Firebase validó la contraseña y lo
  // que falló fue el backend. Culparle la contraseña al usuario lo haría
  // borrar y volver a tipear algo que estaba bien.
  test("si el backend falla después de validar la contraseña, no le dice que la contraseña está mal", async ({
    page,
  }) => {
    await routeFirebase(page, async (route) => {
      await json(route, {
        kind: "identitytoolkit#VerifyPasswordResponse",
        localId: "e2e-writer",
        email: "writer@example.test",
        displayName: "Escritora de prueba",
        emailVerified: true,
        idToken: fakeJwt(),
        registered: true,
        refreshToken: "e2e-refresh-token",
        expiresIn: "3600",
      })
    })
    await routeBackend(page, 500)

    await enviarLogin(page)

    await expect(
      page.getByText(
        "No pudimos completar el ingreso. Intentá de nuevo en unos minutos.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText("Email o contraseña incorrectos."),
    ).toBeHidden()
    await expect(page).toHaveURL(/\/login$/)
  })

  // Una cuenta suprimida que todavía conserva identidad en Firebase vuelve a
  // intentar entrar: la contraseña está bien y la cuenta existe, pero ya no
  // hay nada adentro. Decirle que la sesión expiró lo mandaría a perseguir un
  // error que no se arregla reintentando, y es además la única señal que nos
  // iba a avisar de que quedó una identidad pegada en Firebase.
  test("una cuenta ya eliminada se lo dice en vez de un error de sesión genérico", async ({
    page,
  }) => {
    await routeFirebase(page, async (route) => {
      await json(route, {
        kind: "identitytoolkit#VerifyPasswordResponse",
        localId: "e2e-writer",
        email: "writer@example.test",
        displayName: "Escritora de prueba",
        emailVerified: true,
        idToken: fakeJwt(),
        registered: true,
        refreshToken: "e2e-refresh-token",
        expiresIn: "3600",
      })
    })
    await routeBackend(page, 403, "Account deleted")

    await enviarLogin(page)

    await expect(page.getByText("Tu cuenta ya fue eliminada.")).toBeVisible()
    await expect(page.getByText("Email o contraseña incorrectos.")).toBeHidden()
    await expect(
      page.getByText(
        "No pudimos completar el ingreso. Intentá de nuevo en unos minutos.",
      ),
    ).toBeHidden()
    await expect(page).toHaveURL(/\/login$/)
  })

  // Los 8 caracteres son una política para CREAR la contraseña, no para
  // usarla: la recuperación se la pasa a la página hosteada por Firebase,
  // que solo exige 6, así que puede haber cuentas con una contraseña más
  // corta (puestas por consola, anteriores al cambio de política o hechas
  // en el reset). Frenarla acá bloquearía credenciales que Firebase acepta.
  test("una contraseña de menos de 8 caracteres no se frena antes de llegar a Firebase", async ({
    page,
  }) => {
    await routeFirebase(page, async (route) => {
      await json(route, {
        kind: "identitytoolkit#VerifyPasswordResponse",
        localId: "e2e-writer",
        email: "writer@example.test",
        displayName: "Escritora de prueba",
        emailVerified: true,
        idToken: fakeJwt(),
        registered: true,
        refreshToken: "e2e-refresh-token",
        expiresIn: "3600",
      })
    })
    await routeBackend(page)

    await enviarLogin(page, "corta7")

    await expect(
      page.getByText("La contraseña debe tener al menos 8 caracteres."),
    ).toBeHidden()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("un email ya registrado explica que la cuenta existe", async ({
    page,
  }) => {
    await routeFirebase(page, (route) =>
      json(route, firebaseServerBody("EMAIL_EXISTS", 400), 400),
    )
    await routeAuthWorker(page)
    await routeBackend(page)

    await enviarRegistro(page)

    await expect(
      page.getByText(
        "Ya existe una cuenta con ese email. Probá iniciar sesión o usá otro correo.",
      ),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  // Acá la cuenta en Firebase YA existe y el mail de verificación ya salió.
  // Culparle el email al usuario lo mandaría a pelear con un formulario que ya
  // no le va a dejar avanzar.
  test("si el backend falla después de crear la cuenta, no le dice que el email está en uso", async ({
    page,
  }) => {
    await routeFirebase(page, async (route) => {
      await json(route, {
        kind: "identitytoolkit#SignUpResponse",
        localId: "e2e-writer",
        email: "writer@example.test",
        displayName: "e2e-writer",
        emailVerified: false,
        idToken: fakeJwt(false),
        refreshToken: "e2e-refresh-token",
        expiresIn: "3600",
      })
    })
    await routeAuthWorker(page)
    await routeBackend(page, 500)

    await enviarRegistro(page)

    await expect(
      page.getByText(
        "Tu cuenta ya quedó creada, pero no pudimos terminar de registrarla. Volvé a intentar en unos minutos.",
      ),
    ).toBeVisible()
    await expect(
      page.getByText("El email podría estar en uso."),
    ).toBeHidden()
    await expect(page).toHaveURL(/\/register$/)
  })
})
