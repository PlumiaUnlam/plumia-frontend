import type { Metadata } from "next"

import { VerifyEmailForm } from "@/components/form/verify-email-form"

export const metadata: Metadata = {
  title: "Verificá tu correo",
  description: "Confirmá tu correo electrónico para activar tu cuenta de PlumIA.",
}

export default function VerifyEmailPage() {
  return <VerifyEmailForm />
}