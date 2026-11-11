"use client"

type AiKeyStatusProps = {
  configured?: boolean
  keyPrefix?: string | null
}

export function getAiKeyPlaceholder(configured?: boolean) {
  return configured ? "Ingresá una nueva clave para reemplazarla" : "Pegá tu API Key"
}

/** Explica de dónde sale la clave de Gemini y, si es propia, muestra su prefijo. */
export function AiKeyStatus({ configured = false, keyPrefix = null }: Readonly<AiKeyStatusProps>) {
  const state = configured ? "Configurada" : "Se usa la clave del servidor"
  const prefix = keyPrefix ? ` (${keyPrefix})` : ""

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Extracción de entidades e inconsistencias</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Podés usar tu propia API Key de Gemini. Se almacena cifrada y nunca volvemos a mostrarla
        completa.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Estado: {state}
        {prefix}
      </p>
    </div>
  )
}
