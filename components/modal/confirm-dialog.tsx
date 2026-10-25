"use client"

import type { ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FormError } from "@/components/ui/form-error"
import { Spinner } from "@/components/ui/spinner"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** false para avisos con un solo botón (ej. "Entendido"). */
  showCancel?: boolean
  /** `destructive` para borrar o descartar; `default` para confirmaciones neutras. */
  tone?: "destructive" | "default"
  /** Mientras es true el modal no se puede cerrar y el botón muestra un spinner. */
  loading?: boolean
  error?: ReactNode
  /** Contenido extra entre la descripción y los botones. */
  children?: ReactNode
  onConfirm: () => void | Promise<void>
}

/**
 * Confirmación estándar (400px de ancho máximo). Reemplaza los diálogos de
 * "¿Seguro que querés eliminar…?" armados a mano.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  showCancel = true,
  tone = "destructive",
  loading = false,
  error,
  children,
  onConfirm,
}: Readonly<ConfirmDialogProps>) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {children}
        <FormError>{error}</FormError>
        <AlertDialogFooter>
          {showCancel ? (
            <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            variant={tone === "destructive" ? "destructive" : "default"}
            disabled={loading}
            onClick={(event) => {
              // Evita que Radix cierre el modal antes de que termine la acción.
              event.preventDefault()
              void onConfirm()
            }}
          >
            {loading ? <Spinner /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
