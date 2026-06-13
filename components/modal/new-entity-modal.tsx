import { useState } from "react"
import {Users,Map,Star,Shield,Calendar,Sparkles,Upload,Tag,X,} from "lucide-react"

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

import { Entity } from "@/components/worldbuilding/wiki-panel"

const categories = [
  { id: "Personaje", label: "Personaje", icon: Users },
  { id: "Lugar", label: "Lugar", icon: Map },
  { id: "Objeto", label: "Objeto", icon: Star },
  { id: "Faccion", label: "Facción", icon: Shield },
  { id: "Evento", label: "Evento", icon: Calendar },
  { id: "Concepto", label: "Concepto", icon: Sparkles },
] as const

type NewEntityModalProps = {
  show: boolean
  onClose: () => void
}

export function NewEntityModal({
  show,
  onClose,
}: NewEntityModalProps) {
  const [name, setName] = useState("")
  const [category, setCategory] =
    useState<Entity["category"]>("Personaje")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

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

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="min-w-[600px] gap-0 overflow-hidden">

        <DialogHeader className="p-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Nueva Entidad</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-5 max-h-[65vh] overflow-y-auto">

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre *
            </label>

            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Maren Solís"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tipo *
            </label>

            <div className="grid grid-cols-3 gap-2">
              {categories.map(
                ({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setCategory(
                        id as Entity["category"]
                      )
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
          </div>

          <div className="space-y-2 y-max-h-40">
            <label className="text-sm font-medium">
              Descripción
            </label>

            <Textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe la entidad..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Imagen (Opcional)
            </label>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />

              <p className="text-sm text-muted-foreground">
                Click para subir imagen o usa IA para
                generar
              </p>

              <Button
                variant="secondary"
                className="mt-3"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generar con IA
              </Button>
            </div>
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

              <Button onClick={addTag}>
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
          >
            Cancelar
          </Button>

          <Button
            disabled={!name.trim()}
          >
            Crear entidad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}