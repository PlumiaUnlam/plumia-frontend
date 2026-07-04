import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type NewItemModalProps = {
  show: boolean
  onClose: () => void
  onSubmit: (name: string) => void

  title: string
  label: string
  placeholder: string
  submitText: string
}

export function NewItemModal({
  show,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  submitText,
}: NewItemModalProps) {
  const [name, setName] = useState("")

  const handleSubmit = () => {
    const trimmedName = name.trim()

    if (!trimmedName) return

    onSubmit(trimmedName)
    setName("")
    onClose()
  }

  const handleClose = () => {
    setName("")
    onClose()
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="min-w-[600px] gap-0 overflow-hidden">
        <DialogHeader className="border-b p-6 py-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {label} *
            </label>

            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
            />
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancelar
          </Button>

          <Button
            disabled={!name.trim()}
            onClick={handleSubmit}
          >
            {submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}