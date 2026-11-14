import Image from "next/image"

import { cn } from "@/lib/utils"

export const PLUMIA_LOADER_LIGHT_SRC = "/plumia-loader-claro.svg"
export const PLUMIA_LOADER_DARK_SRC = "/plumia-loader-oscuro.svg"

/**
 * Loader animado de marca. Cada SVG trae su propia animación CSS (y respeta
 * `prefers-reduced-motion`); se muestra la variante que corresponde al tema.
 */
function PlumiaLoader({
  label = "Cargando",
  showLabel = false,
  className,
}: Readonly<{
  label?: string
  showLabel?: boolean
  className?: string
}>) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={showLabel ? undefined : label}
      className="flex flex-col items-center gap-2 text-sm text-muted-foreground"
    >
      <span className={cn("relative block size-20", className)} aria-hidden="true">
        <Image
          src={PLUMIA_LOADER_LIGHT_SRC}
          alt=""
          fill
          unoptimized
          priority
          className="object-contain dark:hidden"
        />
        <Image
          src={PLUMIA_LOADER_DARK_SRC}
          alt=""
          fill
          unoptimized
          priority
          className="hidden object-contain dark:block"
        />
      </span>
      {showLabel && <span>{label}</span>}
    </div>
  )
}

export { PlumiaLoader }
