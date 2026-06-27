import { useState, useEffect, useRef } from "react"
import { Loader2, Users, Map, Star, Shield, Calendar, Sparkles, Tag, X, ImageIcon, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { Entity, CreateEntityInput, UpdateEntityInput } from "@/types/entity"
import { CATEGORY_TO_TYPE, TYPE_TO_CATEGORY } from "@/types/entity"
import type { EntityCategory } from "@/components/worldbuilding/wiki-panel"

const categories = [
  { id: "Personaje" as EntityCategory, label: "Personaje", icon: Users },
  { id: "Lugar" as EntityCategory, label: "Lugar", icon: Map },
  { id: "Objeto" as EntityCategory, label: "Objeto", icon: Star },
  { id: "Faccion" as EntityCategory, label: "Facción", icon: Shield },
  { id: "Evento" as EntityCategory, label: "Evento", icon: Calendar },
  { id: "Concepto" as EntityCategory, label: "Concepto", icon: Sparkles },
]

type NewEntityModalProps = {
  readonly show: boolean
  readonly onClose: () => void
  readonly onSubmit: (data: CreateEntityInput | UpdateEntityInput, file?: File | null) => Promise<void>
  readonly entity?: Entity | null
}

export function NewEntityModal({
  show,
  onClose,
  onSubmit,
  entity,
}: NewEntityModalProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<EntityCategory>("Personaje")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!entity

  useEffect(() => {
    if (show) {
      if (entity) {
        setName(entity.canonicalName)
        setCategory(TYPE_TO_CATEGORY[entity.type])
        setDescription(entity.description ?? "")
        setTags(entity.aliases)
      } else {
        setName("")
        setCategory("Personaje")
        setDescription("")
        setTags([])
      }
      setTagInput("")
      setError(null)
      setSubmitting(false)
      setSelectedFile(null)
      setPreviewUrl(null)
    }
  }, [show, entity])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const addTag = () => {
    if (!tagInput.trim()) return

    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
    }

    setTagInput("")
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const type = CATEGORY_TO_TYPE[category]
      if (isEditing && entity) {
        const input: UpdateEntityInput = {
          canonicalName: name.trim(),
          type,
          description: description.trim() || null,
          aliases: tags.length > 0 ? tags : null,
        }
        await onSubmit(input, selectedFile)
      } else {
        const input: CreateEntityInput = {
          canonicalName: name.trim(),
          type,
          description: description.trim() || undefined,
          aliases: tags.length > 0 ? tags : undefined,
        }
        await onSubmit(input, selectedFile)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la entidad")
    } finally {
      setSubmitting(false)
    }
  }

  const imagePreview = previewUrl ? (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <img
        src={previewUrl}
        alt="Preview"
        className="w-full h-48 object-contain bg-muted"
      />
      <button
        type="button"
        onClick={handleRemoveFile}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  ) : isEditing && entity?.imageUrl ? (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <img
        src={`/api/storage/image/${entity.id}?v=${Date.parse(entity.updatedAt)}`}
        alt={entity.canonicalName}
        className="w-full h-48 object-contain bg-muted"
        loading="lazy"
      />
    </div>
  ) : null

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[600px] gap-0 overflow-hidden">

        <DialogHeader className="p-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{isEditing ? "Editar Entidad" : "Nueva Entidad"}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-5 max-h-[65vh] overflow-y-auto">

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="entity-name" className="text-sm font-medium">
              Nombre *
            </label>

            <Input
              id="entity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Maren Solís"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Tipo *
            </legend>

            <div className="grid grid-cols-3 gap-2">
              {categories.map(
                ({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setCategory(id)
                    }
                    className={`
                      flex items-center gap-2
                      px-3 py-2
                      rounded-lg border
                      transition-colors

                      ${
                        category === id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />

                    <span className="text-sm font-medium">
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>
          </fieldset>

          <div className="space-y-2 y-max-h-40">
            <label htmlFor="entity-description" className="text-sm font-medium">
              Descripción
            </label>

            <Textarea
              id="entity-description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe la entidad..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="entity-image" className="text-sm font-medium">
              Imagen {selectedFile ? "(1 seleccionada)" : "(Opcional)"}
            </label>

            <input
              id="entity-image"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileSelect}
              className="hidden"
            />

            {imagePreview}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {selectedFile ? "Cambiar imagen" : "Seleccionar imagen"}
              </p>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Etiquetas
            </label>

            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) =>
                  setTagInput(e.target.value)
                }
                placeholder="Agregar etiqueta..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />

              <Button onClick={addTag} type="button">
                Agregar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm"
                >
                  <Tag className="h-3 w-3" />

                  {tag}

                  <button
                    onClick={() =>
                      removeTag(tag)
                    }
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>

          <Button
            disabled={!name.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar cambios" : "Crear entidad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
