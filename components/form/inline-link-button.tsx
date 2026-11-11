import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Enlace de texto de los formularios («Registrate», «¿Olvidaste tu contraseña?»). Se ve
 * como una línea de texto, pero el área que responde al toque se extiende 6px hacia arriba
 * y hacia abajo para que sea cómodo de tocar en el celular.
 */
export function InlineLinkButton({ className, ...props }: Readonly<ComponentProps<typeof Button>>) {
  return (
    <Button
      variant="link"
      type="button"
      className={cn("relative h-auto p-0 text-xs font-medium after:absolute after:inset-x-0 after:-inset-y-1.5", className)}
      {...props}
    />
  )
}
