"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { isEmail } from "@/helpers/validation"
import { useAuth } from "@/contexts/AuthContext"

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
      nextErrors.acceptedTerms = "Debes aceptar los términos y condiciones para continuar."
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
      await register(values.email, values.password)
      router.push("/editor")
    } catch {
      setGeneralError("No se pudo crear la cuenta. El email podría estar en uso.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md rounded-3xl bg-card shadow-[0_24px_60px_-30px_rgba(28,15,51,0.45)]">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Crea tu cuenta</CardTitle>
            <CardDescription>
              Centralizá tu manuscrito, organizá tu mundo ficticio y mantené la coherencia de tu historia en un solo lugar.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {generalError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {generalError}
                </div>
              )}

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
                    onChange={(event) => setField("confirmPassword", event.target.value)}
                    type="password"
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                  />
                </FieldContent>
                <FieldError>{errors.confirmPassword}</FieldError>
              </Field>

              <Field data-invalid={!!errors.acceptedTerms} orientation="horizontal">
                <Checkbox
                  id="acceptedTerms"
                  checked={acceptedTerms}
                  onCheckedChange={(value) => {
                    setAcceptedTerms(Boolean(value))
                    setErrors((prev) => ({ ...prev, acceptedTerms: "" }))
                  }}
                  aria-invalid={!!errors.acceptedTerms}
                />
                <FieldLabel htmlFor="acceptedTerms" className="text-foreground text-sm font-normal">
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
              </Field>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl shadow-sm text-base"
              >
                {isSubmitting ? <Spinner className="size-4" /> : "Crear cuenta"}
              </Button>
            </form>

            <div className="text-xs text-center mt-4 text-muted-foreground">
              <p>
                ¿Ya tienes cuenta?{" "}
                <Button
                  variant="link"
                  type="button"
                  className="p-0 h-auto text-xs font-medium"
                  onClick={() => void router.push("/login")}
                >
                  Inicia sesión
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
