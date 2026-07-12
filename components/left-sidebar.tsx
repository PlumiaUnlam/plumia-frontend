import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Earth,
  Layers3,
  TrendingUp,
  Plus,
  ChevronLeft,
  Undo2,
  ChevronRight,
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
import { useEditorStore } from "@/stores/editor.store";
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
}: LeftSidebarProps) {
  const [modalType, setModalType] = useState<SidebarModalState | null>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EditableItem | null>(null);
  const [editName, setEditName] = useState("");
  const [isItemActionSubmitting, setIsItemActionSubmitting] = useState(false);

  const router = useRouter();
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
        currentContent,
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
        className="relative flex h-full min-h-0 flex-col border-r bg-background"
      >
        <SidebarHeader className="h-12 shrink-0 justify-center border-b bg-background p-2">
          <div className="flex w-full items-center gap-1 group-data-[collapsible=icon]:hidden">
            <h2 className="min-w-0 flex-1 truncate font-semibold center text-sm justify-center">
              {projectTitle}
            </h2>

            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6"
              onClick={() =>
                setModalType({
                  type: "book",
                  parentId: projectId,
                  sortKey: nextSortKey(books),
                })
              }
            >
              <Plus className="size-3" />
            </Button>

            <Button
              size="icon-xs"
              variant="ghost"
              className="size-6"
              onClick={toggleSidebar}
              aria-label="Cerrar estructura del proyecto"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
          <Button
            size="icon-xs"
            variant="ghost"
            className="mx-auto hidden size-6 group-data-[collapsible=icon]:flex"
            onClick={toggleSidebar}
            aria-label="Abrir estructura del proyecto"
          >
            <ChevronRight className="size-3.5" />
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
          onSelectScene={setActiveScene}
          onEditItem={openEditItem}
          onDeleteItem={setItemToDelete}
        />
        <SidebarFooter className="border-t bg-background p-2">
          <TooltipProvider>
            <div className="grid w-full grid-cols-4 gap-0.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-10 w-full flex-col gap-0.5 px-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                  onClick={() =>
                    router.push(
                      `/projects/${encodeURIComponent(projectId)}/worldbuilding`,
                    )
                  }
                  aria-label="Worldbuilding"
                >
                  <Earth className="size-4" />
                  <span className="max-w-full truncate text-[7.5px] font-medium leading-none group-data-[collapsible=icon]:hidden">
                    Worldbuilding
                  </span>
                </Button>
              </TooltipTrigger>
              {showFooterTooltips ? (
                <TooltipContent side="right" sideOffset={8}>
                  Worldbuilding
                </TooltipContent>
              ) : null}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-10 w-full flex-col gap-0.5 px-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                  onClick={() =>
                    router.push(
                      `/projects/${encodeURIComponent(projectId)}/storyboard`,
                    )
                  }
                  aria-label="Tablero"
                >
                  <Layers3 className="size-4" />
                  <span className="max-w-full truncate text-[7.5px] font-medium leading-none group-data-[collapsible=icon]:hidden">
                    Tablero
                  </span>
                </Button>
              </TooltipTrigger>
              {showFooterTooltips ? (
                <TooltipContent side="right" sideOffset={8}>
                  Tablero
                </TooltipContent>
              ) : null}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-10 w-full flex-col gap-0.5 px-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                  aria-label="Estadisticas"
                >
                  <TrendingUp className="size-4" />
                  <span className="max-w-full truncate text-[7.5px] font-medium leading-none group-data-[collapsible=icon]:hidden">
                    Estadisticas
                  </span>
                </Button>
              </TooltipTrigger>
              {showFooterTooltips ? (
                <TooltipContent side="right" sideOffset={8}>
                  Estadisticas
                </TooltipContent>
              ) : null}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`h-10 w-full flex-col gap-0.5 px-0 hover:text-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 ${
                    historyOpen
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setHistoryOpen(true)}
                  aria-label="Historial"
                >
                  <Undo2 className="size-4" />
                  <span className="max-w-full truncate text-[7.5px] font-medium leading-none group-data-[collapsible=icon]:hidden">
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
        onSelectDraft={() => setSelectedSceneVersion(null)}
        onSelectVersion={setSelectedSceneVersion}
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
