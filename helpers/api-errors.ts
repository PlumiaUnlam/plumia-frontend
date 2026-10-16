import {
  ACCOUNT_DELETED_MESSAGE,
  ApiError,
  BackendSyncError,
  EmailNotVerifiedError,
  SessionUnavailableError,
} from "@/services/api.service"

const SIN_CONEXION =
  "No pudimos conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo."

const SIN_VERIFICAR =
  "Tu correo todavía no está verificado. Revisá tu casilla para confirmar la cuenta."

// El backend no expone codes: NestJS responde { statusCode, message, error } y
// el texto viene casi siempre en inglés. La única señal que tenemos es el par
// (status, mensaje literal), así que el match tiene que ser exacto. Si algún
// día el backend manda codes, este mapa se reemplaza entero.
const BACKEND_MESSAGES: Record<number, Record<string, string>> = {
  400: {
    "An email address is required":
      "Tu cuenta de Google no tiene un correo asociado.",
    "Invalid invitation token": "Este enlace de invitación no es válido.",
    "Invalid text selection":
      "Esa selección de texto ya no existe en el manuscrito.",
    "Scene does not belong to this version":
      "Esa escena no pertenece a esta versión.",
  },
  401: {
    "Missing authorization token":
      "Tu sesión expiró. Volvé a iniciar sesión para continuar.",
    "Invalid or expired token":
      "Tu sesión expiró. Volvé a iniciar sesión para continuar.",
    "Invalid or expired identity token":
      "No pudimos confirmar tu identidad. Volvé a intentar.",
    "Google sign-in is required":
      "Ingresá con la cuenta de Google que recibió la invitación.",
  },
  403: {
    // Defensivo: api.service ya lo convierte en EmailNotVerifiedError, pero un
    // 403 con este texto significa exactamente eso aunque venga por otra vía.
    "Email verification required": SIN_VERIFICAR,
    "Sign in with the Google account that received this invitation":
      "Entrá con la cuenta de Google que recibió la invitación.",
    "This invitation is read-only": "Esta invitación es solo de lectura.",
    "You do not have access to this version":
      "No tenés acceso a esta versión.",
    "Only the manuscript owner can resolve comments":
      "Solo quien compartió el libro puede cerrar comentarios.",
    "Storage object is not part of this version":
      "No pudimos cargar ese archivo.",
  },
  404: {
    "Share invitation not found": "No encontramos esta invitación.",
    "Comment not found": "No encontramos ese comentario.",
  },
  410: {
    "Share invitation is no longer active":
      "Esta invitación ya no está activa.",
    "Share invitation has expired": "Esta invitación caducó.",
    "Shared version is not available":
      "La versión compartida ya no está disponible.",
  },
}

function firebaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null
  }

  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : null
}

// Devuelve el par (status, mensaje) si el error viene del backend. `ApiError`
// ya lleva el mensaje limpio; `BackendSyncError` lo lleva aparte porque su
// `message` es el string de diagnóstico de la consola.
function backendParts(
  error: unknown,
): { status: number; message: string } | null {
  if (error instanceof ApiError) {
    return { status: error.status, message: error.message }
  }

  if (error instanceof BackendSyncError) {
    return { status: error.status, message: error.backendMessage }
  }

  return null
}

// Traduce un error de `api.*` (o de los servicios que hacen fetch a mano) al
// texto que ve el usuario. `fallback` lo pone el call site, porque es quien
// sabe qué estaba intentando hacer; acá solo resolvemos lo que el backend ya
// nos dijo.
export function messageForApiError(error: unknown, fallback: string): string {
  if (error instanceof EmailNotVerifiedError) {
    return SIN_VERIFICAR
  }

  // Sin respuesta (red caída o CORS): api.service ya lo dejó en español.
  if (error instanceof ApiError && error.status === 0) {
    return error.message
  }

  // No hubo request: el texto ya viene resuelto.
  if (error instanceof SessionUnavailableError) {
    return error.message
  }

  const backend = backendParts(error)

  if (backend) {
    const texto = BACKEND_MESSAGES[backend.status]?.[backend.message]

    if (texto) {
      return texto
    }
  }

  return fallback
}

const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos."

// El login tiene una particularidad: `login()` no lanza por credenciales malas
// sin más, también puede fallar el sync con el backend. Decirle al usuario que
// la contraseña está mal cuando lo que falló fue el servidor lo hace borrar y
// volver a tipear algo que estaba bien.
export function loginErrorMessage(error: unknown): string {
  switch (firebaseErrorCode(error)) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return CREDENCIALES_INVALIDAS
    case "auth/invalid-email":
      return "Introduce un email con formato válido."
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos y volvé a intentar."
    case "auth/network-request-failed":
      return SIN_CONEXION
    case "auth/user-disabled":
      return "Esta cuenta fue deshabilitada. Si crees que es un error, escribinos."
    default:
      break
  }

  if (error instanceof EmailNotVerifiedError) {
    return SIN_VERIFICAR
  }

  if (error instanceof SessionUnavailableError) {
    return error.message
  }

  if (error instanceof BackendSyncError) {
    // Un 401 acá es el ID token rechazado por /auth/login: no es la
    // contraseña, que ya validó Firebase.
    if (error.status === 401) {
      return "No pudimos verificar tu identidad. Volvé a intentar en unos minutos."
    }

    // Una cuenta suprimida que todavía conserva identidad en Firebase volvió a
    // intentar entrar. No es un fallo del servidor: es el estado que deja un
    // 502 en la supresión, así que se le dice tal cual para que reclame el
    // corte a mano en vez de perseguir un error de sesión que no se va a arreglar.
    if (error.status === 403 && error.backendMessage === ACCOUNT_DELETED_MESSAGE) {
      return "Tu cuenta ya fue eliminada."
    }

    return "No pudimos completar el ingreso. Intentá de nuevo en unos minutos."
  }

  // Sin código conocido mantenemos el mensaje actual: en un formulario de login
  // no conviene decirle al usuario qué fue lo que falló exactamente.
  return CREDENCIALES_INVALIDAS
}

export function registerErrorMessage(error: unknown): string {
  switch (firebaseErrorCode(error)) {
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese email. Probá iniciar sesión o usá otro correo."
    case "auth/invalid-email":
      return "Introduce un email con formato válido."
    case "auth/weak-password":
      return "La contraseña debe tener al menos 8 caracteres."
    case "auth/operation-not-allowed":
      return "El registro todavía no está habilitado. Intentá de nuevo en unos minutos."
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos y volvé a intentar."
    case "auth/network-request-failed":
      return SIN_CONEXION
    default:
      break
  }

  if (error instanceof SessionUnavailableError) {
    return error.message
  }

  // Acá la cuenta en Firebase YA existe y el mail de verificación ya salió:
  // solo falló el sync con el backend. Decirle "el email podría estar en uso"
  // lo mandaría a pelear con un formulario que ya no le va a dejar avanzar.
  if (error instanceof BackendSyncError) {
    return "Tu cuenta ya quedó creada, pero no pudimos terminar de registrarla. Volvé a intentar en unos minutos."
  }

  return "No se pudo crear la cuenta. Intentá de nuevo en unos minutos."
}

// Caso particular del diálogo de eliminar cuenta (Ley 25.326, art. 16): acá NO
// alcanza con el mapa genérico porque el mensaje de /users/me en español tiene
// que pasar tal cual, y los 401/403 significan que hay que volver a entrar.
export function deleteAccountErrorMessage(error: unknown): string {
  if (error instanceof EmailNotVerifiedError) {
    return "Tu correo todavía no está verificado. Revisá tu casilla y volvé a eliminar la cuenta."
  }

  // Sin respuesta (red caída, CORS, o un backend reiniciado a mitad del
  // request). La supresión es irreversible y no sabemos si llegó a completarse,
  // así que el mensaje genérico de red no sirve: le dice que reintente, y
  // justamente el reintento es lo que deja al usuario sin entender qué pasó,
  // porque si de hecho se borró choca con el tombstone.
  if (error instanceof ApiError && error.status === 0) {
    return "No pudimos confirmar si tu cuenta se eliminó. Volvé a iniciar sesión para comprobarlo."
  }

  // El 401 viene del guard de Firebase en inglés ("Invalid or expired token").
  if (error instanceof ApiError && error.status === 401) {
    return "Tu sesión expiró. Volvé a iniciar sesión para eliminar la cuenta."
  }

  // DELETE /users/me también pasa por validateFirebaseUser, así que una fila
  // que ya es tombstone responde 403 con el mensaje del camino de login. Sin
  // esta rama cae al passthrough de acá abajo y el usuario ve el texto crudo
  // en inglés dentro del diálogo.
  if (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message === ACCOUNT_DELETED_MESSAGE
  ) {
    return "Tu cuenta ya fue eliminada."
  }

  if (error instanceof SessionUnavailableError) {
    return "Tu sesión ya no está activa. Volvé a iniciar sesión para eliminar la cuenta."
  }

  if (error instanceof BackendSyncError) {
    return "No pudimos eliminar la cuenta. Intentá nuevamente."
  }

  const message = error instanceof Error ? error.message.trim() : ""

  return message || "No pudimos eliminar la cuenta. Intentá nuevamente."
}
