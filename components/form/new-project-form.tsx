"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  createProject,
  importEpubProject,
  updateProject,
  type CreateProjectPayload,
  type EpubProjectImportResult,
  type ProjectResponse,
} from "@/services/project.service"

type NewProjectFormProps = {
  onCancel: () => void
  onSuccess?: (project: ProjectResponse) => void
  project?: ProjectResponse
}

type ProjectFormValues = {
  title: string
  description: string
  genre: string
  wordCountTarget: string
  status: string
}

function projectPayload(
  values: ProjectFormValues,
  isEditing: boolean,
): CreateProjectPayload {
  return {
    title: values.title.trim(),
    description: isEditing
      ? values.description.trim()
      : values.description.trim() || undefined,
    genre: isEditing ? values.genre.trim() : values.genre.trim() || undefined,
    wordCountTarget: values.wordCountTarget.trim()
      ? Number(values.wordCountTarget)
      : undefined,
  }
}

function showEpubImportSummary(result: EpubProjectImportResult) {
  const imageSummary = ` Se importaron ${result.importedImages} imágenes${
    result.skippedImages
      ? ` y se omitieron ${result.skippedImages} no compatibles.`
      : "."
  }`
  toast.success("Obra importada desde EPUB", {
    description: `${result.importedChapters} capítulos y ${result.importedWords.toLocaleString("es-ES")} palabras.${imageSummary}`,
  })
}

async function saveProject(
  project: ProjectResponse | undefined,
  epubFile: File | null,
  values: ProjectFormValues,
  payload: CreateProjectPayload,
): Promise<ProjectResponse> {
  if (project) {
    return updateProject(project.id, {
      ...payload,
      status: values.status as "draft" | "active" | "archived",
    })
  }
  if (epubFile) {
    const result = await importEpubProject(epubFile, payload)
    showEpubImportSummary(result)
    return result.project
  }
  return createProject(payload)
}

export function NewProjectForm({
  onCancel,
  onSuccess,
  project,
}: Readonly<NewProjectFormProps>) {
  const isEditing = Boolean(project)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [epubFile, setEpubFile] = useState<File | null>(null)
  const [values, setValues] = useState({
    title: project?.title ?? "",
    description: project?.description ?? "",
    genre: project?.genre ?? "",
    wordCountTarget: project ? String(project.wordCountTarget) : "",
    status: project?.status ?? "draft",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const submitButtonLabel = isEditing ? "Guardar cambios" : "Crear proyecto"

  const setField = (field: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const handleEpubFileChange = (file: File | null) => {
    setErrors((prev) => ({ ...prev, epub: "", submit: "" }))
    if (!file) {
      setEpubFile(null)
      return
    }
    if (!file.name.toLowerCase().endsWith(".epub")) {
      setEpubFile(null)
      setErrors((prev) => ({ ...prev, epub: "Seleccioná un archivo .epub." }))
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setEpubFile(null)
      setErrors((prev) => ({
        ...prev,
        epub: "El EPUB no puede superar los 50 MB.",
      }))
      return
    }

    setEpubFile(file)
    setErrors((prev) => ({ ...prev, title: "" }))
    setValues((prev) => ({
      ...prev,
      title: prev.title.trim()
        ? prev.title
        : file.name.replace(/\.epub$/i, "").slice(0, 200),
    }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!values.title.trim()) {
      nextErrors.title = "El nombre del proyecto es obligatorio."
    }
    if (errors.epub) {
      nextErrors.epub = errors.epub
    }

    if (
      values.wordCountTarget.trim() &&
      (!Number.isInteger(Number(values.wordCountTarget)) ||
        Number(values.wordCountTarget) < 1)
    ) {
      nextErrors.wordCountTarget =
        "El objetivo debe ser un número entero mayor que cero."
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
      const payload = projectPayload(values, isEditing)
      const savedProject = await saveProject(project, epubFile, values, payload)
      onSuccess?.(savedProject)
      onCancel()
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "creating"} project:`, error)
      const fallbackMessage = `No se pudo ${isEditing ? "guardar" : "crear"} el proyecto. Inténtalo nuevamente.`
      const reason = error instanceof Error ? error.message : fallbackMessage
      setErrors((prev) => ({
        ...prev,
        submit: epubFile
          ? `No se pudo importar el EPUB. ${reason}`
          : fallbackMessage,
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Editar proyecto" : "Crear nuevo proyecto"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Actualiza los datos generales y el estado del proyecto."
            : "Completa los datos básicos para empezar a trabajar en tu nueva historia."}
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
                maxLength={200}
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

          {!isEditing ? (
            <Field data-invalid={!!errors.epub}>
              <FieldLabel htmlFor="epubFile">
                Importar obra desde EPUB (opcional)
              </FieldLabel>
              <FieldContent>
                <Input
                  id="epubFile"
                  type="file"
                  accept=".epub,application/epub+zip"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    handleEpubFileChange(event.currentTarget.files?.[0] ?? null)
                  }
                  aria-invalid={!!errors.epub}
                />
                <p className="text-sm text-muted-foreground">
                  Importa capítulos, formato básico e imágenes compatibles.
                  Máximo 50 MB.
                </p>
              </FieldContent>
              <FieldError>{errors.epub}</FieldError>
            </Field>
          ) : null}

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
                  maxLength={100}
                />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.wordCountTarget}>
              <FieldLabel htmlFor="wordCountTarget">Objetivo de palabras</FieldLabel>
              <FieldContent>
                <Input
                  id="wordCountTarget"
                  value={values.wordCountTarget}
                  onChange={(event) => setField("wordCountTarget", event.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="80000"
                  aria-invalid={!!errors.wordCountTarget}
                />
              </FieldContent>
              <FieldError>{errors.wordCountTarget}</FieldError>
            </Field>
          </div>

          {isEditing ? (
            <Field>
              <FieldLabel htmlFor="status">Estado</FieldLabel>
              <FieldContent>
                <Select
                  value={values.status}
                  onValueChange={(value) => setField("status", value)}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="archived">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          ) : null}

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
              {isSubmitting ? <Spinner className="size-4" /> : submitButtonLabel}
            </Button>
          </div>
        </form>
      </div>
    </DialogContent>
  )
}
