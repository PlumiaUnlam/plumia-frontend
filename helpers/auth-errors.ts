// Mapea los códigos `auth/*` que lanza AuthContext (al llamar al Worker de
// autenticación) a mensajes amigables. Firebase y el Worker comparten el mismo
// contrato de códigos, así que esta función sirve para recuperar la contraseña
// y para reenviar el correo de verificación.
export function messageForError(error: unknown) {
  const code = (error as { code?: string })?.code

  if (code === "auth/too-many-requests") {
    return "Demasiados intentos. Esperá unos minutos y volvé a intentar."
  }

  if (code === "auth/invalid-email") {
    return "Introduce un email con formato válido."
  }

  if (code === "auth/network-request-failed") {
    return "No pudimos conectar. Revisá tu conexión a internet y probá de nuevo."
  }

  return "No se pudo enviar el correo. Intentá de nuevo en unos minutos."
}
