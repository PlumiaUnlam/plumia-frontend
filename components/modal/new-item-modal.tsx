import { useState } from "react"

import { FormDialog } from "@/components/modal/form-dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type NewItemModalProps = {
  show: boolean
  onClose: () => void
  onSubmit: (name: string) => void | Promise<void>

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
}: Readonly<NewItemModalProps>) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmedName = name.trim()

    if (!trimmedName || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(trimmedName)
      setName("")
      onClose()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el elemento.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return

    setName("")
    setError(null)
    onClose()
  }

  return (
    <FormDialog
      open={show}
      onOpenChange={(open) => !open && handleClose()}
      title={title}
      size="sm"
      submitLabel={submitText}
      submitDisabled={!name.trim()}
      loading={isSubmitting}
      error={error}
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor="new-item-name">
          {label} <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input
            id="new-item-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder={placeholder}
            autoFocus
          />
        </FieldContent>
      </Field>
    </FormDialog>
  )
}
