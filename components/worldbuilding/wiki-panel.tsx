import { useMemo, useState } from "react";

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
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import { Search, PenLine, Trash2, Funnel, StarIcon } from "lucide-react";

import type { Entity, EntityCategory } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";
import { ENTITY_CATEGORY_STYLES } from "@/lib/entity-category-style";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import { ImageGallery } from "@/components/worldbuilding/image-gallery";
import type {
  ImageGenerationJob,
  ImageResponse,
} from "@/services/image-generation.service";

interface WikiTabProps {
  readonly entities: readonly Entity[];
  readonly loading: boolean;
  readonly error: Error | undefined;
  readonly onEdit: (entity: Entity) => void;
  readonly onDelete: (entity: Entity) => void;
  readonly selectedEntity: Entity | null;
  readonly onSelectEntity: (entity: Entity | null) => void;
  readonly images: ImageResponse[];
  readonly primaryImageUrls: Readonly<Record<string, string>>;
  readonly imagesLoading: boolean;
  readonly activeImageJob: ImageGenerationJob | null;
  readonly onGenerateImage: () => void;
  readonly onUploadImage: (file: File) => Promise<void>;
  readonly onSetPrimaryImage: (imageId: string) => void;
  readonly onDeleteImage: (image: ImageResponse) => void;
}

export function WikiTab({
  entities,
  loading,
  error,
  onEdit,
  onDelete,
  selectedEntity,
  onSelectEntity,
  images,
  primaryImageUrls,
  imagesLoading,
  activeImageJob,
  onGenerateImage,
  onUploadImage,
  onSetPrimaryImage,
  onDeleteImage,
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

  const selectedEntityCategory = selectedEntity
    ? TYPE_TO_CATEGORY[selectedEntity.type]
    : null;
  const selectedEntityPrimaryImage = images.find((image) => image.isPrimary);
  const selectedEntityImageSrc = selectedEntity
    ? (selectedEntityPrimaryImage?.imageUrl ??
      primaryImageUrls[selectedEntity.id] ??
      `/api/storage/image/${selectedEntity.id}?v=${Date.parse(selectedEntity.updatedAt)}`)
    : "";

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
    <div className="flex w-full h-full min-h-0 min-w-0 overflow-hidden">
      <aside className="w-80 shrink-0 border-r border-border flex flex-col min-h-0 h-full bg-muted/30 overflow-hidden">
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
          <div className="flex items-center gap-1">
            <Funnel size={15} className="text-muted-foreground" />
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

            {ENTITY_CATEGORY_STYLES.map((categoryStyle) => {
              const { id, label, icon: Icon } = categoryStyle;
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
                  <Icon
                    className="h-4 w-4"
                    style={{ color: categoryStyle.color }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="w-full flex-1 min-h-0 h-full p-3">
          <ItemGroup className="min-w-0">
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
                  const src = `/api/storage/image/${entity.id}?v=${Date.parse(entity.updatedAt)}`;
                  const primaryImageUrl = primaryImageUrls[entity.id];
                  const isSelected = selectedEntity?.id === entity.id;
                  const entityCategory = TYPE_TO_CATEGORY[entity.type];

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
                      className={`cursor-pointer focus-visible:ring-2 focus-visible:ring-primary transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-white hover:bg-muted/50"
                      }`}
                    >
                      {primaryImageUrl ||
                      entity.imageUrl ||
                      (isSelected && selectedEntityPrimaryImage) ? (
                        <ItemMedia variant="image">
                          <EntityImage
                            src={
                              isSelected && selectedEntityPrimaryImage
                                ? selectedEntityPrimaryImage.imageUrl
                                : (primaryImageUrl ?? src)
                            }
                            alt={entity.canonicalName}
                            width={128}
                            height={128}
                            className="aspect-square w-full rounded-sm object-cover"
                            category={entityCategory}
                            iconClassName="h-4 w-4"
                          />
                        </ItemMedia>
                      ) : (
                        <ItemMedia variant="image">
                          <EntityIconTile
                            category={entityCategory}
                            className="size-full rounded-sm"
                            iconClassName="h-4 w-4"
                          />
                        </ItemMedia>
                      )}
                      <ItemContent className="min-w-0">
                        <ItemTitle className="max-w-full">
                          {entity.canonicalName}
                        </ItemTitle>
                        {entity.aliases.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entity.aliases.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <ItemDescription className="break-words">
                          {entity.description ?? "Sin descripción"}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  );
                })}
          </ItemGroup>
        </ScrollArea>
      </aside>

      <main className="flex-grow flex flex-col min-h-0 min-w-0 overflow-y-auto overscroll-contain p-12 bg-muted/30">
        {selectedEntity ? (
          <>
            <header className="mb-8 flex-shrink-0 flex flex-wrap items-start gap-4 justify-between">
              <div className="flex min-w-0 items-start gap-4">
                {(selectedEntity.imageUrl ||
                  selectedEntityPrimaryImage ||
                  primaryImageUrls[selectedEntity.id]) &&
                selectedEntityCategory ? (
                  <EntityImage
                    src={selectedEntityImageSrc}
                    alt={selectedEntity.canonicalName}
                    width={112}
                    height={112}
                    className="size-28 shrink-0 rounded-lg border border-border bg-background object-cover"
                    category={selectedEntityCategory}
                    iconClassName="h-10 w-10"
                  />
                ) : selectedEntityCategory ? (
                  <EntityIconTile
                    category={selectedEntityCategory}
                    className="size-28 rounded-lg"
                    iconClassName="h-10 w-10"
                  />
                ) : null}

                <div className="flex min-w-0 flex-col gap-2 pt-1">
                  {selectedEntityCategory && (
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {selectedEntityCategory}
                    </p>
                  )}
                  <h2 className="truncate text-3xl font-semibold leading-tight">
                    {selectedEntity.canonicalName}
                  </h2>
                  {selectedEntity.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEntity.aliases.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="default"
                  onClick={() => onEdit(selectedEntity)}
                >
                  <PenLine size={16} />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onDelete(selectedEntity)}
                >
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              </div>
            </header>

            <div className="min-w-0 flex-1 space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  DESCRIPCION
                </h3>
                <Card className="min-w-0 w-full bg-muted/30">
                  <CardContent className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {selectedEntity.description || (
                      <span className="text-muted-foreground italic">
                        Sin descripción
                      </span>
                    )}
                  </CardContent>
                </Card>
              </section>

              <ImageGallery
                images={images}
                loading={imagesLoading}
                activeJob={activeImageJob}
                category={selectedEntityCategory ?? "Personaje"}
                onGenerate={onGenerateImage}
                onUpload={onUploadImage}
                onSetPrimary={onSetPrimaryImage}
                onDelete={onDeleteImage}
              />

              {/* {selectedEntity.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={`/api/storage/image/${selectedEntity.id}?v=${Date.parse(selectedEntity.updatedAt)}`}
                    alt={selectedEntity.canonicalName}
                    className="w-full max-h-[40vh] object-contain bg-muted"
                    loading="lazy"
                  />
                </div>
              )} */}
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-primary opacity-70 gap-2">
            <StarIcon size={48} />
            <h2 className="text-lg font-semibold">Selecciona una entidad</h2>
            <p>
              Haz click en cualquier entidad de la lista para ver sus detalles
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
