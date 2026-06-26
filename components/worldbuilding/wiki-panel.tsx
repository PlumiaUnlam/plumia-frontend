import React, { useState, useMemo } from 'react';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

import type { Entity } from "@/types/entity"
import { TYPE_TO_CATEGORY } from "@/types/entity"

export type EntityCategory = 'Personaje' | 'Lugar' | 'Objeto' | 'Faccion' | 'Evento' | 'Concepto';

interface WikiTabProps {
  entities: Entity[]
  loading: boolean
  error: Error | undefined
  onEdit: (entity: Entity) => void
  onDelete: (entity: Entity) => void
  selectedEntity: Entity | null
  onSelectEntity: (entity: Entity | null) => void
}

export function WikiTab({ entities, loading, error, onEdit, onDelete, selectedEntity, onSelectEntity }: WikiTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EntityCategory[]>([]);

  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      const category = TYPE_TO_CATEGORY[entity.type]
      const matchesSearch = entity.canonicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entity.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory.length === 0 || selectedCategory.includes(category)
      return matchesSearch && matchesCategory
    })
  }, [entities, searchQuery, selectedCategory])

  const categories = useMemo(() => {
    return Array.from(new Set(entities.map(e => TYPE_TO_CATEGORY[e.type])))
  }, [entities])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Error al cargar entidades</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full h-full">
      <aside className="w-80 border-r border-border flex flex-col bg-muted/30">
        <Input className="p-4 border-b border-border bg-card/50"
          placeholder="Buscar entidades..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <h2 className="p-3 border-b border-border bg-card/30">Filtrar por categorías</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory.includes(category) ? 'default' : 'secondary'}
              onClick={() => setSelectedCategory(prevCategories =>
                prevCategories.includes(category) ? prevCategories.filter(c => c !== category) : [...prevCategories, category]
              )}
            >
              {category}
            </Button>
          ))}
        </div>
        <h2 className="font-bold">Lista de entidades</h2>
        <ScrollArea className="w-full flex-1 min-h-0">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="m-2">
                <CardHeader>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            filteredEntities.map(entity => (
              <Card key={entity.id} onClick={() => onSelectEntity(entity)} className="cursor-pointer">
                <CardHeader>
                  <CardTitle>{entity.canonicalName}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{TYPE_TO_CATEGORY[entity.type]}</Badge>
                    {entity.aliases.map(tag => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </ScrollArea>
      </aside>

      <main className="flex-grow p-4">
        {selectedEntity ? (
          <>
            <header className="mb-6 flex items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <h2 className="text-lg font-semibold">{selectedEntity.canonicalName}</h2>
                <Badge variant="secondary">{TYPE_TO_CATEGORY[selectedEntity.type]}</Badge>
                {selectedEntity.aliases.map(tag => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="default" onClick={() => onEdit(selectedEntity)}>Editar</Button>
                <Button variant="destructive" onClick={() => onDelete(selectedEntity)}>Eliminar</Button>
              </div>
            </header>

            {selectedEntity.imageUrl && (
              <div className="mb-6 rounded-lg overflow-hidden border border-border">
                <img
                  src={`/api/storage/image/${selectedEntity.id}?v=${Date.parse(selectedEntity.updatedAt)}`}
                  alt={selectedEntity.canonicalName}
                  className="w-full max-h-64 object-contain bg-muted"
                  loading="lazy"
                />
              </div>
            )}

            <Card className="mb-6">
              <CardContent className="pt-6">
                {selectedEntity.description || (
                  <span className="text-muted-foreground italic">Sin descripción</span>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-background text-muted-foreground">
            Selecciona una entidad
          </div>
        )}
      </main>
    </div>
  );
}
