"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Plus,
  Star,
  Calendar,
  FileText,
  GitBranch,
} from "lucide-react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { Header } from "../header";
import { RelationshipsPanel } from "./relationships-panel";
import { SummariesPanel } from "./summaries-panel";
import { TimelinePanel } from "./timeline-panel";
import { WikiTab } from "./wiki-panel";
import { worldbuildingEntitiesMock } from "@/mocks/worldbuilding.mock";

import { NewEntityModal } from "@/components/modal/new-entity-modal";
import { NewRelationModal } from "@/components/modal/new-relation-modal";
import { ImageGenerationModal } from "@/components/modal/image-generation-modal";
import { ImageReviewModal } from "@/components/modal/image-review-modal";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useAuth } from "@/contexts/AuthContext";
import {
  getEntities,
  createEntity,
  updateEntity,
  deleteEntity,
} from "@/services/entities.service";
import { getProject } from "@/services/project.service";
import {
  createRelationship,
  deleteRelationship,
  getRelationships,
  updateRelationship,
} from "@/services/relationships.service";
import { uploadEntityImage } from "@/services/upload.service";
import {
  generatePreviewImage,
  attachImage,
  generateEntityImage,
  getEntityImages,
  getPrimaryEntityImages,
  getImageGenerationJob,
  setPrimaryImage,
  deleteEntityImage,
} from "@/services/image-generation.service";
import type {
  ImageGenerationJob,
  ImageResponse,
} from "@/services/image-generation.service";

import type {
  Entity,
  CreateEntityInput,
  UpdateEntityInput,
} from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";
import type {
  CreateRelationshipInput,
  Relationship,
  UpdateRelationshipInput,
} from "@/types/relationship";

type WorldbuildingTab = "wiki" | "relationships" | "timeline" | "summaries";

type WorldbuildingProps = {
  projectId: string;
};

type ImageReviewState = {
  entityId: string;
  entityName: string;
  entityType: Entity["type"];
  image: ImageResponse;
};

export function Worldbuilding({ projectId }: WorldbuildingProps) {
  const { loading, firebaseUser } = useAuth();
  const shouldFetch = !!projectId && !loading && !!firebaseUser;
  const searchParams = useSearchParams();
  const entityIdParam = searchParams.get("entityId");

  const tabs = [
    { id: "wiki" as const, label: "Wiki del Universo", icon: Star },
    { id: "relationships" as const, label: "Relaciones", icon: GitBranch },
    { id: "timeline" as const, label: "Línea Temporal", icon: Calendar },
    { id: "summaries" as const, label: "Resúmenes", icon: FileText },
  ];

  const [activeTab, setActiveTab] = useState<WorldbuildingTab>("wiki");
  const [showNewEntityModal, setShowNewEntityModal] = useState(false);
  const [showNewRelationModal, setShowNewRelationModal] = useState(false);
  const [editingRelationship, setEditingRelationship] =
    useState<Relationship | null>(null);
  const [deleteConfirmRelationship, setDeleteConfirmRelationship] =
    useState<Relationship | null>(null);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    entityIdParam,
  );

  // Preselecciona la entidad indicada por ?entityId= (ej. al venir de un link
  // del editor). Se ajusta durante el render, no en un efecto, para evitar
  // cascading renders (ver patrón equivalente en editor-right-panel.tsx).
  const [lastEntityIdParam, setLastEntityIdParam] = useState(entityIdParam);
  if (entityIdParam !== lastEntityIdParam) {
    setLastEntityIdParam(entityIdParam);
    if (entityIdParam) {
      setSelectedEntityId(entityIdParam);
      setActiveTab("wiki");
    }
  }
  const [deleteConfirmEntity, setDeleteConfirmEntity] = useState<Entity | null>(
    null,
  );
  const [timelineNewEventRequest, setTimelineNewEventRequest] = useState(0);
  const [timelineEntityInitialName, setTimelineEntityInitialName] = useState<
    string | null
  >(null);
  const [timelineCreatedEntity, setTimelineCreatedEntity] = useState<{
    id: string;
    revision: number;
  } | null>(null);
  const [mockEntities] = useState<Entity[]>(worldbuildingEntitiesMock);
  const [deleting, setDeleting] = useState(false);
  const aiStorageKeyRef = useRef<string | null>(null);
  const aiPromptRef = useRef<string | null>(null);
  const aiImageTypeRef = useRef<string | null>(null);
  const [deletingRelationship, setDeletingRelationship] = useState(false);
  const [showImageGenerationModal, setShowImageGenerationModal] =
    useState(false);
  const [imageGenerationJob, setImageGenerationJob] =
    useState<ImageGenerationJob | null>(null);
  const [imageReview, setImageReview] = useState<ImageReviewState | null>(
    null,
  );
  const [imageToDelete, setImageToDelete] = useState<ImageResponse | null>(
    null,
  );
  const [deletingImage, setDeletingImage] = useState(false);

  const {
    data: entities,
    error,
    isLoading,
    mutate,
  } = useSWR(
    shouldFetch ? `/knowledge/entities?projectId=${projectId}` : null,
    () => getEntities(projectId),
  );

  const {
    data: project,
    error: projectError,
    isLoading: isLoadingProject,
  } = useSWR(shouldFetch ? `/projects/${projectId}` : null, () =>
    getProject(projectId),
  );

  const {
    data: relationships,
    error: relationshipsError,
    isLoading: isLoadingRelationships,
    mutate: mutateRelationships,
  } = useSWR(
    shouldFetch ? `/knowledge/relationships?projectId=${projectId}` : null,
    () => getRelationships(projectId),
  );

  const { trigger: triggerDelete } = useSWRMutation(
    projectId ? `/knowledge/entities?projectId=${projectId}` : null,
    async (_key: string, { arg }: { arg: string }) => {
      await deleteEntity(arg);
    },
  );

  const worldbuildingEntities = entities ?? mockEntities;

  const selectedEntity = useMemo(
    () =>
      worldbuildingEntities.find((entity) => entity.id === selectedEntityId) ??
      null,
    [selectedEntityId, worldbuildingEntities],
  );
  const selectedEntityImageJob =
    selectedEntity && imageGenerationJob?.entityId === selectedEntity.id
      ? imageGenerationJob
      : null;

  const {
    data: entityImages = [],
    isLoading: isLoadingImages,
    mutate: mutateImages,
  } = useSWR(
    shouldFetch && selectedEntity
      ? `/publishing/images/${selectedEntity.id}`
      : null,
    () => getEntityImages(selectedEntity!.id),
  );

  const entityIds = useMemo(
    () => (entities ?? []).map((entity) => entity.id),
    [entities],
  );
  const primaryImagesKey =
    shouldFetch && entityIds.length > 0
      ? `/publishing/images/primary?entityIds=${encodeURIComponent(entityIds.join(","))}`
      : null;
  const { data: primaryImageUrls = {}, mutate: mutatePrimaryImages } = useSWR(
    primaryImagesKey,
    () => getPrimaryEntityImages(entityIds),
  );

  useEffect(() => {
    if (
      !imageGenerationJob ||
      imageGenerationJob.status === "COMPLETED" ||
      imageGenerationJob.status === "FAILED"
    ) {
      return;
    }

    const interval = setInterval(() => {
      void getImageGenerationJob(imageGenerationJob.id)
        .then((job) => {
          setImageGenerationJob(job);
          if (job.status === "COMPLETED") {
            const generatedEntity = worldbuildingEntities.find(
              (entity) => entity.id === job.entityId,
            );
            if (job.generatedImage && generatedEntity) {
              setImageReview({
                entityId: job.entityId,
                entityName: generatedEntity.canonicalName,
                entityType: generatedEntity.type,
                image: job.generatedImage,
              });
            }
            void mutateImages();
            void mutatePrimaryImages();
            void mutate();
            setImageGenerationJob(null);
          }
        })
        .catch((pollError) => {
          setImageGenerationJob((current) =>
            current
              ? {
                  ...current,
                  status: "FAILED",
                  errorMessage:
                    pollError instanceof Error
                      ? pollError.message
                      : "No se pudo consultar la generación",
                }
              : null,
          );
        });
    }, 1500);

    return () => clearInterval(interval);
  }, [
    imageGenerationJob,
    mutate,
    mutateImages,
    mutatePrimaryImages,
    worldbuildingEntities,
  ]);

  const handleGenerateImage = async (data: {
    canonicalName: string;
    description: string;
    type: string;
    aliases: string[];
    attributes: Record<string, unknown>;
  }): Promise<string> => {
    const result = await generatePreviewImage({
      name: data.canonicalName,
      type: data.type,
      description: data.description || undefined,
      attributes: data.attributes,
    });

    aiStorageKeyRef.current = result.storageKey;
    aiPromptRef.current = result.prompt;
    aiImageTypeRef.current = result.imageType;

    return result.imageUrl;
  };

  const chapters = useMemo(() => {
    return (
      project?.books.flatMap((book) =>
        book.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          wordCount: chapter.wordCount,
        })),
      ) ?? []
    );
  }, [project]);

  const attachPendingAiImage = async (entityId: string) => {
    const storageKey = aiStorageKeyRef.current;
    if (!storageKey) return;

    await attachImage({
      entityId,
      storageKey,
      prompt: aiPromptRef.current!,
      imageType: aiImageTypeRef.current!,
    });
    handleClearAiPreview();
  };

  const uploadAndSaveEntityImage = async (
    entityId: string,
    file: File | null | undefined,
  ) => {
    if (!file) return;

    const { storageKey } = await uploadEntityImage(entityId, file);
    await attachImage({
      entityId,
      storageKey,
      prompt: "Imagen cargada manualmente",
      imageType: file.type,
    });
  };

  const createEntityFromModal = async (
    data: CreateEntityInput,
    file: File | null | undefined,
  ) => {
    const entity = await createEntity(projectId, data);

    if (aiStorageKeyRef.current) {
      await attachPendingAiImage(entity.id);
      await uploadAndSaveEntityImage(entity.id, file);
      return entity.id;
    }

    try {
      await uploadAndSaveEntityImage(entity.id, file);
      return entity.id;
    } catch (error) {
      await deleteEntity(entity.id).catch(() => {});
      throw error;
    }
  };

  const handleSubmitModal = async (
    data: CreateEntityInput | UpdateEntityInput,
    file?: File | null,
  ) => {
    const isTimelineEntityCreation =
      timelineEntityInitialName !== null && !editingEntity;

    let entityId: string;
    if (editingEntity) {
      entityId = editingEntity.id;
      await updateEntity(entityId, data as UpdateEntityInput);
      await attachPendingAiImage(entityId);
      await uploadAndSaveEntityImage(entityId, file);
      setEditingEntity(null);
    } else {
      entityId = await createEntityFromModal(data as CreateEntityInput, file);
    }
    await mutate();
    await Promise.all([mutateImages(), mutatePrimaryImages()]);
    setSelectedEntityId(entityId);
    if (isTimelineEntityCreation) {
      setTimelineCreatedEntity((current) => ({
        id: entityId,
        revision: (current?.revision ?? 0) + 1,
      }));
    }
  };

  const handleSubmitRelation = async (
    input: CreateRelationshipInput | UpdateRelationshipInput,
  ) => {
    if (editingRelationship) {
      await updateRelationship(editingRelationship.id, input);
    } else {
      await createRelationship(projectId, input as CreateRelationshipInput);
    }
    await mutateRelationships();
  };

  const handleDelete = (entity: Entity) => {
    setDeleteConfirmEntity(entity);
  };

  const handleDeleteConfirmed = async (id: string) => {
    try {
      await triggerDelete(id);
      mutate(
        (currentData?: Entity[]) =>
          currentData?.filter((e) => e.id !== id) ?? [],
        { revalidate: false },
      );
      await mutate();
    } finally {
      setDeleteConfirmEntity(null);
      setDeleting(false);
    }
  };

  const handleEdit = (entity: Entity) => {
    setSelectedEntityId(entity.id);
    setEditingEntity(entity);
    setShowNewEntityModal(true);
  };

  const handleClearAiPreview = () => {
    aiStorageKeyRef.current = null;
    aiPromptRef.current = null;
    aiImageTypeRef.current = null;
  };

  const handleRequestImageGeneration = async (input: {
    entityId: string;
    referenceImageId?: string;
    expression?: string;
    pose?: string;
    background?: string;
    framing?: string;
    lighting?: string;
    style?: string;
    additionalInstructions?: string;
  }) => {
    const job = await generateEntityImage(input);
    setImageGenerationJob(job);
  };

  const handleRegenerateReviewedImage = async (
    image: ImageResponse,
    feedback: string,
  ) => {
    const job = await generateEntityImage({
      entityId: image.entityId,
      referenceImageId: image.id,
      additionalInstructions: feedback,
    });
    setImageGenerationJob(job);
  };

  const handleAcceptReviewedImage = async (image: ImageResponse) => {
    await setPrimaryImage(image.entityId, image.id);
    await Promise.all([mutateImages(), mutatePrimaryImages(), mutate()]);
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!selectedEntity) return;
    await setPrimaryImage(selectedEntity.id, imageId);
    await mutateImages();
    await mutatePrimaryImages();
    await mutate();
  };

  const handleUploadImage = async (file: File) => {
    if (!selectedEntity) return;
    await uploadAndSaveEntityImage(selectedEntity.id, file);
    await Promise.all([mutateImages(), mutatePrimaryImages(), mutate()]);
  };

  const handleDeleteImage = async () => {
    if (!selectedEntity || !imageToDelete) return;
    setDeletingImage(true);
    try {
      await deleteEntityImage(selectedEntity.id, imageToDelete.id);
      await mutateImages();
      await mutatePrimaryImages();
      await mutate();
      setImageToDelete(null);
    } finally {
      setDeletingImage(false);
    }
  };

  const handleModalClose = () => {
    setShowNewEntityModal(false);
    setEditingEntity(null);
    setTimelineEntityInitialName(null);
    aiStorageKeyRef.current = null;
    aiPromptRef.current = null;
    aiImageTypeRef.current = null;
  };

  const handleRelationModalClose = () => {
    setShowNewRelationModal(false);
    setEditingRelationship(null);
  };

  const handleDeleteRelationshipConfirmed = async (id: string) => {
    try {
      await deleteRelationship(id);
      await mutateRelationships();
    } finally {
      setDeleteConfirmRelationship(null);
      setDeletingRelationship(false);
    }
  };

  const currentEntity = showNewEntityModal ? editingEntity : null;

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
        <div className="flex shrink-0 items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Worldbuilding
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Explora y gestiona el universo narrativo de tu obra
            </p>
          </div>
          {activeTab === "wiki" && (
            <Button onClick={() => setShowNewEntityModal(true)}>
              <Plus size={16} />
              Nueva Entidad
            </Button>
          )}
          {activeTab === "relationships" && (
            <Button
              onClick={() => {
                setEditingRelationship(null);
                setShowNewRelationModal(true);
              }}
              disabled={worldbuildingEntities.length < 2}
            >
              <GitBranch size={16} />
              Nueva Relación
            </Button>
          )}
          {activeTab === "timeline" && (
            <Button
              onClick={() =>
                setTimelineNewEventRequest((current) => current + 1)
              }
            >
              <Plus size={16} />
              Nuevo Evento
            </Button>
          )}
        </div>

        <NewEntityModal
          show={showNewEntityModal}
          onClose={handleModalClose}
          onSubmit={handleSubmitModal}
          entity={currentEntity}
          imageGallery={entityImages}
          imageGalleryLoading={isLoadingImages}
          activeImageJob={selectedEntityImageJob}
          onImageGenerate={() => setShowImageGenerationModal(true)}
          onImageUpload={handleUploadImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onDeleteImage={setImageToDelete}
          initialCanonicalName={timelineEntityInitialName ?? undefined}
          onGenerateImage={handleGenerateImage}
          onClearAiPreview={handleClearAiPreview}
        >
          {showNewEntityModal && editingEntity && (
            <ImageGenerationModal
              show={showImageGenerationModal}
              entityId={editingEntity.id}
              entityName={editingEntity.canonicalName}
              entityType={editingEntity.type}
              referenceImageId={entityImages.find((image) => image.isPrimary)?.id}
              onClose={() => setShowImageGenerationModal(false)}
              onSubmit={handleRequestImageGeneration}
            />
          )}
        </NewEntityModal>

        <NewRelationModal
          show={showNewRelationModal}
          entities={worldbuildingEntities}
          onClose={handleRelationModalClose}
          onSubmit={handleSubmitRelation}
          relationship={editingRelationship}
        />

        {selectedEntity && !editingEntity && (
          <ImageGenerationModal
            show={showImageGenerationModal}
            entityId={selectedEntity.id}
            entityName={selectedEntity.canonicalName}
            entityType={selectedEntity.type}
            referenceImageId={entityImages.find((image) => image.isPrimary)?.id}
            onClose={() => setShowImageGenerationModal(false)}
            onSubmit={handleRequestImageGeneration}
          />
        )}

        {imageReview && (
          <ImageReviewModal
            key={imageReview.image.id}
            image={imageReview.image}
            entityName={imageReview.entityName}
            category={TYPE_TO_CATEGORY[imageReview.entityType]}
            onClose={() => setImageReview(null)}
            onAccept={handleAcceptReviewedImage}
            onRegenerate={handleRegenerateReviewedImage}
          />
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as WorldbuildingTab)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="sticky top-0 z-10 flex h-auto gap-1 bg-card px-4 py-0">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="
                  flex items-center gap-2 px-4 py-2.5 rounded-lg
                  data-[state=active]:bg-primary/10
                  data-[state=active]:text-primary
                  data-[state=active]:border
                  data-[state=active]:border-primary/20
                "
              >
                <Icon size={16} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value="wiki"
            className="mt-4 min-h-0 flex-1 overflow-hidden border-t bg-card"
          >
            <WikiTab
              entities={worldbuildingEntities}
              loading={isLoading}
              error={error}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selectedEntity={selectedEntity}
              onSelectEntity={(entity) =>
                setSelectedEntityId(entity?.id ?? null)
              }
              images={entityImages}
              primaryImageUrls={primaryImageUrls}
              imagesLoading={isLoadingImages}
              activeImageJob={selectedEntityImageJob}
              onGenerateImage={() => setShowImageGenerationModal(true)}
              onUploadImage={handleUploadImage}
              onSetPrimaryImage={(imageId) => {
                void handleSetPrimaryImage(imageId);
              }}
              onDeleteImage={setImageToDelete}
            />
          </TabsContent>

          <TabsContent
            value="relationships"
            className="mt-4 min-h-0 flex-1 overflow-hidden border-t bg-card"
          >
            <RelationshipsPanel
              entities={worldbuildingEntities}
              relationships={relationships ?? []}
              loading={isLoading || isLoadingRelationships}
              error={error ?? relationshipsError}
              onEditRelationship={(relationship) => {
                setEditingRelationship(relationship);
                setShowNewRelationModal(true);
              }}
              onDeleteRelationship={setDeleteConfirmRelationship}
            />
          </TabsContent>

          <TabsContent
            value="timeline"
            className="mt-4 min-h-0 flex-1 overflow-hidden border-t bg-card"
          >
            <TimelinePanel
              projectId={projectId}
              enabled={shouldFetch}
              entities={worldbuildingEntities}
              createdEntity={timelineCreatedEntity}
              newEventRequest={timelineNewEventRequest}
              onRequestCreateEntity={(canonicalName) => {
                setEditingEntity(null);
                setTimelineEntityInitialName(canonicalName);
                setShowNewEntityModal(true);
              }}
            />
          </TabsContent>

          <TabsContent
            value="summaries"
            className="mt-4 min-h-0 flex-1 overflow-hidden border-t bg-card"
          >
            <SummariesPanel
              chapters={chapters}
              loading={isLoadingProject}
              error={projectError}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={!!deleteConfirmEntity}
        onOpenChange={(open) => !open && setDeleteConfirmEntity(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar &ldquo;
              {deleteConfirmEntity?.canonicalName}&rdquo;? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmEntity(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (!deleteConfirmEntity) return;
                setSelectedEntityId(null);
                setDeleting(true);
                void handleDeleteConfirmed(deleteConfirmEntity.id);
              }}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!imageToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingImage) setImageToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar imagen</DialogTitle>
            <DialogDescription>
              ¿Querés eliminar esta variante del baúl de imágenes? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImageToDelete(null)}
              disabled={deletingImage}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteImage()}
              disabled={deletingImage}
            >
              {deletingImage && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirmRelationship}
        onOpenChange={(open) => {
          if (!open && !deletingRelationship) {
            setDeleteConfirmRelationship(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar esta relación? Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmRelationship(null)}
              disabled={deletingRelationship}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deletingRelationship}
              onClick={() => {
                if (!deleteConfirmRelationship) return;
                setDeletingRelationship(true);
                void handleDeleteRelationshipConfirmed(
                  deleteConfirmRelationship.id,
                );
              }}
            >
              {deletingRelationship && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
