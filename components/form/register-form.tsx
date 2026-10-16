"use client"

import { useState, type FormEvent } from "react"
import { CircleAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/form/auth-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { registerErrorMessage } from "@/helpers/api-errors"
import { isEmail } from "@/helpers/validation"

export function RegisterForm() {
  const router = useRouter()
  const { register } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState("")

  const setField = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!values.firstName.trim()) {
      nextErrors.firstName = "El nombre es obligatorio."
    }

    if (!values.lastName.trim()) {
      nextErrors.lastName = "El apellido es obligatorio."
    }

    if (!values.username.trim()) {
      nextErrors.username = "El nombre de usuario es obligatorio."
    }

    if (!values.email.trim()) {
      nextErrors.email = "El email es obligatorio."
    } else if (!isEmail(values.email.trim())) {
      nextErrors.email = "Introduce un email con formato válido."
    }

    if (!values.password.trim()) {
      nextErrors.password = "La contraseña es obligatoria."
    } else if (values.password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres."
    }

    if (!values.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirma tu contraseña."
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden."
    }

    if (!acceptedTerms) {
      nextErrors.acceptedTerms =
        "Debes aceptar los términos y condiciones para continuar."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGeneralError("")

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      router.push("/verify-email")
    } catch (error) {
      setGeneralError(registerErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToLogin = () => {
    const params = new URLSearchParams(globalThis.location?.search ?? "")
    const redirect = params.get("redirect")
    void router.push(
      redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login",
    )
  }

  return (
    <AuthShell
      title="Creá tu cuenta"
      description="Centralizá tu manuscrito, organizá tu mundo ficticio y mantené la coherencia de tu historia en un solo lugar."
      footer={
        <p>
          ¿Ya tenés cuenta?{" "}
          <Button
            variant="link"
            type="button"
            className="h-auto p-0 text-xs font-medium"
            onClick={goToLogin}
          >
            Iniciá sesión
          </Button>
        </p>
      }
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {generalError ? (
            <Alert variant="destructive" aria-live="polite">
              <CircleAlert />
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          ) : null}

          {/* Nombre y Apellido en la misma fila, con el mismo patrón que usa
              más abajo el par de contraseñas, para acortar el formulario en
              desktop. `sm:` en vez de romper siempre: en pantallas chicas
              "~137px" por columna queda apretado y se apila como antes. */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="firstName">Nombre</FieldLabel>
              <FieldContent>
                <Input
                  id="firstName"
                  value={values.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                  type="text"
                  placeholder="Nombre"
                  autoComplete="given-name"
                  aria-invalid={!!errors.firstName}
                />
              </FieldContent>
              <FieldError>{errors.firstName}</FieldError>
            </Field>

            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="lastName">Apellido</FieldLabel>
              <FieldContent>
                <Input
                  id="lastName"
                  value={values.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  type="text"
                  placeholder="Apellido"
                  autoComplete="family-name"
                  aria-invalid={!!errors.lastName}
                />
              </FieldContent>
              <FieldError>{errors.lastName}</FieldError>
            </Field>
          </div>

          <Field data-invalid={!!errors.username}>
            <FieldLabel htmlFor="username">Nombre de usuario</FieldLabel>
            <FieldContent>
              <Input
                id="username"
                value={values.username}
                onChange={(event) => setField("username", event.target.value)}
                type="text"
                placeholder="Como te van a ver"
                autoComplete="username"
                aria-invalid={!!errors.username}
              />
            </FieldContent>
            <FieldError>{errors.username}</FieldError>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="email"
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
                type="email"
                placeholder="tucorreo@dominio.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
              />
            </FieldContent>
            <FieldError>{errors.email}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <FieldContent>
                <Input
                  id="password"
                  value={values.password}
                  onChange={(event) => setField("password", event.target.value)}
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                />
              </FieldContent>
              <FieldError>{errors.password}</FieldError>
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
              <FieldContent>
                <Input
                  id="confirmPassword"
                  value={values.confirmPassword}
                  onChange={(event) =>
                    setField("confirmPassword", event.target.value)
                  }
                  type="password"
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                />
              </FieldContent>
              <FieldError>{errors.confirmPassword}</FieldError>
            </Field>
          </div>

          <Field
            data-invalid={!!errors.acceptedTerms}
            orientation="horizontal"
            className="items-start"
          >
            <Checkbox
              id="acceptedTerms"
              checked={acceptedTerms}
              onCheckedChange={(value) => {
                setAcceptedTerms(Boolean(value))
                setErrors((prev) => ({ ...prev, acceptedTerms: "" }))
              }}
              aria-invalid={!!errors.acceptedTerms}
            />
            <div className="grid gap-1">
              <FieldLabel
                htmlFor="acceptedTerms"
                className="text-sm font-normal text-foreground"
              >
                Acepto los{" "}
                {/* Pestaña nueva a propósito: si navegáramos en la misma,
                    perderían lo ya cargado en el resto del formulario. */}
                <Link
                  href="/terminos-y-condiciones"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 text-primary hover:text-foreground"
                >
                  términos y condiciones
                </Link>
              </FieldLabel>
              <FieldError>{errors.acceptedTerms}</FieldError>
            </div>
          </Field>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="size-4" />
                Creando cuenta
              </>
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  )
}
