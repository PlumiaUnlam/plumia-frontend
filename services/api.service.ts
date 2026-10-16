import { auth } from "@/lib/firebase"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

// Contrato del backend: FirebaseAuthGuard lanza ForbiddenException con este
// mensaje exacto cuando la cuenta todavía no confirmó el correo.
const EMAIL_NOT_VERIFIED_MESSAGE = "Email verification required"

// Contrato del backend: AuthService.login (y solo login) devuelve
// ForbiddenException con este mensaje cuando la fila del usuario quedó como
// tombstone por una baja de cuenta pero su identidad todavía existe en
// Firebase, que es el estado que deja un 502 en la supresión. No es una sesión
// inválida: es el caso donde hay que decirle la verdad para que reclame el
// corte a mano.
export const ACCOUNT_DELETED_MESSAGE = "Account deleted"

const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo."

// Error de la API con el status HTTP a mano, para que cada pantalla decida qué
// mostrar: un 401 del backend llega en inglés ("Invalid or expired token") y
// hay que traducirlo, mientras que otros mensajes ya vienen en español.
// `status === 0` significa que ni siquiera hubo respuesta: red caída o CORS.
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "ApiError"
  }
}

// El correo de la cuenta no está verificado todavía. Va aparte de ApiError
// porque no es un fallo: es un estado que varias pantallas tienen que resolver
// llevando al usuario a /verify-email en vez de mostrar un error genérico.
export class EmailNotVerifiedError extends Error {
  constructor() {
    super(EMAIL_NOT_VERIFIED_MESSAGE)
    this.name = "EmailNotVerifiedError"
  }
}

// No hubo request: Firebase no pudo entregar la credencial. Tampoco es un
// ApiError, porque `status` no significaría nada acá. El texto ya viene en
// español y ya le dice al usuario qué hacer.
export class SessionUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SessionUnavailableError"
  }
}

// POST /auth/login es @Public(), así que el único endpoint que puede rechazar
// al usuario con el token todavía fresco es ese. Va aparte de ApiError porque
// no usa `api.*`: arma su propio fetch con el ID token a mano.
export class BackendSyncError extends Error {
  constructor(
    readonly status: number,
    readonly backendMessage: string,
  ) {
    // El mensaje del Error es solo diagnóstico para la consola: lo que el
    // usuario ve lo decide helpers/api-errors.ts a partir de `status` y
    // `backendMessage`.
    super(`Failed to sync user with backend (${status}): ${backendMessage}`)
    this.name = "BackendSyncError"
  }
}

// NestJS responde `{ statusCode, message, error }`. Nos quedamos con `message`
// porque es lo único que matchea el mapper. Si no hay JSON o `message` no es
// string, devolvemos el cuerpo crudo tal cual lo hacía antes.
export function parseBackendMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: unknown }

    if (typeof parsed.message === "string") {
      return parsed.message
    }
  } catch {}

  return body
}

async function getToken(): Promise<string> {
  await auth.authStateReady()

  if (!auth.currentUser) {
    throw new SessionUnavailableError(
      "Tu sesión ya no está activa. Volvé a iniciar sesión para continuar.",
    )
  }

  try {
    const token = await auth.currentUser.getIdToken()

    if (token) {
      return token
    }
  } catch {
    // getIdToken solo falla si no puede contactar a Firebase o si el refresh
    // token ya no sirve. No podemos distinguir los dos casos desde acá, así
    // que preferimos no echarle la culpa a la contraseña ni al backend.
  }

  throw new SessionUnavailableError(
    "No pudimos renovar tu sesión. Revisá tu conexión e intentá de nuevo.",
  )
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  }

  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (error) {
    // Un abort no es un fallo de red: los call sites lo detectan por
    // `error.name === "AbortError"` y lo tienen que seguir viendo igual.
    if (error instanceof Error && error.name === "AbortError") {
      throw error
    }

    // fetch solo rechaza por problema de red o CORS, nunca por status HTTP.
    // Sin este mapeo el usuario ve el mensaje crudo del browser: "Failed to fetch".
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0)
  }

  if (!response.ok) {
    let errorText = await response.text()
    try {
      const parsed = JSON.parse(errorText)
      if (parsed.message) errorText = parsed.message
    } catch {}

    // No todo 403 significa "mail sin verificar": el módulo de lectura
    // compartida también responde 403 por permisos, así que hay que matchear
    // el mensaje además del status. Si `message` viene como array de NestJS,
    // la comparación da falsa y no hay falso positivo.
    if (response.status === 403 && errorText === EMAIL_NOT_VERIFIED_MESSAGE) {
      throw new EmailNotVerifiedError()
    }

    throw new ApiError(errorText || NETWORK_ERROR_MESSAGE, response.status)
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const responseText = await response.text()
  if (!responseText.trim()) {
    return undefined as T
  }

  return JSON.parse(responseText) as T
}

export const api = {
  get: <T>(path: string, options: Pick<RequestInit, "signal"> = {}) =>
    request<T>(path, options),
  post: <T>(
    path: string,
    body: unknown,
    options: Pick<RequestInit, "signal"> = {},
  ) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
  postFormData: <T>(
    path: string,
    body: FormData,
    options: Pick<RequestInit, "signal"> = {},
  ) => request<T>(path, { method: "POST", body, ...options }),
  put: <T>(
    path: string,
    body: unknown,
    options: Pick<RequestInit, "signal"> = {},
  ) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),
  patch: <T>(
    path: string,
    body: unknown,
    options: Pick<RequestInit, "signal"> = {},
  ) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    }),
  delete: <T>(path: string, options: Pick<RequestInit, "signal"> = {}) =>
    request<T>(path, { method: "DELETE", ...options }),
}
