import React, { useState, useMemo } from 'react';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Entity {
  id: string;
  name: string;
  description: string;
  category: EntityCategory;
  tags: string[];
  hasImage: boolean;
  imageUrl?: string; // Añade este campo para la URL de la imagen
}

const entities: Entity[] = [
  {
    id: '1',
    name: 'John Doe',
    description: 'Un personaje misterioso con un pasado oscuro.',
    category: 'Personaje',
    tags: ['Protagonista', 'Humano'],
    hasImage: false,
    imageUrl: '' // Añade la URL de la imagen
  },
  {
    id: '2',
    name: 'Ciudad de las Sombras',
    description: 'Una ciudad oscura y peligrosa donde se desarrollan muchas de las historias.',
    category: 'Lugar',
    tags: ['Ciudad', 'Peligrosa'],
    hasImage: false,
    imageUrl: '' // Añade la URL de la imagen
  },
    {
    id: '3',
    name: 'John Doe',
    description: 'Un personaje misterioso con un pasado oscuro.',
    category: 'Personaje',
    tags: ['Protagonista', 'Humano'],
    hasImage: false,
    imageUrl: '' // Añade la URL de la imagen
  },
  {
    id: '4',
    name: 'Ciudad de las Sombras',
    description: 'Una ciudad oscura y peligrosa donde se desarrollan muchas de las historias.',
    category: 'Lugar',
    tags: ['Ciudad', 'Peligrosa'],
    hasImage: false,
    imageUrl: '' // Añade la URL de la imagen
  },
    {
    id: '5',
    name: 'John Doe',
    description: 'Un personaje misterioso con un pasado oscuro.',
    category: 'Personaje',
    tags: ['Protagonista', 'Humano'],
    hasImage: false,
    imageUrl: '' // Añade la URL de la imagen
  },
  {
    id: '6',
    name: 'Ciudad de las Sombras',
    description: 'Una ciudad oscura y peligrosa donde se desarrollan muchas de las historias.',
    category: 'Lugar',
    tags: ['Ciudad', 'Peligrosa'],
    hasImage: false,
    imageUrl: '' // Añade la URL de la imagen
  }
];

type EntityCategory = 'Personaje' | 'Lugar' | 'Objeto' | 'Evento';

export function WikiTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  // Filtrar entidades basándose en el query de búsqueda y categorías seleccionadas
  const filteredEntities = useMemo(() => {
    return entities.filter(entity =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).filter(entity => selectedCategory.length === 0 || selectedCategory.includes(entity.category));
  }, [searchQuery, selectedCategory]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    return Array.from(new Set(filteredEntities.map(entity => entity.category)));
  }, [filteredEntities]);

  return (
    <div className="flex w-full h-screen">
      <aside className="w-90 px-4 py-6 text-foreground flex flex-col gap-4 border-r border-border">
        <Input
          placeholder="Buscar entidades..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <h2 className="font-bold">Filtrar por categorías</h2>
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
        <ScrollArea className="w-full h-[calc(130vh-364px)]">
          {filteredEntities.map(entity => (
            <Card key={entity.id} onClick={() => setSelectedEntity(entity)}>
              <CardHeader>
                <CardTitle>{entity.name}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {entity.tags.map(tag => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          ))}
        </ScrollArea>
      </aside>

      <main className="flex-grow p-4">
        {selectedEntity ? (
          <>
            <header className="mb-6 flex items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                {selectedEntity.name}
                {selectedEntity.tags.map(tag => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Editar</Button>
                <Button variant="default">Eliminar</Button>
              </div>
            </header>

            {/* Descripción */}
            <Card className="mb-6">
              <CardContent>
                {selectedEntity.description}
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