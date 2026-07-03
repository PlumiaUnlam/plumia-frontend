import React, { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import {
  Search,
  Users,
  Map,
  Star,
  Shield,
  Calendar,
  Sparkles,
} from "lucide-react";

import type { Entity } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";

const CATEGORY_FILTERS = [
  { id: "Personaje" as const, label: "Personaje", icon: Users },
  { id: "Lugar" as const, label: "Lugar", icon: Map },
  { id: "Objeto" as const, label: "Objeto", icon: Star },
  { id: "Faccion" as const, label: "Facción", icon: Shield },
  { id: "Evento" as const, label: "Evento", icon: Calendar },
  { id: "Concepto" as const, label: "Concepto", icon: Sparkles },
];

export type EntityCategory =
  | "Personaje"
  | "Lugar"
  | "Objeto"
  | "Faccion"
  | "Evento"
  | "Concepto";

interface WikiTabProps {
  readonly entities: readonly Entity[];
  readonly loading: boolean;
  readonly error: Error | undefined;
  readonly onEdit: (entity: Entity) => void;
  readonly onDelete: (entity: Entity) => void;
  readonly selectedEntity: Entity | null;
  readonly onSelectEntity: (entity: Entity | null) => void;
}

export function WikiTab({
  entities,
  loading,
  error,
  onEdit,
  onDelete,
  selectedEntity,
  onSelectEntity,
}: WikiTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EntityCategory[]>(
    [],
  );

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const category = TYPE_TO_CATEGORY[entity.type];
      const matchesSearch =
        entity.canonicalName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (entity.description ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory.length === 0 || selectedCategory.includes(category);
      return matchesSearch && matchesCategory;
    });
  }, [entities, searchQuery, selectedCategory]);

  const categoryIcons: Record<
    EntityCategory,
    React.ComponentType<React.ComponentProps<typeof Search>>
  > = {
    Personaje: Users,
    Lugar: Map,
    Objeto: Star,
    Faccion: Shield,
    Evento: Calendar,
    Concepto: Sparkles,
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Error al cargar entidades</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full">
      <aside className="w-80 border-r border-border flex flex-col bg-muted/30 overflow-hidden">
        <div className="p-4 border-b border-border bg-card/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar entidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-3 space-y-3 border-b border-border bg-card/50">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              CATEGORÍAS
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory.length === 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted"
              }`}
              onClick={() => setSelectedCategory([])}
            >
              Todas
            </button>

            {CATEGORY_FILTERS.map(({ id, label, icon: Icon }) => {
              const isSelected = selectedCategory.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted"
                  }`}
                  onClick={() =>
                    setSelectedCategory((prevCategories) =>
                      prevCategories.includes(id)
                        ? prevCategories.filter((c) => c !== id)
                        : [...prevCategories, id],
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="w-full flex-1 min-h-0 p-3">
          <ItemGroup>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Item
                    key={i}
                    variant="outline"
                    size="sm"
                    className="cursor-default"
                  >
                    <ItemMedia variant="icon">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </ItemMedia>
                    <ItemContent>
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </ItemContent>
                  </Item>
                ))
              : filteredEntities.map((entity) => {
                  const category = TYPE_TO_CATEGORY[entity.type];
                  const CategoryIcon = categoryIcons[category] ?? Users;

                  return (
                    <Item
                      key={entity.id}
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectEntity(entity)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectEntity(entity);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className="cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ItemMedia variant="icon">
                        <CategoryIcon className="h-4 w-4" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemHeader>
                          <ItemTitle>{entity.canonicalName}</ItemTitle>
                        </ItemHeader>
                        {entity.aliases.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entity.aliases.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <ItemDescription>
                          {entity.description ?? "Sin descripción"}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  );
                })}
          </ItemGroup>
        </ScrollArea>
      </aside>

      <main className="flex-grow flex flex-col overflow-hidden p-4">
        {selectedEntity ? (
          <>
            <header className="mb-6 flex-shrink-0 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2">
                <h2 className="text-lg font-semibold">
                  {selectedEntity.canonicalName}
                </h2>
                <Badge variant="secondary">
                  {TYPE_TO_CATEGORY[selectedEntity.type]}
                </Badge>
                {selectedEntity.aliases.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  onClick={() => onEdit(selectedEntity)}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDelete(selectedEntity)}
                >
                  Eliminar
                </Button>
              </div>
            </header>

            <div className="flex-1 min-h-0 overflow-auto space-y-6">
              {selectedEntity.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={`/api/storage/image/${selectedEntity.id}?v=${Date.parse(selectedEntity.updatedAt)}`}
                    alt={selectedEntity.canonicalName}
                    className="w-full max-h-[40vh] object-contain bg-muted"
                    loading="lazy"
                  />
                </div>
              )}

              <Card className="mb-6">
                <CardContent className="pt-6">
                  {selectedEntity.description || (
                    <span className="text-muted-foreground italic">
                      Sin descripción
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center bg-background text-muted-foreground">
            Selecciona una entidad
          </div>
        )}
      </main>
    </div>
  );
}
