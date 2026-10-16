import { Suspense } from "react"

import { LoginForm } from "@/components/form/login-form"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
