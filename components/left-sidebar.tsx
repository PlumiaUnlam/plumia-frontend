import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpen,
  Earth,
  Layers3,
  TrendingUp,
  Plus,
  ChevronRight,
  ChevronLeft,
  Undo2,
  Ellipsis,
  Pencil,
  Trash2,
} from "lucide-react";

import { NewItemModal } from "@/components/modal/new-item-modal";
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
import { useEditorStore } from "@/stores/editor.store";

export type SidebarChapter = {
  id: string;
  title: string;
  sortKey: string;
  wordCount?: number;
  scenes: SidebarScene[];
};

export type SidebarScene = {
  id: string;
  title: string;
  sortKey: string;
  wordCount?: number;
  order: number;
};

export type SidebarBook = {
  id: string;
  title: string;
  sortKey: string;
  chapters: SidebarChapter[];
};

type LeftSidebarProps = {
  projectTitle: string;
  books: SidebarBook[];
  projectId: string;
  onRefresh: () => Promise<void>;
};

type EditableItemType = "book" | "chapter" | "section";

type EditableItem = {
  type: EditableItemType;
  id: string;
  title: string;
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
  const [modalType, setModalType] = useState<{
    type: "book" | "chapter" | "section";
    parentId: string;
    sortKey: string;
    order?: number;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EditableItem | null>(null);
  const [editName, setEditName] = useState("");
  const [isItemActionSubmitting, setIsItemActionSubmitting] = useState(false);

  const router = useRouter();
  const setActiveScene = useEditorStore((s) => s.setActiveScene)
  const activeSceneId = useEditorStore((s) => s.activeSceneId)
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const showFooterTooltips = sidebarState === "collapsed";

  const openEditItem = (item: EditableItem) => {
    setEditingItem(item);
    setEditName(item.title);
  };

  const closeEditItem = () => {
    if (isItemActionSubmitting) return;

    setEditingItem(null);
    setEditName("");
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

  const renderItemMenu = (item: EditableItem) => (
    <Menubar className="h-auto border-0 bg-transparent p-0">
      <MenubarMenu>
        <MenubarTrigger asChild>
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-6 text-sidebar-primary hover:bg-sidebar-primary/10 hover:text-sidebar-primary active:not-aria-[haspopup]:translate-y-0"
            aria-label={`Opciones de ${item.title}`}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Ellipsis className="size-3.5" />
          </Button>
        </MenubarTrigger>
        <MenubarContent
          align="end"
          sideOffset={6}
          className="min-w-24 rounded-md p-0.5"
        >
          <MenubarItem
            className="gap-1 px-1.5 py-0.5 text-xs"
            onSelect={() => {
              openEditItem(item);
            }}
          >
            <Pencil className="size-3" />
            Editar
          </MenubarItem>
          <MenubarItem
            variant="destructive"
            className="gap-1 px-1.5 py-0.5 text-xs"
            onSelect={() => {
              setItemToDelete(item);
            }}
          >
            <Trash2 className="size-3" />
            Eliminar
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );

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
              onClick={() => {
                setModalType({
                  type: "book",
                  parentId: projectId,
                  sortKey: nextSortKey(books),
                });
              }}
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
        <SidebarContent className="flex-1 overflow-y-auto bg-background group-data-[collapsible=icon]:hidden">
          {books.map((book) => (
            <SidebarGroup key={book.id}>
              <SidebarMenu>
                <Collapsible defaultOpen>
                  <SidebarMenuItem>
                    <div className="group/book-row relative w-full">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="min-w-0 gap-1.5 pr-2 group-hover/book-row:bg-sidebar-accent group-hover/book-row:pr-14 group-hover/book-row:text-sidebar-accent-foreground [&_.tree-book-icon]:size-2.5 [&_.tree-chevron]:size-2.5 [&[data-state=open]_.tree-chevron]:rotate-90">
                          <ChevronRight className="tree-chevron text-sidebar-primary transition-transform" />

                          <BookOpen className="tree-book-icon text-sidebar-primary" />

                          <span className="text-xs font-semibold text-foreground truncate">
                            {book.title}
                          </span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/book-row:pointer-events-auto group-hover/book-row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="size-6 text-sidebar-primary hover:bg-sidebar-primary/10 hover:text-sidebar-primary active:not-aria-[haspopup]:translate-y-0"
                          aria-label={`Agregar capítulo a ${book.title}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalType({
                              type: "chapter",
                              parentId: book.id,
                              sortKey: nextSortKey(book.chapters),
                            });
                          }}
                        >
                          <Plus className="size-3" />
                        </Button>
                        {renderItemMenu({
                          type: "book",
                          id: book.id,
                          title: book.title,
                        })}
                      </div>
                    </div>

                    <CollapsibleContent>
                      <SidebarMenu className="mt-1 pl-3">
                        {book.chapters.map((chapter) => (
                          <Collapsible key={chapter.id} defaultOpen>
                            <SidebarMenuItem>
                              <div className="group/chapter-row relative w-full">
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton className="min-w-0 gap-1.5 pr-2 group-hover/chapter-row:bg-sidebar-accent group-hover/chapter-row:pr-14 group-hover/chapter-row:text-sidebar-accent-foreground [&_.tree-chevron]:size-2.5 [&[data-state=open]_.tree-chevron]:rotate-90">
                                    <ChevronRight className="tree-chevron -mr-1 text-sidebar-primary transition-transform" />
                                    <span className="truncate text-[11px] font-medium text-sidebar-primary">
                                      {chapter.title}
                                    </span>
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>

                                <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/chapter-row:pointer-events-auto group-hover/chapter-row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    className="size-6 text-sidebar-primary hover:bg-sidebar-primary/10 hover:text-sidebar-primary active:not-aria-[haspopup]:translate-y-0"
                                    aria-label={`Agregar sección a ${chapter.title}`}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModalType({
                                        type: "section",
                                        parentId: chapter.id,
                                        sortKey: nextSortKey(chapter.scenes),
                                        order: nextOrder(chapter.scenes),
                                      });
                                    }}
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                  {renderItemMenu({
                                    type: "chapter",
                                    id: chapter.id,
                                    title: chapter.title,
                                  })}
                                </div>
                              </div>

                              <CollapsibleContent>
                                <SidebarMenu className="pl-4">
                                  {chapter.scenes.map((scene) => (
                                    <SidebarMenuItem key={scene.id}>
                                      <div className="group/scene-row relative w-full">
                                        <SidebarMenuButton
                                          onClick={() => setActiveScene(scene.id)}
                                          size="lg"
                                          className="pr-2 group-hover/scene-row:bg-sidebar-accent group-hover/scene-row:pr-8 group-hover/scene-row:text-sidebar-accent-foreground"
                                        >
                                          <div className="flex min-w-0 flex-col items-start gap-1 padding-4">
                                            <span className="truncate text-[11px] font-medium text-foreground">
                                              {scene.title}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">
                                              {" "}
                                              {scene.wordCount?.toLocaleString()}{" "}
                                              palabras
                                            </span>
                                          </div>
                                        </SidebarMenuButton>
                                        <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover/scene-row:pointer-events-auto group-hover/scene-row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                                          {renderItemMenu({
                                            type: "section",
                                            id: scene.id,
                                            title: scene.title,
                                          })}
                                        </div>
                                      </div>
                                    </SidebarMenuItem>
                                  ))}
                                </SidebarMenu>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
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
                  className="h-10 w-full flex-col gap-0.5 px-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
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
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) closeEditItem();
        }}
      >
        <DialogContent className="min-w-[520px] gap-0 overflow-hidden">
          <DialogHeader className="border-b p-6 py-4">
            <DialogTitle>Editar elemento</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <Field>
              <FieldLabel htmlFor="edit-sidebar-item-name">
                Nombre <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-sidebar-item-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void handleUpdateItem();
                    }
                  }}
                  placeholder="Nombre"
                />
              </FieldContent>
            </Field>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              disabled={isItemActionSubmitting}
              onClick={closeEditItem}
            >
              Cancelar
            </Button>
            <Button
              disabled={!editName.trim() || isItemActionSubmitting}
              onClick={() => {
                void handleUpdateItem();
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open && !isItemActionSubmitting) setItemToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar elemento</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar &ldquo;{itemToDelete?.title}&rdquo;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isItemActionSubmitting}
              onClick={() => setItemToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={isItemActionSubmitting}
              onClick={() => {
                void handleDeleteItem();
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NewItemModal
        show={modalType?.type === "chapter"}
        onClose={() => setModalType(null)}
        onSubmit={async (name) => {
          await createChapter({
            title: name,
            partId: modalType!.parentId,
            sortKey: modalType!.sortKey,
          });
          await onRefresh();
        }}
        title="Nuevo Capítulo"
        label="Nombre del Capítulo"
        placeholder="Ej: Capítulo 1: ..."
        submitText="Crear Capítulo"
      />

      <NewItemModal
        show={modalType?.type === "section"}
        onClose={() => setModalType(null)}
        onSubmit={async (name) => {
          await createSection({
            title: name,
            partId: modalType!.parentId,
            sortKey: modalType!.sortKey,
            order: modalType!.order ?? 1,
          });
          await onRefresh();
        }}
        title="Nueva Sección"
        label="Nombre de la Sección"
        placeholder="Ej: Sección 1: ..."
        submitText="Crear Sección"
      />

      <NewItemModal
        show={modalType?.type === "book"}
        onClose={() => setModalType(null)}
        onSubmit={async (name) => {
          await createBook({
            title: name,
            partId: modalType!.parentId,
            sortKey: modalType!.sortKey,
          });
          await onRefresh();
        }}
        title="Nuevo Libro"
        label="Nombre del Libro"
        placeholder="Ej: Libro 1: ..."
        submitText="Crear Libro"
      />
    </div>
  );
}
