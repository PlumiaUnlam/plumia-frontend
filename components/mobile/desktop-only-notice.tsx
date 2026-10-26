"use client"

import { Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

type DesktopOnlyNoticeProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nombre de la función bloqueada, por ejemplo «Editor». */
  featureLabel?: string
}

export function DesktopOnlyNotice({
  open,
  onOpenChange,
  featureLabel,
}: Readonly<DesktopOnlyNoticeProps>) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="items-center text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary-text">
            <Monitor className="size-6" aria-hidden />
          </span>
          <DrawerTitle>Disponible en computadora</DrawerTitle>
          <DrawerDescription>
            {featureLabel ? `${featureLabel} se usa desde una PC. ` : ""}
            Entrá desde ahí para tener todas las funcionalidades de PlumIA:
            editor, control de versiones, chat con IA y más.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
