"use client"

import { useState, type FormEvent } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createProject } from "@/services/project.service";

type NewProjectFormProps = {
  onCancel?: () => void
}

export function NewProjectForm({ onCancel }: NewProjectFormProps) {

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [values, setValues] = useState({
    projectName: "",
    description: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setField = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!values.projectName.trim()) {
      nextErrors.projectName = "El nombre del proyecto es obligatorio."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    handleCreateProject(values.projectName)
    setTimeout(() => {
      setIsSubmitting(false)
    }, 900)
    
    if (onCancel){
      onCancel();
    }
  }

  const handleCreateProject = async (projectName: string) => {
    const newProject = await createProject(projectName);
  };

  return (
    <Card className="w-full max-w-md rounded-3xl bg-card shadow-[0_24px_60px_-30px_rgba(28,15,51,0.45)]">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-2xl md:text-3xl">Nuevo Proyecto</CardTitle>

          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
              x 
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field data-invalid={!!errors.projectName}>
            <FieldLabel htmlFor="projectName">Nombre del Proyecto</FieldLabel>
            <FieldContent>
              <Input
                id="projectName"
                value={values.projectName}
                onChange={(event) => setField("projectName", event.target.value)}
                type="text"
                placeholder="Nombre del Proyecto"
                autoComplete="Project Name"
                aria-invalid={!!errors.projectName}
              />
            </FieldContent>
            <FieldError>{errors.projectName}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">Descripción</FieldLabel>
            <FieldContent>
              <Input
                id="description"
                value={values.description}
                onChange={(event) => setField("description", event.target.value)}
                type="text"
                placeholder="Describe brevemente tu proyecto"
                autoComplete="description"
                aria-invalid={!!errors.description}
              />
            </FieldContent>
            <FieldError>{errors.description}</FieldError>
          </Field>


        <div className="flex items-right justify-end gap-3">
            {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
              Cancelar
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl shadow-sm text-base"
          >
            {isSubmitting ? <Spinner className="size-4" /> : "Crear proyecto"}
          </Button>

        </div>
        </form>
      </CardContent>
    </Card>
  )
}
