"use client"

import { MessageSquarePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type SelectionCommentBarProps = {
  selectedText: string
  onComment: () => void
  onDismiss: () => void
}

/**
 * Barra inferior que ofrece comentar el texto seleccionado. En el celular la
 * selección se ajusta con el dedo, así que no abrimos el formulario hasta que
 * la persona toque «Comentar».
 */
export function SelectionCommentBar({
  selectedText,
  onComment,
  onDismiss,
}: Readonly<SelectionCommentBarProps>) {
  return (
    <section
      aria-label="Comentar selección"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.3)] md:hidden"
    >
      <p className="min-w-0 flex-1 truncate text-xs italic text-muted-foreground">
        “{selectedText}”
      </p>
      <Button type="button" size="sm" className="shrink-0" onClick={onComment}>
        <MessageSquarePlus className="size-4" aria-hidden />
        Comentar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Descartar selección"
        onClick={onDismiss}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </section>
  )
}
