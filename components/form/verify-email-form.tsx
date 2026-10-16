"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CircleAlert, MailCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/form/auth-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/contexts/AuthContext"
import { messageForError } from "@/helpers/auth-errors"

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailForm() {
  const router = useRouter()
  const {
    firebaseUser,
    loading,
    resendVerificationEmail,
    refreshSession,
    logout,
    verificationEmailError,
    clearVerificationEmailError,
  } = useAuth()

  const [isResending, setIsResending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [generalError, setGeneralError] = useState("")
  const [resentMessage, setResentMessage] = useState("")

  const email = firebaseUser?.email ?? "tu correo"

  // reload() no renueva el ID token: sin refreshSession() el backend seguiría
  // viendo email_verified=false y rechazaría el dashboard con 403.
  const verifyNow = useCallback(async () => {
    const currentUser = firebaseUser

    if (!currentUser) {
      return false
    }

    await currentUser.reload()

    if (!currentUser.emailVerified) {
      return false
    }

    await refreshSession()
    return true
  }, [firebaseUser, refreshSession])

  // Si register() creó la cuenta pero el mail no salió, AuthContext guarda el
  // mensaje. Lo derivamos en render en vez de sincronizarlo con un setState
  // dentro de un efecto, y lo limpiamos en los handlers de esta pantalla.
  const showError = generalError || verificationEmailError || ""

  const clearErrors = useCallback(() => {
    setGeneralError("")
    clearVerificationEmailError()
  }, [clearVerificationEmailError])

  const checkVerification = useCallback(async () => {
    if (!firebaseUser || isChecking) {
      return
    }

    clearErrors()
    setIsChecking(true)

    try {
      if (await verifyNow()) {
        router.replace("/dashboard")
      }
    } catch {
      setGeneralError(
        "No pudimos confirmar tu correo. Revisá que el enlace sea el mismo y volvé a intentar.",
      )
    } finally {
      setIsChecking(false)
    }
  }, [firebaseUser, isChecking, verifyNow, router, clearErrors])

  // El usuario llega desde el link del correo (continueUrl → /verify-email).
  // Firebase verifica en su propio dominio, así que el usuario persistido en
  // este origin sigue con emailVerified=false: recién un reload() lo trae
  // actualizado. Chequeo silencioso: si todavía no está verificado es el caso
  // normal, no un error, y el botón "Ya verifiqué mi correo" sigue disponible.
  const autoCheckedRef = useRef(false)

  useEffect(() => {
    if (autoCheckedRef.current) return
    if (!firebaseUser || firebaseUser.emailVerified) return

    autoCheckedRef.current = true

    verifyNow()
      .then((verified) => {
        if (verified) router.replace("/dashboard")
      })
      .catch(() => {
        // Sin conexión con Firebase: no mostramos error en el arranque.
      })
  }, [firebaseUser, verifyNow, router])

  useEffect(() => {
    // onIdTokenChanged resuelve después del primer render: si redirigimos con
    // loading=true mandaríamos a /login (y de ahí el proxy al dashboard) en
    // cualquier F5 sobre esta pantalla, incluso con sesión iniciada.
    if (loading) return

    if (!firebaseUser) {
      router.replace("/login")
      return
    }

    // Si el usuario ya está verificado (por ejemplo, porque intentó con el
    // enlace del correo en otra pestaña) renovamos el token antes de seguir:
    // el que tiene la cookie puede seguir con email_verified=false.
    if (firebaseUser.emailVerified) {
      void refreshSession()
        .then(() => router.replace("/dashboard"))
        .catch(() => router.replace("/dashboard"))
    }
  }, [loading, firebaseUser, refreshSession, router])

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setTimeout(() => {
      setCooldown((previous) => previous - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    clearErrors()
    setResentMessage("")
    setIsResending(true)

    try {
      await resendVerificationEmail()
      setResentMessage("Te enviamos un correo nuevo. Revisá tu bandeja de entrada.")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setGeneralError(messageForError(error))
    } finally {
      setIsResending(false)
    }
  }

  const handleChangeEmail = async () => {
    await logout()
    router.replace("/register")
  }

  return (
    <AuthShell
      title="Verificá tu correo"
      description={`Te enviamos un correo a ${email}. Hacé clic en el enlace para confirmar tu cuenta y empezar a escribir.`}
      footer={
        <p>
          ¿Cambiaste de idea?{" "}
          <Button
            variant="link"
            type="button"
            className="h-auto p-0 text-xs font-medium"
            onClick={() => void handleChangeEmail()}
          >
            Usar otro correo
          </Button>
        </p>
      }
    >
      <div className="flex flex-col gap-5">
        {showError ? (
          <Alert variant="destructive" aria-live="polite">
            <CircleAlert />
            <AlertDescription>{showError}</AlertDescription>
          </Alert>
        ) : null}

        {resentMessage ? (
          <Alert aria-live="polite">
            <MailCheck />
            <AlertDescription>{resentMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={() => void handleResend()}
          disabled={isResending || cooldown > 0}
        >
          {isResending ? (
            <>
              <Spinner className="size-4" />
              Enviando
            </>
          ) : cooldown > 0 ? (
            `Reenviar en ${cooldown}s`
          ) : (
            "Reenviar correo"
          )}
        </Button>

        <Button
          type="button"
          size="lg"
          variant="ghost"
          onClick={() => void checkVerification()}
          disabled={isResending || isChecking}
        >
          {isChecking ? (
            <>
              <Spinner className="size-4" />
              Comprobando
            </>
          ) : (
            "Ya verifiqué mi correo"
          )}
        </Button>
      </div>
    </AuthShell>
  )
}