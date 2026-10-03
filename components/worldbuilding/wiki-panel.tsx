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

import {
  Search,
  PenLine,
  Trash2,
  Funnel,
  StarIcon,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";

import type { Entity, EntityCategory } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";
import { ENTITY_CATEGORY_STYLES } from "@/lib/entity-category-style";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import { ImageGallery } from "@/components/worldbuilding/image-gallery";
import {
  getEntityAttributes,
  VISUAL_IDENTITY_COPY,
} from "@/lib/entity-wiki";
import type { Relationship } from "@/types/relationship";
import type { TimelineEvent } from "@/types/timeline";
import type {
  ImageGenerationJob,
  ImageResponse,
} from "@/services/image-generation.service";

function SelectedEntityVisual({
  entity,
  category,
  imageSrc,
  hasImage,
}: Readonly<{
  entity: Entity;
  category: EntityCategory;
  imageSrc: string;
  hasImage: boolean;
}>) {
  if (hasImage) {
    return (
      <EntityImage
        src={imageSrc}
        alt={entity.canonicalName}
        width={112}
        height={112}
        className="size-28 shrink-0 rounded-lg border border-border bg-background object-cover"
        category={category}
        iconClassName="h-10 w-10"
      />
    );
  }

  return (
    <EntityIconTile
      category={category}
      className="size-28 rounded-lg"
      iconClassName="h-10 w-10"
    />
  );
}

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
  readonly imageActionError?: string | null;
  readonly relationships: readonly Relationship[];
  readonly relationshipError: Error | undefined;
  readonly timelineEvents: readonly TimelineEvent[];
  readonly timelineEventsError: Error | undefined;
  readonly linksLoading: boolean;
  readonly onOpenEntity: (entityId: string) => void;
  readonly onOpenTimelineEvent: (eventId: string) => void;
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
  imageActionError,
  relationships,
  relationshipError,
  timelineEvents,
  timelineEventsError,
  linksLoading,
  onOpenEntity,
  onOpenTimelineEvent,
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
      selectedEntity.imageUrl ??
      `/api/storage/image/${selectedEntity.id}?v=${Date.parse(selectedEntity.updatedAt)}`)
    : "";
  const selectedEntityRelationships = selectedEntity
    ? relationships.filter(
        (relationship) =>
          relationship.sourceEntityId === selectedEntity.id ||
          relationship.targetEntityId === selectedEntity.id,
      )
    : [];
  const linkedTimelineEvents = selectedEntity
    ? timelineEvents.filter((event) =>
        event.entityIds.includes(selectedEntity.id),
      )
    : [];

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
      <aside className="w-48 shrink-0 border-r border-border flex flex-col min-h-0 h-full bg-muted/30 overflow-hidden sm:w-60 lg:w-80">
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
                          : "bg-white hover:bg-muted/50 dark:bg-card"
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
                                : (primaryImageUrl ?? entity.imageUrl ?? src)
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

      <main className="flex-grow flex flex-col min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 bg-muted/30 sm:p-6 lg:p-10">
        {selectedEntity ? (
          <>
            <header className="mb-8 flex-shrink-0 flex flex-wrap items-start gap-4 justify-between">
              <div className="flex min-w-0 items-start gap-4">
                {selectedEntityCategory && (
                  <SelectedEntityVisual
                    entity={selectedEntity}
                    category={selectedEntityCategory}
                    imageSrc={selectedEntityImageSrc}
                    hasImage={Boolean(
                      selectedEntity.imageUrl ||
                        selectedEntityPrimaryImage ||
                        primaryImageUrls[selectedEntity.id],
                    )}
                  />
                )}

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

            <div className="min-w-0 flex-1 space-y-5">
              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Descripción</h3>
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

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Historia</h3>
                <Card className="min-w-0 w-full bg-muted/30">
                  <CardContent>
                    {timelineEventsError ? (
                      <p role="alert" className="text-sm text-destructive">
                        No se pudieron cargar los eventos: {timelineEventsError.message}
                      </p>
                    ) : linksLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando eventos…</p>
                    ) : linkedTimelineEvents.length > 0 ? (
                      <ul className="space-y-4">
                        {linkedTimelineEvents.map((event) => (
                          <li key={event.id}>
                            <button
                              type="button"
                              onClick={() => onOpenTimelineEvent(event.id)}
                              className="flex max-w-full items-start gap-2 text-left text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <CalendarDays className="mt-0.5 size-4 shrink-0" />
                              <span>
                                <span className="font-medium">{event.title}</span>
                                {(event.temporalLabel || event.date) && (
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {event.temporalLabel || event.date}
                                  </span>
                                )}
                                {event.description && (
                                  <span className="mt-1 block whitespace-pre-wrap text-sm text-muted-foreground">
                                    {event.description}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay eventos históricos vinculados a esta ficha.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Vínculos</h3>
                <Card className="min-w-0 w-full bg-muted/30">
                  <CardContent>
                    {relationshipError ? (
                      <p role="alert" className="text-sm text-destructive">
                        No se pudieron cargar los vínculos: {relationshipError.message}
                      </p>
                    ) : linksLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando vínculos…</p>
                    ) : selectedEntityRelationships.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedEntityRelationships.map((relationship) => {
                          const isSource = relationship.sourceEntityId === selectedEntity.id;
                          const otherEntityId = isSource
                            ? relationship.targetEntityId
                            : relationship.sourceEntityId;
                          const otherEntity = entities.find((item) => item.id === otherEntityId);
                          if (!otherEntity) return null;
                          return (
                            <li key={relationship.id}>
                              <button
                                type="button"
                                onClick={() => onOpenEntity(otherEntity.id)}
                                className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-left text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <span className="font-medium">{otherEntity.canonicalName}</span>
                                <span className="text-muted-foreground">
                                  {getRelationshipLabel(relationship.relationType, isSource)}
                                  {relationship.description ? ` · ${relationship.description}` : ""}
                                </span>
                                <ArrowUpRight className="size-3.5 shrink-0" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay vínculos registrados para esta ficha.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Baúl de imágenes</h3>
                <EntityVisualIdentitySection
                  entity={selectedEntity}
                  onEdit={() => onEdit(selectedEntity)}
                />
                <ImageGallery
                  images={images}
                  loading={imagesLoading}
                  activeJob={activeImageJob}
                  category={selectedEntityCategory ?? "Personaje"}
                  onGenerate={onGenerateImage}
                  onUpload={onUploadImage}
                  onSetPrimary={onSetPrimaryImage}
                  onDelete={onDeleteImage}
                  actionError={imageActionError}
                />
              </section>

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

function EntityVisualIdentitySection({
  entity,
  onEdit,
}: Readonly<{ entity: Entity; onEdit: () => void }>) {
  const attributes = getEntityAttributes(entity.attributes);
  const identity =
    typeof attributes.visualIdentity === "string"
      ? attributes.visualIdentity.trim()
      : "";
  const copy = VISUAL_IDENTITY_COPY[entity.type];

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Identidad visual</h4>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {copy.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.help}</p>
        </div>
        {identity ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {identity}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Todavía no hay una identidad visual guardada.
            </p>
            <Button variant="outline" size="sm" onClick={onEdit}>
              Completar identidad visual
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function getRelationshipLabel(
  relationType: Relationship["relationType"],
  isSource: boolean,
): string {
  const labels: Record<Relationship["relationType"], [string, string]> = {
    ALLY: ["Aliado/a de", "Aliado/a de"],
    ENEMY: ["Enemigo/a de", "Enemigo/a de"],
    FAMILY: ["Familia de", "Familia de"],
    ROMANTIC: ["Vínculo romántico con", "Vínculo romántico con"],
    MENTOR: ["Mentor/a de", "Recibe mentoría de"],
    RIVAL: ["Rival de", "Rival de"],
    MEMBER_OF: ["Integrante de", "Incluye a"],
    LOCATED_IN: ["Ubicado/a en", "Contiene a"],
    OWNS: ["Posee", "Pertenece a"],
    KNOWS: ["Conoce a", "Conoce a"],
  };
  return labels[relationType][isSource ? 0 : 1];
}
