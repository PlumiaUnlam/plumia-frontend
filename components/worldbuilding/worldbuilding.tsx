"use client";

import { useMemo, useState, useRef } from "react";
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
} from "@/services/image-generation.service";

import type {
  Entity,
  CreateEntityInput,
  UpdateEntityInput,
} from "@/types/entity";
import type {
  CreateRelationshipInput,
  Relationship,
  UpdateRelationshipInput,
} from "@/types/relationship";

type WorldbuildingTab = "wiki" | "relationships" | "timeline" | "summaries";

type WorldbuildingProps = {
  projectId: string;
};

export function Worldbuilding({ projectId }: WorldbuildingProps) {
  const { loading, firebaseUser } = useAuth();
  const shouldFetch = !!projectId && !loading && !!firebaseUser;

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
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
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
    shouldFetch ? `/projects/${projectId}` : null,
    () => getProject(projectId),
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

  const handleGenerateImage = async (data: {
    canonicalName: string;
    description: string;
    type: string;
    aliases: string[];
  }): Promise<string> => {
    const result = await generatePreviewImage({
      name: data.canonicalName,
      type: data.type,
      description: data.description || undefined,
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
    currentImageUrl?: string,
  ) => {
    if (!file) return;

    const publicUrl = await uploadEntityImage(entityId, file, currentImageUrl);
    await updateEntity(entityId, { imageUrl: publicUrl } as UpdateEntityInput);
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
      await uploadAndSaveEntityImage(entityId, file, editingEntity.imageUrl ?? undefined);
      setEditingEntity(null);
    } else {
      entityId = await createEntityFromModal(data as CreateEntityInput, file);
    }
    await mutate();
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
    setEditingEntity(entity);
    setShowNewEntityModal(true);
  };

  const handleClearAiPreview = () => {
    aiStorageKeyRef.current = null;
    aiPromptRef.current = null;
    aiImageTypeRef.current = null;
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
          initialCanonicalName={timelineEntityInitialName ?? undefined}
          onGenerateImage={handleGenerateImage}
          onClearAiPreview={handleClearAiPreview}
        />

        <NewRelationModal
          show={showNewRelationModal}
          entities={worldbuildingEntities}
          onClose={handleRelationModalClose}
          onSubmit={handleSubmitRelation}
          relationship={editingRelationship}
        />

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
