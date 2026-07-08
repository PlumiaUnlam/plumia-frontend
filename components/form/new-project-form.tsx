"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createProject, type ProjectResponse } from "@/services/project.service"

type NewProjectFormProps = {
  onCancel: () => void
  onSuccess?: (project: ProjectResponse) => void
}

export function NewProjectForm({ onCancel, onSuccess }: NewProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState({
    title: "",
    description: "",
    genre: "",
    wordCountTarget: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setField = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!values.title.trim()) {
      nextErrors.title = "El nombre del proyecto es obligatorio."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        genre: values.genre.trim() || undefined,
        wordCountTarget: values.wordCountTarget.trim()
          ? Number(values.wordCountTarget)
          : undefined,
      }

      const newProject = await createProject(payload)
      onSuccess?.(newProject)
      onCancel()
    } catch (error) {
      console.error("Error creating project:", error)
      setErrors((prev) => ({
        ...prev,
        submit: "No se pudo crear el proyecto. Inténtalo nuevamente.",
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Crear nuevo proyecto</DialogTitle>
        <DialogDescription>
          Completa los datos básicos para empezar a trabajar en tu nueva historia.
        </DialogDescription>
      </DialogHeader>

      <div className="w-full space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">Nombre del Proyecto</FieldLabel>
            <FieldContent>
              <Input
                id="title"
                value={values.title}
                onChange={(event) => setField("title", event.target.value)}
                type="text"
                placeholder="Nombre del Proyecto"
                autoComplete="off"
                aria-invalid={!!errors.title}
              />
            </FieldContent>
            <FieldError>{errors.title}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Descripción</FieldLabel>
            <FieldContent>
              <Textarea
                id="description"
                value={values.description}
                onChange={(event) => setField("description", event.target.value)}
                placeholder="Describe brevemente tu proyecto"
                rows={4}
              />
            </FieldContent>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="genre">Género</FieldLabel>
              <FieldContent>
                <Input
                  id="genre"
                  value={values.genre}
                  onChange={(event) => setField("genre", event.target.value)}
                  type="text"
                  placeholder="Fantasía"
                  autoComplete="off"
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="wordCountTarget">Objetivo de palabras</FieldLabel>
              <FieldContent>
                <Input
                  id="wordCountTarget"
                  value={values.wordCountTarget}
                  onChange={(event) => setField("wordCountTarget", event.target.value)}
                  type="number"
                  min="1"
                  placeholder="80000"
                />
              </FieldContent>
            </Field>
          </div>

          {errors.submit ? (
            <p className="text-sm text-destructive">{errors.submit}</p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl shadow-sm text-base"
            >
              {isSubmitting ? <Spinner className="size-4" /> : "Crear proyecto"}
            </Button>
          </div>
        </form>
      </div>
    </DialogContent>
  )
}
