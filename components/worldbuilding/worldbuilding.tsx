"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Star, Users, Calendar, FileText } from "lucide-react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { Header } from "../header";
import { SummariesPanel, type SummaryChapter } from "./summaries-panel";
import { WikiTab } from "./wiki-panel";

import { NewEntityModal } from "@/components/modal/new-entity-modal";

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
import { uploadEntityImage } from "@/services/upload.service";

import type {
  Entity,
  CreateEntityInput,
  UpdateEntityInput,
} from "@/types/entity";

type WorldbuildingTab = "wiki" | "relationships" | "timeline" | "summaries";

type WorldbuildingProps = {
  projectId: string;
};

export function Worldbuilding({ projectId }: WorldbuildingProps) {
  const { loading, firebaseUser } = useAuth();
  const shouldFetch = !!projectId && !loading && !!firebaseUser;

  const tabs = [
    { id: "wiki" as const, label: "Wiki del Universo", icon: Star },
    { id: "relationships" as const, label: "Relaciones", icon: Users },
    { id: "timeline" as const, label: "Línea Temporal", icon: Calendar },
    { id: "summaries" as const, label: "Resúmenes", icon: FileText },
  ];

  const [activeTab, setActiveTab] = useState<WorldbuildingTab>("wiki");
  const [showNewEntityModal, setShowNewEntityModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [deleteConfirmEntity, setDeleteConfirmEntity] = useState<Entity | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

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

  const { trigger: triggerDelete } = useSWRMutation(
    projectId ? `/knowledge/entities?projectId=${projectId}` : null,
    async (_key: string, { arg }: { arg: string }) => {
      await deleteEntity(arg);
    },
  );

  const selectedEntity = useMemo(
    () => entities?.find((entity) => entity.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  );

  const chapters = useMemo<SummaryChapter[]>(() => {
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

  const handleSubmitModal = async (
    data: CreateEntityInput | UpdateEntityInput,
    file?: File | null,
  ) => {
    let entityId: string;
    if (editingEntity) {
      entityId = editingEntity.id;
      await updateEntity(entityId, data as UpdateEntityInput);
      if (file) {
        const publicUrl = await uploadEntityImage(
          entityId,
          file,
          editingEntity.imageUrl ?? undefined,
        );
        await updateEntity(entityId, {
          imageUrl: publicUrl,
        } as UpdateEntityInput);
      }
      setEditingEntity(null);
    } else {
      const entity = await createEntity(projectId, data as CreateEntityInput);
      entityId = entity.id;
      if (file) {
        try {
          const publicUrl = await uploadEntityImage(entityId, file);
          await updateEntity(entity.id, {
            imageUrl: publicUrl,
          } as UpdateEntityInput);
        } catch (err) {
          await deleteEntity(entityId).catch(() => {});
          throw err;
        }
      }
    }
    await mutate();
    setSelectedEntityId(entityId);
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

  const handleModalClose = () => {
    setShowNewEntityModal(false);
    setEditingEntity(null);
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
          <Button onClick={() => setShowNewEntityModal(true)}>
            <Plus size={16} />
            Nueva Entidad
          </Button>
        </div>

        <NewEntityModal
          show={showNewEntityModal}
          onClose={handleModalClose}
          onSubmit={handleSubmitModal}
          entity={currentEntity}
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
              entities={entities ?? []}
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

          <TabsContent value="relationships"></TabsContent>

          <TabsContent value="timeline"></TabsContent>

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
    </div>
  );
}
