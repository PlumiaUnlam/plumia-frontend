import { useEffect, useRef, useState } from "react";

import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  PanelLeftClose,
  Undo2,
  PanelLeftOpen,
} from "lucide-react";

import {
  createBook,
  createChapter,
  createSection,
  deleteBook,
  deleteChapter,
  deleteSection,
  updateBook,
  updateChapter,
  updateSection,
} from "@/services/project.service";
import {
  createSceneVersion,
  deleteSceneVersion,
  getSceneVersions,
  renameSceneVersion,
  restoreSceneVersion,
} from "@/services/scene.service";
import {
  getLivePrimaryContent,
  useEditorStore,
} from "@/stores/editor.store";
import { LeftSidebarHistory } from "@/components/left-sidebar-history";
import { LeftSidebarItemModals } from "@/components/left-sidebar-item-modals";
import { LeftSidebarTree } from "@/components/left-sidebar-tree";
import type {
  EditableItem,
  SidebarBook,
  SidebarModalState,
} from "@/components/left-sidebar-types";
import type { SceneVersionSummary } from "@/types/scene";

export type { SidebarBook, SidebarChapter, SidebarScene } from "@/components/left-sidebar-types";

type LeftSidebarProps = {
  projectTitle: string;
  books: SidebarBook[];
  projectId: string;
  onRefresh: () => Promise<void>;
  onBeforeDocumentChange?: () => Promise<void>;
};

function nextSortKey(items: Array<{ sortKey?: string }>) {
  const next =
    Math.max(
      0,
      ...items
        .map((item) => Number.parseInt(item.sortKey ?? "", 10))
        .filter(Number.isFinite),
    ) + 1;

  return next.toString().padStart(3, "0");
}

function nextOrder(items: Array<{ order?: number }>) {
  return Math.max(0, ...items.map((item) => item.order ?? 0)) + 1;
}

//LLega ID del proyecto elegido
export function LeftSidebar({
  projectTitle,
  books,
  projectId,
  onRefresh,
  onBeforeDocumentChange,
}: Readonly<LeftSidebarProps>) {
  const navigationPendingRef = useRef(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const changeDocument = async (change: () => void) => {
    if (navigationPendingRef.current) return;
    navigationPendingRef.current = true;
    setNavigationError(null);
    try {
      await onBeforeDocumentChange?.();
      change();
    } catch (error) {
      setNavigationError(error instanceof Error ? error.message : "No se pudieron guardar los cambios. Reintentá antes de continuar.");
    } finally {
      navigationPendingRef.current = false;
    }
  };
  const [modalType, setModalType] = useState<SidebarModalState | null>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EditableItem | null>(null);
  const [editName, setEditName] = useState("");
  const [isItemActionSubmitting, setIsItemActionSubmitting] = useState(false);

  const setActiveScene = useEditorStore((s) => s.setActiveScene)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)
  const selectedSceneVersionId = useEditorStore((s) => s.selectedSceneVersionId)
  const currentContent = useEditorStore((s) => s.currentContent)
  const setSelectedSceneVersion = useEditorStore((s) => s.setSelectedSceneVersion)
  const refreshEditorDocument = useEditorStore((s) => s.refreshEditorDocument)
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const showFooterTooltips = sidebarState === "collapsed";
  const activeScene = books
    .flatMap((book) => book.chapters)
    .flatMap((chapter) => chapter.scenes)
    .find((scene) => scene.id === activeSceneId)
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<SceneVersionSummary[]>([]);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [createVersionOpen, setCreateVersionOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<SceneVersionSummary | null>(
    null,
  );
  const [versionToRename, setVersionToRename] =
    useState<SceneVersionSummary | null>(null);
  const [versionToDelete, setVersionToDelete] =
    useState<SceneVersionSummary | null>(null);
  const [versionEditName, setVersionEditName] = useState("");
  const [isVersionActionSubmitting, setIsVersionActionSubmitting] =
    useState(false);

  const loadVersions = async () => {
    if (!activeSceneId) {
      setVersions([]);
      return;
    }

    setVersionsLoading(true);
    try {
      setVersions(await getSceneVersions(activeSceneId));
      setVersionsError(null);
    } catch (error) {
      console.error("Error loading scene versions:", error);
      setVersionsError("No se pudo cargar el historial.");
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    if (!historyOpen) return;

    const timeoutId = window.setTimeout(() => {
      void loadVersions();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen, activeSceneId]);

  const openEditItem = (item: EditableItem) => {
    setEditingItem(item);
    setEditName(item.title);
  };

  const closeEditItem = () => {
    if (isItemActionSubmitting) return;

    setEditingItem(null);
    setEditName("");
  };

  const openCreateVersion = () => {
    if (!activeSceneId) return;

    setNewVersionName("");
    setCreateVersionOpen(true);
  };

  const handleCreateVersion = async () => {
    if (!activeSceneId || isVersionActionSubmitting) return;

    setIsVersionActionSubmitting(true);
    try {
      const version = await createSceneVersion(
        activeSceneId,
        newVersionName.trim() || undefined,
        getLivePrimaryContent() ?? currentContent,
      );
      setVersions((current) => [version, ...current]);
      setSelectedSceneVersion(version.id);
      setCreateVersionOpen(false);
      setNewVersionName("");
    } finally {
      setIsVersionActionSubmitting(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!activeSceneId || !restoreTarget || isVersionActionSubmitting) return;

    setIsVersionActionSubmitting(true);
    try {
      await restoreSceneVersion(activeSceneId, restoreTarget.id);
      setSelectedSceneVersion(null);
      refreshEditorDocument();
      await Promise.all([loadVersions(), onRefresh()]);
      setRestoreTarget(null);
    } finally {
      setIsVersionActionSubmitting(false);
    }
  };

  const openRenameVersion = (version: SceneVersionSummary) => {
    setVersionToRename(version);
    setVersionEditName(version.label || "");
  };

  const handleRenameVersion = async () => {
    if (!activeSceneId || !versionToRename || isVersionActionSubmitting) return;

    setIsVersionActionSubmitting(true);
    try {
      const updated = await renameSceneVersion(
        activeSceneId,
        versionToRename.id,
        versionEditName.trim(),
      );
      setVersions((current) =>
        current.map((version) =>
          version.id === updated.id ? { ...version, ...updated } : version,
        ),
      );
      setVersionToRename(null);
      setVersionEditName("");
      if (selectedSceneVersionId === updated.id) {
        refreshEditorDocument();
      }
    } finally {
      setIsVersionActionSubmitting(false);
    }
  };

  const handleDeleteVersion = async () => {
    if (!activeSceneId || !versionToDelete || isVersionActionSubmitting) return;

    setIsVersionActionSubmitting(true);
    try {
      await deleteSceneVersion(activeSceneId, versionToDelete.id);
      setVersions((current) =>
        current.filter((version) => version.id !== versionToDelete.id),
      );
      if (selectedSceneVersionId === versionToDelete.id) {
        setSelectedSceneVersion(null);
      }
      setVersionToDelete(null);
    } finally {
      setIsVersionActionSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    const trimmedName = editName.trim();

    if (!editingItem || !trimmedName || isItemActionSubmitting) return;

    setIsItemActionSubmitting(true);
    try {
      if (editingItem.type === "book") {
        await updateBook(editingItem.id, { title: trimmedName });
      } else if (editingItem.type === "chapter") {
        await updateChapter(editingItem.id, { title: trimmedName });
      } else {
        await updateSection(editingItem.id, { title: trimmedName });
      }

      await onRefresh();
      setEditingItem(null);
      setEditName("");
    } finally {
      setIsItemActionSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || isItemActionSubmitting) return;

    setIsItemActionSubmitting(true);
    try {
      if (itemToDelete.type === "book") {
        await deleteBook(itemToDelete.id);
      } else if (itemToDelete.type === "chapter") {
        await deleteChapter(itemToDelete.id);
      } else {
        await deleteSection(itemToDelete.id);
      }

      await onRefresh();
      setItemToDelete(null);
    } finally {
      setIsItemActionSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <Sidebar
        collapsible="icon"
        className="relative flex h-full min-h-0 flex-col border-r border-border bg-card [&_[data-slot=sidebar-inner]]:bg-card"
      >
        <SidebarHeader className="h-12 shrink-0 justify-center border-b border-border bg-card p-0">
          <div className="flex h-full w-full items-center group-data-[collapsible=icon]:hidden">
            <h2 className="flex min-w-0 flex-1 items-center truncate px-3 text-sm font-semibold">
              {projectTitle}
            </h2>

            <Button
              size="icon-sm"
              variant="ghost"
              className="h-full w-10 rounded-none text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              onClick={() =>
                setModalType({
                  type: "book",
                  parentId: projectId,
                  sortKey: nextSortKey(books),
                })
              }
              aria-label="Agregar libro"
            >
              <Plus className="size-4" />
            </Button>

            <Button
              size="icon-sm"
              variant="ghost"
              className="h-full w-10 rounded-none border-l border-border text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              onClick={toggleSidebar}
              aria-label="Cerrar estructura del proyecto"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="mx-auto hidden size-8 rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground group-data-[collapsible=icon]:flex"
            onClick={toggleSidebar}
            aria-label="Abrir estructura del proyecto"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </SidebarHeader>
        <LeftSidebarTree
          books={books}
          onAddChapter={(book) =>
            setModalType({
              type: "chapter",
              parentId: book.id,
              sortKey: nextSortKey(book.chapters),
            })
          }
          onAddScene={(chapter) =>
            setModalType({
              type: "section",
              parentId: chapter.id,
              sortKey: nextSortKey(chapter.scenes),
              order: nextOrder(chapter.scenes),
            })
          }
          onSelectScene={(id) => {
            if (id !== activeSceneId) void changeDocument(() => setActiveScene(id));
          }}
          onEditItem={openEditItem}
          onDeleteItem={setItemToDelete}
        />
        <SidebarFooter className="border-t border-border bg-card p-2 group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:p-1.5">
          <TooltipProvider>
            <div className="w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={`h-9 w-full justify-start gap-2 px-2 hover:text-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${
                      historyOpen
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setHistoryOpen(true)}
                    aria-label="Historial"
                  >
                    <Undo2 className="size-4" />
                    <span className="truncate text-xs font-medium group-data-[collapsible=icon]:hidden">
                      Historial
                    </span>
                  </Button>
                </TooltipTrigger>
                {showFooterTooltips ? (
                  <TooltipContent side="right" sideOffset={8}>
                    Historial
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </div>
          </TooltipProvider>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <Dialog open={navigationError !== null} onOpenChange={(open) => { if (!open) setNavigationError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se pudo guardar</DialogTitle>
            <DialogDescription>{navigationError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNavigationError(null)}>Volver al documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LeftSidebarHistory
        activeSceneId={activeSceneId}
        activeSceneTitle={activeScene?.title}
        historyOpen={historyOpen}
        createVersionOpen={createVersionOpen}
        versions={versions}
        versionsError={versionsError}
        versionsLoading={versionsLoading}
        newVersionName={newVersionName}
        restoreTarget={restoreTarget}
        versionToRename={versionToRename}
        versionToDelete={versionToDelete}
        versionEditName={versionEditName}
        selectedSceneVersionId={selectedSceneVersionId}
        isVersionActionSubmitting={isVersionActionSubmitting}
        onHistoryOpenChange={setHistoryOpen}
        onCreateVersionOpen={openCreateVersion}
        onCreateVersionOpenChange={(open) => {
          if (!open && !isVersionActionSubmitting) {
            setCreateVersionOpen(false);
            setNewVersionName("");
            return;
          }

          if (open) {
            setCreateVersionOpen(true);
          }
        }}
        onCreateVersionNameChange={setNewVersionName}
        onCreateVersion={handleCreateVersion}
        onSelectDraft={() => {
          if (selectedSceneVersionId !== null) void changeDocument(() => setSelectedSceneVersion(null));
        }}
        onSelectVersion={(id) => {
          if (id !== selectedSceneVersionId) void changeDocument(() => setSelectedSceneVersion(id));
        }}
        onOpenRestore={setRestoreTarget}
        onRestoreVersion={handleRestoreVersion}
        onOpenRename={(version) => {
          if (!version) {
            setVersionToRename(null);
            return;
          }

          openRenameVersion(version);
        }}
        onRenameVersionNameChange={setVersionEditName}
        onRenameVersion={handleRenameVersion}
        onOpenDelete={setVersionToDelete}
        onDeleteVersion={handleDeleteVersion}
      />
      <LeftSidebarItemModals
        modalType={modalType}
        editingItem={editingItem}
        itemToDelete={itemToDelete}
        editName={editName}
        isItemActionSubmitting={isItemActionSubmitting}
        onModalTypeChange={setModalType}
        onEditNameChange={setEditName}
        onCloseEditItem={closeEditItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItemChange={setItemToDelete}
        onDeleteItem={handleDeleteItem}
        onCreateBook={async (name) => {
          await createBook({
            title: name,
            partId: modalType!.parentId,
            sortKey: modalType!.sortKey,
          });
          await onRefresh();
        }}
        onCreateChapter={async (name) => {
          await createChapter({
            title: name,
            partId: modalType!.parentId,
            sortKey: modalType!.sortKey,
          });
          await onRefresh();
        }}
        onCreateSection={async (name) => {
          await createSection({
            title: name,
            partId: modalType!.parentId,
            sortKey: modalType!.sortKey,
            order: modalType!.order ?? 1,
          });
          await onRefresh();
        }}
      />
    </div>
  );
}
