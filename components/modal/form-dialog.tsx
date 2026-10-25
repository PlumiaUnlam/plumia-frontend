"use client"

import type { FormEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from "@/components/ui/dialog"
import { FormError } from "@/components/ui/form-error"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type FormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** sm 544px · md 704px · lg 944px. En mobile ocupa toda la pantalla. */
  size?: Extract<DialogSize, "sm" | "md" | "lg">
  /** Para un modal que se abre encima de otro (1 sobre la página, 2 sobre otro modal). */
  layer?: 1 | 2
  children: ReactNode
  /** Si no se pasa, no hay `<form>` ni botón de envío (solo "Cerrar"). */
  onSubmit?: () => void | Promise<void>
  /**
   * true (por defecto): el contenido va dentro de un `<form>` y Enter envía.
   * false: para modales con botones propios sin `type="button"`; el botón
   * principal ejecuta `onSubmit` por click.
   */
  enterToSubmit?: boolean
  submitLabel?: string
  cancelLabel?: string
  submitDisabled?: boolean
  /** Bloquea el cierre y muestra un spinner en el botón principal. */
  loading?: boolean
  error?: ReactNode
  /** Acción secundaria alineada a la izquierda del pie (ej. "Eliminar"). */
  footerStart?: ReactNode
  /** Reemplaza por completo los botones del pie. */
  footer?: ReactNode
  contentClassName?: string
  /** Para decidir si un click fuera cierra el modal (ej. cuando hay otro modal encima). */
  onInteractOutside?: (event: Event) => void
  bodyClassName?: string
  showCloseButton?: boolean
}

/**
 * Modal de formulario estándar: encabezado fijo, cuerpo con scroll y pie con
 * Cancelar / acción principal. Pantalla completa en mobile.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "sm",
  layer,
  children,
  onSubmit,
  enterToSubmit = true,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  submitDisabled = false,
  loading = false,
  error,
  footerStart,
  footer,
  contentClassName,
  onInteractOutside,
  bodyClassName,
  showCloseButton = true,
}: Readonly<FormDialogProps>) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Un modal anidado dentro de otro también es hijo en el árbol de React.
    event.stopPropagation()
    if (loading || submitDisabled) return
    void onSubmit?.()
  }

  const footerContent =
    footer ?? (
      <>
        {footerStart ? (
          <div className="flex items-center sm:mr-auto">{footerStart}</div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => onOpenChange(false)}
        >
          {onSubmit ? cancelLabel : "Cerrar"}
        </Button>
        {onSubmit ? (
          <Button
            type={enterToSubmit ? "submit" : "button"}
            disabled={submitDisabled || loading}
            onClick={enterToSubmit ? undefined : () => void onSubmit()}
          >
            {loading ? <Spinner /> : null}
            {submitLabel}
          </Button>
        ) : null}
      </>
    )

  const inner = (
    <>
      <DialogBody className={bodyClassName}>
        {children}
        <FormError>{error}</FormError>
      </DialogBody>
      <DialogFooter>{footerContent}</DialogFooter>
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        layout="sectioned"
        size={size}
        layer={layer}
        showCloseButton={showCloseButton}
        className={contentClassName}
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (loading) event.preventDefault()
          onInteractOutside?.(event)
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        {onSubmit && enterToSubmit ? (
          <form
            onSubmit={handleSubmit}
            className={cn("flex min-h-0 flex-1 flex-col")}
            noValidate
          >
            {inner}
          </form>
        ) : (
          inner
        )}
      </DialogContent>
    </Dialog>
  )
}
