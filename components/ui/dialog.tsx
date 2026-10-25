"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 duration-100 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Tamaños de modal (ancho máximo en desktop; ver docs/design-system.md).
 * - `sm` 480px: formularios de 1–3 campos.
 * - `md` 640px: formularios con secciones.
 * - `lg` 880px: espacios de trabajo (2 columnas, galerías, vistas previas).
 * - `default`, `medium`, `wide`, `large`: tamaños anteriores, solo para modales sin migrar.
 */
export type DialogSize =
  | "sm"
  | "md"
  | "lg"
  | "default"
  | "medium"
  | "wide"
  | "large"

const LEGACY_SIZE_CLASS = {
  default: "sm:max-w-sm",
  medium: "sm:max-w-2xl",
  wide: "sm:max-w-3xl",
  large: "sm:max-w-4xl",
} as const

// Con `layout="sectioned"` el modal es pantalla completa por debajo de md (768px),
// por eso los anchos se aplican desde md y no desde sm.
const SECTIONED_SIZE_CLASS = {
  sm: "md:max-w-dialog-sm",
  md: "md:max-w-dialog-md",
  lg: "md:max-w-dialog-lg",
  default: "md:max-w-dialog-sm",
  medium: "md:max-w-dialog-md",
  wide: "md:max-w-dialog-lg",
  large: "md:max-w-dialog-lg",
} as const

const LAYER_CLASS = {
  1: "z-[60]",
  2: "z-[70]",
} as const

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "default",
  layout = "default",
  layer,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  size?: DialogSize
  /**
   * `sectioned`: encabezado fijo, cuerpo con scroll (`DialogBody`) y pie fijo.
   * Pantalla completa en mobile (< 768px).
   */
  layout?: "default" | "sectioned"
  /** Para un modal que se abre encima de otro: 1 sobre la página, 2 sobre otro modal. */
  layer?: 1 | 2
}) {
  const sectioned = layout === "sectioned"
  const sizeClassName = sectioned
    ? SECTIONED_SIZE_CLASS[size]
    : size === "sm" || size === "md" || size === "lg"
      ? SECTIONED_SIZE_CLASS[size].replace("md:", "sm:")
      : LEGACY_SIZE_CLASS[size]

  return (
    <DialogPortal>
      <DialogOverlay className={layer ? LAYER_CLASS[layer] : undefined} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-layout={layout}
        className={cn(
          "group/dialog fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 duration-100 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          sectioned &&
            "flex flex-col gap-0 overflow-hidden p-0 md:max-h-[min(88dvh,800px)] max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:ring-0",
          sizeClassName,
          layer && LAYER_CLASS[layer],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className={cn(
                "absolute",
                sectioned ? "top-3 right-3 md:right-4" : "top-2 right-2"
              )}
              size="icon-sm"
            >
              <XIcon />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5",
        "group-data-[layout=sectioned]/dialog:shrink-0 group-data-[layout=sectioned]/dialog:border-b group-data-[layout=sectioned]/dialog:px-4 group-data-[layout=sectioned]/dialog:py-4 group-data-[layout=sectioned]/dialog:pr-14 md:group-data-[layout=sectioned]/dialog:px-6",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        "group-data-[layout=sectioned]/dialog:m-0 group-data-[layout=sectioned]/dialog:shrink-0 group-data-[layout=sectioned]/dialog:rounded-none group-data-[layout=sectioned]/dialog:bg-muted/40 group-data-[layout=sectioned]/dialog:px-4 group-data-[layout=sectioned]/dialog:pt-3 group-data-[layout=sectioned]/dialog:pb-[max(0.75rem,env(safe-area-inset-bottom))] md:group-data-[layout=sectioned]/dialog:px-6 md:group-data-[layout=sectioned]/dialog:py-4 max-sm:group-data-[layout=sectioned]/dialog:[&>button]:w-full",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Cerrar</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

/** Zona con scroll de un modal `layout="sectioned"`. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 md:px-6",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-snug font-semibold",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
