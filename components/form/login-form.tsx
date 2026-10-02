"use client"

import { useState, type FormEvent } from "react"
import { CircleAlert } from "lucide-react"
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
import { isEmail } from "@/helpers/validation"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState("")

  const setField = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

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
      await login(values.email.trim(), values.password)
      const params = new URLSearchParams(globalThis.location?.search ?? "")
      router.push(params.get("redirect") || "/dashboard")
    } catch {
      setGeneralError("Email o contraseña incorrectos.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToRegister = () => {
    const params = new URLSearchParams(globalThis.location?.search ?? "")
    const redirect = params.get("redirect")
    void router.push(
      redirect
        ? `/register?redirect=${encodeURIComponent(redirect)}`
        : "/register",
    )
  }

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      description="Accedé a tu espacio de escritura y continuá construyendo tu universo narrativo."
      footer={
        <p>
          ¿No tenés cuenta?{" "}
          <Button
            variant="link"
            type="button"
            className="h-auto p-0 text-xs font-medium"
            onClick={goToRegister}
          >
            Registrate
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

          <Field data-invalid={!!errors.password}>
            <div className="flex items-start justify-between gap-3">
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Button
                variant="link"
                type="button"
                className="h-auto shrink-0 p-0 text-xs font-medium text-muted-foreground"
                onClick={() => void router.push("/forgot-password")}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
            <FieldContent>
              <Input
                id="password"
                value={values.password}
                onChange={(event) => setField("password", event.target.value)}
                type="password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
              />
            </FieldContent>
            <FieldError>{errors.password}</FieldError>
          </Field>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner className="size-4" />
                Iniciando sesión
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  )
}
