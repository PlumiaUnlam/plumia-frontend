"use client"

import { useEffect, useState, type FormEvent } from "react"
import { CircleAlert, MailCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/form/auth-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/contexts/AuthContext"
import { messageForError } from "@/helpers/auth-errors"
import { isEmail } from "@/helpers/validation"

const RESEND_COOLDOWN_SECONDS = 60

// El Worker siempre responde 200 aunque el mail no exista, así que usamos la
// misma redacción para cualquier caso y no filtramos qué cuentas hay.
const SENT_MESSAGE = (email: string) =>
  `Si existe una cuenta con ese email te enviaremos un enlace a ${email}.`

export function ForgotPasswordForm() {
  const router = useRouter()
  const { sendPasswordReset } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [generalError, setGeneralError] = useState("")
  const [sentMessage, setSentMessage] = useState("")

  useEffect(() => {
    if (cooldown <= 0) return

    const timer = setTimeout(() => {
      setCooldown((previous) => previous - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGeneralError("")

    const trimmed = email.trim()

    if (!trimmed) {
      setEmailError("El email es obligatorio.")
      return
    }

    if (!isEmail(trimmed)) {
      setEmailError("Introduce un email con formato válido.")
      return
    }

    setEmailError("")
    setIsSubmitting(true)

    try {
      await sendPasswordReset(trimmed)
      setSentMessage(SENT_MESSAGE(trimmed))
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setGeneralError(messageForError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Recuperá tu contraseña"
      description="Ingresá tu correo y te enviaremos un enlace para elegir una contraseña nueva."
      footer={
        <p>
          ¿Recordaste tu contraseña?{" "}
          <Button
            variant="link"
            type="button"
            className="h-auto p-0 text-xs font-medium"
            onClick={() => void router.push("/login")}
          >
            Iniciar sesión
          </Button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          {generalError ? (
            <Alert variant="destructive" aria-live="polite">
              <CircleAlert />
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          ) : null}

          {sentMessage ? (
            <Alert aria-live="polite">
              <MailCheck />
              <AlertDescription>{sentMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={!!emailError}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError("")
                }}
                type="email"
                placeholder="tucorreo@dominio.com"
                autoComplete="email"
                aria-invalid={!!emailError}
              />
            </FieldContent>
            <FieldError>{emailError}</FieldError>
          </Field>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || cooldown > 0}
          >
            {isSubmitting ? (
              <>
                <Spinner className="size-4" />
                Enviando enlace
              </>
            ) : cooldown > 0 ? (
              `Reenviar en ${cooldown}s`
            ) : sentMessage ? (
              "Reenviar enlace"
            ) : (
              "Enviar enlace"
            )}
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  )
}
