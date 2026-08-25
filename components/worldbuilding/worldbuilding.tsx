"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
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
import { WikiTab } from "./wiki-panel";
import { worldbuildingEntitiesMock } from "@/mocks/worldbuilding.mock";

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
  GenerateImageInput,
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

const WORLD_BUILDING_TABS = [
  { id: "wiki" as const, label: "Wiki del Universo", icon: Star },
  { id: "relationships" as const, label: "Relaciones", icon: GitBranch },
  { id: "timeline" as const, label: "Línea Temporal", icon: Calendar },
  { id: "summaries" as const, label: "Resúmenes", icon: FileText },
];

type WorldbuildingChapter = {
  id: string;
  title: string;
  wordCount: number;
};

function isWorldbuildingTab(value: string | null): value is WorldbuildingTab {
  return (
    value === "wiki" ||
    value === "relationships" ||
    value === "timeline" ||
    value === "summaries"
  );
}

type WorldbuildingProps = {
  projectId: string;
};

type ImageReviewState = {
  entityId: string;
  entityName: string;
  entityType: Entity["type"];
  image: ImageResponse;
};

const IMAGE_POLL_INTERVAL_MS = 1500;
const MAX_IMAGE_POLL_FAILURES = 3;
const MAX_IMAGE_POLL_ATTEMPTS = 80;
type ImageGenerationRequest = Parameters<typeof generateEntityImage>[0];

const NewEntityModal = dynamic(
  () =>
    import("@/components/modal/new-entity-modal").then(
      (module) => module.NewEntityModal,
    ),
  { ssr: false },
);
const NewRelationModal = dynamic(
  () =>
    import("@/components/modal/new-relation-modal").then(
      (module) => module.NewRelationModal,
    ),
  { ssr: false },
);
const ImageGenerationModal = dynamic(
  () =>
    import("@/components/modal/image-generation-modal").then(
      (module) => module.ImageGenerationModal,
    ),
  { ssr: false },
);
const RelationshipsPanel = dynamic(
  () =>
    import("./relationships-panel").then(
      (module) => module.RelationshipsPanel,
    ),
  { ssr: false },
);
const TimelinePanel = dynamic(
  () => import("./timeline-panel").then((module) => module.TimelinePanel),
  { ssr: false },
);
const SummariesPanel = dynamic(
  () => import("./summaries-panel").then((module) => module.SummariesPanel),
  { ssr: false },
);

function useImageGenerationPolling({
  entities,
  mutate,
  mutateImages,
  mutatePrimaryImages,
  onCompleted,
}: {
  entities: Entity[];
  mutate: () => Promise<unknown>;
  mutateImages: () => Promise<unknown>;
  mutatePrimaryImages: () => Promise<unknown>;
  onCompleted: (job: ImageGenerationJob) => void;
}) {
  const [imageGenerationJob, setImageGenerationJob] =
    useState<ImageGenerationJob | null>(null);
  const imagePollJobIdRef = useRef<string | null>(null);
  const imagePollFailuresRef = useRef(0);
  const imagePollAttemptsRef = useRef(0);
  const imagePollInFlightRef = useRef(false);

  const activeImageJobId = imageGenerationJob?.id ?? null;
  const activeImageJobStatus = imageGenerationJob?.status ?? null;

  useEffect(() => {
    if (
      !activeImageJobId ||
      activeImageJobStatus === "COMPLETED" ||
      activeImageJobStatus === "FAILED"
    ) {
      return;
    }

    if (imagePollJobIdRef.current !== activeImageJobId) {
      imagePollJobIdRef.current = activeImageJobId;
      imagePollFailuresRef.current = 0;
      imagePollAttemptsRef.current = 0;
    }

    const controller = new AbortController();
    const poll = () => {
      if (imagePollInFlightRef.current) return;

      if (imagePollAttemptsRef.current >= MAX_IMAGE_POLL_ATTEMPTS) {
        setImageGenerationJob((current) =>
          current?.id === activeImageJobId
            ? {
                ...current,
                status: "FAILED",
                errorMessage:
                  "La generación tardó demasiado. Podés intentarlo nuevamente.",
              }
            : current,
        );
        return;
      }

      imagePollAttemptsRef.current += 1;
      imagePollInFlightRef.current = true;

      void getImageGenerationJob(activeImageJobId, {
        signal: controller.signal,
      })
        .then((job) => {
          if (controller.signal.aborted || job.id !== activeImageJobId) return;
          imagePollFailuresRef.current = 0;
          setImageGenerationJob(job);
          if (job.status === "COMPLETED") {
            onCompleted(job);
            void mutateImages();
            void mutatePrimaryImages();
            void mutate();
            setImageGenerationJob(null);
            imagePollJobIdRef.current = null;
            imagePollAttemptsRef.current = 0;
          }
        })
        .catch((pollError) => {
          if (controller.signal.aborted) return;
          imagePollFailuresRef.current += 1;
          if (imagePollFailuresRef.current < MAX_IMAGE_POLL_FAILURES) return;

          setImageGenerationJob((current) =>
            current?.id === activeImageJobId
              ? {
                  ...current,
                  status: "FAILED",
                  errorMessage:
                    pollError instanceof Error
                      ? pollError.message
                      : "No se pudo consultar la generación",
                }
              : current,
          );
        })
        .finally(() => {
          imagePollInFlightRef.current = false;
        });
    };

    poll();
    const interval = setInterval(poll, IMAGE_POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [
    activeImageJobId,
    activeImageJobStatus,
    entities,
    mutate,
    mutateImages,
    mutatePrimaryImages,
    onCompleted,
  ]);

  const startImageGeneration = useCallback(
    async (input: ImageGenerationRequest) => {
      const job = await generateEntityImage(input);
      imagePollJobIdRef.current = job.id;
      imagePollFailuresRef.current = 0;
      imagePollAttemptsRef.current = 0;
      setImageGenerationJob(job);
    },
    [],
  );

  return { imageGenerationJob, startImageGeneration };
}

type PreviewImageInput = {
  canonicalName: string;
  description: string;
  type: string;
  aliases: string[];
  attributes: Record<string, unknown>;
};

type WorldbuildingModalsProps = {
  showNewEntityModal: boolean;
  onCloseEntity: () => void;
  onSubmitEntity: (
    data: CreateEntityInput | UpdateEntityInput,
    file?: File | null,
  ) => Promise<void>;
  currentEntity: Entity | null;
  entityImages: ImageResponse[];
  isLoadingImages: boolean;
  activeImageJob: ImageGenerationJob | null;
  onOpenImageGeneration: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onSetPrimaryImage: (imageId: string) => void | Promise<void>;
  onDeleteImage: (image: ImageResponse) => void;
  imageActionError: string | null;
  initialCanonicalName?: string;
  onGenerateImage: (data: PreviewImageInput) => Promise<string>;
  onClearAiPreview: () => void;
  editingEntity: Entity | null;
  showImageGenerationModal: boolean;
  onCloseImageGeneration: () => void;
  onRequestImageGeneration: (input: GenerateImageInput) => Promise<void>;
  showNewRelationModal: boolean;
  entities: Entity[];
  onCloseRelation: () => void;
  onSubmitRelation: (
    input: CreateRelationshipInput | UpdateRelationshipInput,
  ) => Promise<void>;
  editingRelationship: Relationship | null;
  selectedEntity: Entity | null;
  imageReview: ImageReviewState | null;
  onCloseImageReview: () => void;
  onAcceptReviewedImage: (image: ImageResponse) => Promise<void>;
  onRegenerateReviewedImage: (
    image: ImageResponse,
    feedback: string,
  ) => Promise<void>;
};

function WorldbuildingModals({
  showNewEntityModal,
  onCloseEntity,
  onSubmitEntity,
  currentEntity,
  entityImages,
  isLoadingImages,
  activeImageJob,
  onOpenImageGeneration,
  onUploadImage,
  onSetPrimaryImage,
  onDeleteImage,
  imageActionError,
  initialCanonicalName,
  onGenerateImage,
  onClearAiPreview,
  editingEntity,
  showImageGenerationModal,
  onCloseImageGeneration,
  onRequestImageGeneration,
  showNewRelationModal,
  entities,
  onCloseRelation,
  onSubmitRelation,
  editingRelationship,
  selectedEntity,
  imageReview,
  onCloseImageReview,
  onAcceptReviewedImage,
  onRegenerateReviewedImage,
}: Readonly<WorldbuildingModalsProps>) {
  const referenceImageId = entityImages.find((image) => image.isPrimary)?.id;

  return (
    <>
      {showNewEntityModal && (
        <NewEntityModal
          show
          onClose={onCloseEntity}
          onSubmit={onSubmitEntity}
          entity={currentEntity}
          imageGallery={entityImages}
          imageGalleryLoading={isLoadingImages}
          activeImageJob={activeImageJob}
          onImageGenerate={onOpenImageGeneration}
          onImageUpload={onUploadImage}
          onSetPrimaryImage={onSetPrimaryImage}
          onDeleteImage={onDeleteImage}
          imageActionError={imageActionError}
          initialCanonicalName={initialCanonicalName}
          onGenerateImage={onGenerateImage}
          onClearAiPreview={onClearAiPreview}
        >
          {editingEntity && showImageGenerationModal && (
            <ImageGenerationModal
              show
              entityId={editingEntity.id}
              entityName={editingEntity.canonicalName}
              entityType={editingEntity.type}
              referenceImageId={referenceImageId}
              onClose={onCloseImageGeneration}
              onSubmit={onRequestImageGeneration}
            />
          )}
        </NewEntityModal>
      )}

      {showNewRelationModal && (
        <NewRelationModal
          show
          entities={entities}
          onClose={onCloseRelation}
          onSubmit={onSubmitRelation}
          relationship={editingRelationship}
        />
      )}

      {selectedEntity && !editingEntity && showImageGenerationModal && (
        <ImageGenerationModal
          show
          entityId={selectedEntity.id}
          entityName={selectedEntity.canonicalName}
          entityType={selectedEntity.type}
          referenceImageId={referenceImageId}
          onClose={onCloseImageGeneration}
          onSubmit={onRequestImageGeneration}
        />
      )}

      {imageReview && (
        <ImageReviewModal
          key={imageReview.image.id}
          image={imageReview.image}
          entityName={imageReview.entityName}
          category={TYPE_TO_CATEGORY[imageReview.entityType]}
          onClose={onCloseImageReview}
          onAccept={onAcceptReviewedImage}
          onRegenerate={onRegenerateReviewedImage}
        />
      )}
    </>
  );
}

function WorldbuildingHeader({
  activeTab,
  entityCount,
  onCreateEntity,
  onCreateRelationship,
  onCreateTimelineEvent,
}: Readonly<{
  activeTab: WorldbuildingTab;
  entityCount: number;
  onCreateEntity: () => void;
  onCreateRelationship: () => void;
  onCreateTimelineEvent: () => void;
}>) {
  return (
    <div className="flex shrink-0 items-center justify-between px-4 py-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Worldbuilding</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Explora y gestiona el universo narrativo de tu obra
        </p>
      </div>
      {activeTab === "wiki" && (
        <Button onClick={onCreateEntity}>
          <Plus size={16} />
          Nueva Entidad
        </Button>
      )}
      {activeTab === "relationships" && (
        <Button
          onClick={onCreateRelationship}
          disabled={entityCount < 2}
        >
          <GitBranch size={16} />
          Nueva Relación
        </Button>
      )}
      {activeTab === "timeline" && (
        <Button onClick={onCreateTimelineEvent}>
          <Plus size={16} />
          Nuevo Evento
        </Button>
      )}
    </div>
  );
}

type WorldbuildingTabsProps = {
  tabs: typeof WORLD_BUILDING_TABS;
  activeTab: WorldbuildingTab;
  onTabChange: (value: string) => void;
  projectId: string;
  enabled: boolean;
  timelineEventId: string | null;
  timelineCreatedEntity: { id: string; revision: number } | null;
  timelineNewEventRequest: number;
  entities: Entity[];
  isLoadingEntities: boolean;
  entityError: Error | undefined;
  selectedEntity: Entity | null;
  entityImages: ImageResponse[];
  primaryImageUrls: Readonly<Record<string, string>>;
  isLoadingImages: boolean;
  selectedEntityImageJob: ImageGenerationJob | null;
  imageActionError: string | null;
  onEditEntity: (entity: Entity) => void;
  onDeleteEntity: (entity: Entity) => void;
  onSelectEntity: (entity: Entity | null) => void;
  onGenerateImage: () => void;
  onUploadImage: (file: File) => Promise<void>;
  onSetPrimaryImage: (imageId: string) => void;
  onDeleteImage: (image: ImageResponse) => void;
  relationships: Relationship[];
  isLoadingRelationships: boolean;
  relationshipError: Error | undefined;
  onEditRelationship: (relationship: Relationship) => void;
  onDeleteRelationship: (relationship: Relationship) => void;
  chapters: WorldbuildingChapter[];
  isLoadingProject: boolean;
  projectError: Error | undefined;
  onRequestCreateEntity: (canonicalName: string) => void;
};

function WorldbuildingTabs({
  tabs,
  activeTab,
  onTabChange,
  projectId,
  enabled,
  timelineEventId,
  timelineCreatedEntity,
  timelineNewEventRequest,
  entities,
  isLoadingEntities,
  entityError,
  selectedEntity,
  entityImages,
  primaryImageUrls,
  isLoadingImages,
  selectedEntityImageJob,
  imageActionError,
  onEditEntity,
  onDeleteEntity,
  onSelectEntity,
  onGenerateImage,
  onUploadImage,
  onSetPrimaryImage,
  onDeleteImage,
  relationships,
  isLoadingRelationships,
  relationshipError,
  onEditRelationship,
  onDeleteRelationship,
  chapters,
  isLoadingProject,
  projectError,
  onRequestCreateEntity,
}: Readonly<WorldbuildingTabsProps>) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <TabsList className="sticky top-0 z-10 flex h-auto gap-1 bg-card px-4 py-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="
              flex items-center gap-2 rounded-lg px-4 py-2.5
              data-[state=active]:border
              data-[state=active]:border-primary/20
              data-[state=active]:bg-primary/10
              data-[state=active]:text-primary
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
          entities={entities}
          loading={isLoadingEntities}
          error={entityError}
          onEdit={onEditEntity}
          onDelete={onDeleteEntity}
          selectedEntity={selectedEntity}
          onSelectEntity={onSelectEntity}
          images={entityImages}
          primaryImageUrls={primaryImageUrls}
          imagesLoading={isLoadingImages}
          activeImageJob={selectedEntityImageJob}
          onGenerateImage={onGenerateImage}
          onUploadImage={onUploadImage}
          onSetPrimaryImage={onSetPrimaryImage}
          onDeleteImage={onDeleteImage}
          imageActionError={imageActionError}
        />
      </TabsContent>

      <TabsContent
        value="relationships"
        className="mt-4 min-h-0 flex-1 overflow-hidden border-t bg-card"
      >
        <RelationshipsPanel
          entities={entities}
          relationships={relationships}
          loading={isLoadingEntities || isLoadingRelationships}
          error={entityError ?? relationshipError}
          onEditRelationship={onEditRelationship}
          onDeleteRelationship={onDeleteRelationship}
        />
      </TabsContent>

      <TabsContent
        value="timeline"
        className="mt-4 min-h-0 flex-1 overflow-hidden border-t bg-card"
      >
        <TimelinePanel
          projectId={projectId}
          enabled={enabled}
          entities={entities}
          focusEventId={timelineEventId}
          createdEntity={timelineCreatedEntity}
          newEventRequest={timelineNewEventRequest}
          onRequestCreateEntity={onRequestCreateEntity}
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
  );
}

function WorldbuildingDeleteDialogs({
  deleteConfirmEntity,
  deletingEntity,
  onEntityDialogChange,
  onCancelEntityDelete,
  onConfirmEntityDelete,
  imageToDelete,
  deletingImage,
  imageActionError,
  onImageDialogChange,
  onCancelImageDelete,
  onConfirmImageDelete,
  deleteConfirmRelationship,
  deletingRelationship,
  onRelationshipDialogChange,
  onCancelRelationshipDelete,
  onConfirmRelationshipDelete,
}: Readonly<{
  deleteConfirmEntity: Entity | null;
  deletingEntity: boolean;
  onEntityDialogChange: (open: boolean) => void;
  onCancelEntityDelete: () => void;
  onConfirmEntityDelete: () => void;
  imageToDelete: ImageResponse | null;
  deletingImage: boolean;
  imageActionError: string | null;
  onImageDialogChange: (open: boolean) => void;
  onCancelImageDelete: () => void;
  onConfirmImageDelete: () => void;
  deleteConfirmRelationship: Relationship | null;
  deletingRelationship: boolean;
  onRelationshipDialogChange: (open: boolean) => void;
  onCancelRelationshipDelete: () => void;
  onConfirmRelationshipDelete: () => void;
}>) {
  return (
    <>
      <Dialog
        open={!!deleteConfirmEntity}
        onOpenChange={onEntityDialogChange}
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
              onClick={onCancelEntityDelete}
              disabled={deletingEntity}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deletingEntity}
              onClick={onConfirmEntityDelete}
            >
              {deletingEntity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imageToDelete} onOpenChange={onImageDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar imagen</DialogTitle>
            <DialogDescription>
              ¿Querés eliminar esta variante del baúl de imágenes? Esta acción
              no se puede deshacer.
            </DialogDescription>
            {imageActionError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {imageActionError}
              </p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={onCancelImageDelete}
              disabled={deletingImage}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmImageDelete}
              disabled={deletingImage}
            >
              {deletingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirmRelationship}
        onOpenChange={onRelationshipDialogChange}
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
              onClick={onCancelRelationshipDelete}
              disabled={deletingRelationship}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deletingRelationship}
              onClick={onConfirmRelationshipDelete}
            >
              {deletingRelationship && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Worldbuilding({ projectId }: WorldbuildingProps) {
  const { loading, firebaseUser } = useAuth();
  const shouldFetch = !!projectId && !loading && !!firebaseUser;
  const searchParams = useSearchParams();
  const entityIdParam = searchParams.get("entityId");
  const tabParam = searchParams.get("tab");
  const timelineEventIdParam = searchParams.get("eventId");

  const [activeTab, setActiveTab] = useState<WorldbuildingTab>(
    isWorldbuildingTab(tabParam) ? tabParam : "wiki",
  );
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
  const [lastTabParam, setLastTabParam] = useState(tabParam);
  if (tabParam !== lastTabParam) {
    setLastTabParam(tabParam);
    if (isWorldbuildingTab(tabParam)) {
      setActiveTab(tabParam);
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
  const [imageReview, setImageReview] = useState<ImageReviewState | null>(
    null,
  );
  const [imageToDelete, setImageToDelete] = useState<ImageResponse | null>(
    null,
  );
  const [deletingImage, setDeletingImage] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(
    null,
  );
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
  } = useSWR(
    shouldFetch && activeTab === "summaries" ? `/projects/${projectId}` : null,
    () => getProject(projectId),
  );

  const {
    data: relationships,
    error: relationshipsError,
    isLoading: isLoadingRelationships,
    mutate: mutateRelationships,
  } = useSWR(
    shouldFetch && activeTab === "relationships"
      ? `/knowledge/relationships?projectId=${projectId}`
      : null,
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
    shouldFetch && activeTab === "wiki" && entityIds.length > 0
      ? `/publishing/images/primary?entityIds=${encodeURIComponent(entityIds.join(","))}`
      : null;
  const { data: primaryImageUrls = {}, mutate: mutatePrimaryImages } = useSWR(
    primaryImagesKey,
    () => getPrimaryEntityImages(entityIds),
  );

  const handleImageJobCompleted = useCallback(
    (job: ImageGenerationJob) => {
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
    },
    [worldbuildingEntities],
  );
  const { imageGenerationJob, startImageGeneration } =
    useImageGenerationPolling({
      entities: worldbuildingEntities,
      mutate,
      mutateImages,
      mutatePrimaryImages,
      onCompleted: handleImageJobCompleted,
    });
  const selectedEntityImageJob =
    selectedEntity && imageGenerationJob?.entityId === selectedEntity.id
      ? imageGenerationJob
      : null;

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
    await startImageGeneration(input);
  };

  const handleRegenerateReviewedImage = async (
    image: ImageResponse,
    feedback: string,
  ) => {
    await startImageGeneration({
      entityId: image.entityId,
      referenceImageId: image.id,
      additionalInstructions: feedback,
    });
  };

  const handleAcceptReviewedImage = async (image: ImageResponse) => {
    await setPrimaryImage(image.entityId, image.id);
    await Promise.all([mutateImages(), mutatePrimaryImages(), mutate()]);
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    if (!selectedEntity) return;
    setImageActionError(null);
    try {
      await setPrimaryImage(selectedEntity.id, imageId);
      await mutateImages();
      await mutatePrimaryImages();
      await mutate();
    } catch (error) {
      setImageActionError(
        error instanceof Error
          ? error.message
          : "No se pudo establecer la imagen principal.",
      );
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!selectedEntity) return;
    await uploadAndSaveEntityImage(selectedEntity.id, file);
    await Promise.all([mutateImages(), mutatePrimaryImages(), mutate()]);
  };

  const handleDeleteImage = async () => {
    if (!selectedEntity || !imageToDelete) return;
    setDeletingImage(true);
    setImageActionError(null);
    try {
      await deleteEntityImage(selectedEntity.id, imageToDelete.id);
      await mutateImages();
      await mutatePrimaryImages();
      await mutate();
      setImageToDelete(null);
    } catch (error) {
      setImageActionError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la imagen.",
      );
    } finally {
      setDeletingImage(false);
    }
  };

  const requestImageDelete = (image: ImageResponse) => {
    setImageActionError(null);
    setImageToDelete(image);
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

  const handleConfirmEntityDelete = () => {
    if (!deleteConfirmEntity) return;
    setSelectedEntityId(null);
    setDeleting(true);
    void handleDeleteConfirmed(deleteConfirmEntity.id);
  };

  const handleEntityDeleteDialogChange = (open: boolean) => {
    if (!open) setDeleteConfirmEntity(null);
  };

  const handleImageDeleteDialogChange = (open: boolean) => {
    if (!open && !deletingImage) {
      setImageToDelete(null);
      setImageActionError(null);
    }
  };

  const handleRelationshipDeleteDialogChange = (open: boolean) => {
    if (!open && !deletingRelationship) {
      setDeleteConfirmRelationship(null);
    }
  };

  const handleConfirmRelationshipDelete = () => {
    if (!deleteConfirmRelationship) return;
    setDeletingRelationship(true);
    void handleDeleteRelationshipConfirmed(deleteConfirmRelationship.id);
  };

  const currentEntity = showNewEntityModal ? editingEntity : null;

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
        <WorldbuildingHeader
          activeTab={activeTab}
          entityCount={worldbuildingEntities.length}
          onCreateEntity={() => setShowNewEntityModal(true)}
          onCreateRelationship={() => {
            setEditingRelationship(null);
            setShowNewRelationModal(true);
          }}
          onCreateTimelineEvent={() =>
            setTimelineNewEventRequest((current) => current + 1)
          }
        />

        <WorldbuildingModals
          showNewEntityModal={showNewEntityModal}
          onCloseEntity={handleModalClose}
          onSubmitEntity={handleSubmitModal}
          currentEntity={currentEntity}
          entityImages={entityImages}
          isLoadingImages={isLoadingImages}
          activeImageJob={selectedEntityImageJob}
          onOpenImageGeneration={() => setShowImageGenerationModal(true)}
          onUploadImage={handleUploadImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          onDeleteImage={requestImageDelete}
          imageActionError={imageActionError}
          initialCanonicalName={timelineEntityInitialName ?? undefined}
          onGenerateImage={handleGenerateImage}
          onClearAiPreview={handleClearAiPreview}
          editingEntity={editingEntity}
          showImageGenerationModal={showImageGenerationModal}
          onCloseImageGeneration={() => setShowImageGenerationModal(false)}
          onRequestImageGeneration={handleRequestImageGeneration}
          showNewRelationModal={showNewRelationModal}
          entities={worldbuildingEntities}
          onCloseRelation={handleRelationModalClose}
          onSubmitRelation={handleSubmitRelation}
          editingRelationship={editingRelationship}
          selectedEntity={selectedEntity}
          imageReview={imageReview}
          onCloseImageReview={() => setImageReview(null)}
          onAcceptReviewedImage={handleAcceptReviewedImage}
          onRegenerateReviewedImage={handleRegenerateReviewedImage}
        />

        <WorldbuildingTabs
          tabs={WORLD_BUILDING_TABS}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as WorldbuildingTab)}
          projectId={projectId}
          enabled={shouldFetch}
          timelineEventId={timelineEventIdParam}
          timelineCreatedEntity={timelineCreatedEntity}
          timelineNewEventRequest={timelineNewEventRequest}
          entities={worldbuildingEntities}
          isLoadingEntities={isLoading}
          entityError={error}
          selectedEntity={selectedEntity}
          entityImages={entityImages}
          primaryImageUrls={primaryImageUrls}
          isLoadingImages={isLoadingImages}
          selectedEntityImageJob={selectedEntityImageJob}
          imageActionError={imageActionError}
          onEditEntity={handleEdit}
          onDeleteEntity={handleDelete}
          onSelectEntity={(entity) => setSelectedEntityId(entity?.id ?? null)}
          onGenerateImage={() => setShowImageGenerationModal(true)}
          onUploadImage={handleUploadImage}
          onSetPrimaryImage={(imageId) => {
            void handleSetPrimaryImage(imageId);
          }}
          onDeleteImage={requestImageDelete}
          relationships={relationships ?? []}
          isLoadingRelationships={isLoadingRelationships}
          relationshipError={relationshipsError}
          onEditRelationship={(relationship) => {
            setEditingRelationship(relationship);
            setShowNewRelationModal(true);
          }}
          onDeleteRelationship={setDeleteConfirmRelationship}
          chapters={chapters}
          isLoadingProject={isLoadingProject}
          projectError={projectError}
          onRequestCreateEntity={(canonicalName) => {
            setEditingEntity(null);
            setTimelineEntityInitialName(canonicalName);
            setShowNewEntityModal(true);
          }}
        />
      </div>

      <WorldbuildingDeleteDialogs
        deleteConfirmEntity={deleteConfirmEntity}
        deletingEntity={deleting}
        onEntityDialogChange={handleEntityDeleteDialogChange}
        onCancelEntityDelete={() => setDeleteConfirmEntity(null)}
        onConfirmEntityDelete={handleConfirmEntityDelete}
        imageToDelete={imageToDelete}
        deletingImage={deletingImage}
        imageActionError={imageActionError}
        onImageDialogChange={handleImageDeleteDialogChange}
        onCancelImageDelete={() => {
          setImageToDelete(null);
          setImageActionError(null);
        }}
        onConfirmImageDelete={() => void handleDeleteImage()}
        deleteConfirmRelationship={deleteConfirmRelationship}
        deletingRelationship={deletingRelationship}
        onRelationshipDialogChange={handleRelationshipDeleteDialogChange}
        onCancelRelationshipDelete={() => setDeleteConfirmRelationship(null)}
        onConfirmRelationshipDelete={handleConfirmRelationshipDelete}
      />

    </div>
  );
}
