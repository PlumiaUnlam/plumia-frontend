import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/components/form/forgot-password-form"

export const metadata: Metadata = {
  title: "Recuperá tu contraseña",
  description:
    "Ingresá tu correo y te enviaremos un enlace para elegir una contraseña nueva.",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
