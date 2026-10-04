"use client"

import { useState, type FormEvent } from "react"
import { CircleAlert } from "lucide-react"
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
import { isEmail } from "@/helpers/validation"

export function RegisterForm() {
  const router = useRouter()
  const { register } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState({
    fullName: "",
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

    if (!values.fullName.trim()) {
      nextErrors.fullName = "El nombre es obligatorio."
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
      await register(values.email.trim(), values.password)
      const params = new URLSearchParams(globalThis.location?.search ?? "")
      router.push(params.get("redirect") || "/dashboard")
    } catch {
      setGeneralError("No se pudo crear la cuenta. El email podría estar en uso.")
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

          <Field data-invalid={!!errors.fullName}>
            <FieldLabel htmlFor="fullName">Nombre completo</FieldLabel>
            <FieldContent>
              <Input
                id="fullName"
                value={values.fullName}
                onChange={(event) => setField("fullName", event.target.value)}
                type="text"
                placeholder="Nombre y apellido"
                autoComplete="name"
                aria-invalid={!!errors.fullName}
              />
            </FieldContent>
            <FieldError>{errors.fullName}</FieldError>
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
                <Button
                  variant="link"
                  type="button"
                  className="h-auto p-0 text-sm font-normal"
                  onClick={(event) => event.preventDefault()}
                >
                  términos y condiciones
                </Button>
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
