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
import { isEmail } from "@/helpers/validation"
import { useAuth } from "@/contexts/AuthContext"

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
      const redirectTo = params.get("redirect") || "/editor"
      router.push(redirectTo)
    } catch {
      setGeneralError("Email o contraseña incorrectos.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md rounded-3xl bg-card shadow-[0_24px_60px_-30px_rgba(28,15,51,0.45)]">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Bienvenido de nuevo</CardTitle>
            <CardDescription>
              Accedé a tu espacio de escritura y continuá construyendo tu universo narrativo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {generalError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {generalError}
                </div>
              )}

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
                <div className="flex items-start justify-between">
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <Button
                    variant="link"
                    type="button"
                    className="h-auto p-0 text-xs font-medium text-muted-foreground"
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl shadow-sm text-base"
              >
                {isSubmitting ? <Spinner className="size-4" /> : "Iniciar sesión"}
              </Button>
            </form>

            <div className="text-xs text-center mt-4 text-muted-foreground">
              <p>
                ¿No tienes cuenta?{" "}
                <Button
                  variant="link"
                  type="button"
                  className="p-0 h-auto text-xs font-medium"
                  onClick={() => void router.push("/register")}
                >
                  Regístrate
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
