import * as React from "react"

import { cn } from "@/lib/utils"

/** Mensaje de error dentro de un formulario o modal. No renderiza nada si no hay contenido. */
function FormError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null

  return (
    <p
      role="alert"
      data-slot="form-error"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export { FormError }
