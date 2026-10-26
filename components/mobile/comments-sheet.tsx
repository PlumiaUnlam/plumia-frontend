"use client"

import type { ReactNode } from "react"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

type CommentsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

/** Panel inferior para leer y responder comentarios en mobile. */
export function CommentsSheet({
  open,
  onOpenChange,
  children,
}: Readonly<CommentsSheetProps>) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Comentarios</DrawerTitle>
          <DrawerDescription>
            Comentarios de la obra compartida y sus respuestas.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-4 pb-6 pt-3">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
