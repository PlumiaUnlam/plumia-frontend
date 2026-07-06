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
} from "lucide-react";

import { NewItemModal } from "@/components/modal/new-item-modal";
import {
  createBook,
  createChapter,
  createSection,
} from "@/services/project.service";

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

  const router = useRouter();
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const showFooterTooltips = sidebarState === "collapsed";

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
                        <SidebarMenuButton className="min-w-0 gap-1.5 pr-2 group-hover/book-row:pr-8">
                          <ChevronRight className="size-sm transition-transform group-data-[state=open]:rotate-90" />

                          <BookOpen size={10} />

                          <span className="text-xs font-bold text-foreground truncate">
                            {book.title}
                          </span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="pointer-events-none absolute right-1 top-1/2 size-6 -translate-y-1/2 opacity-0 transition-opacity group-hover/book-row:pointer-events-auto group-hover/book-row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
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
                    </div>

                    <CollapsibleContent>
                      <SidebarMenu className="mt-1 pl-3">
                        {book.chapters.map((chapter) => (
                          <Collapsible key={chapter.id} defaultOpen>
                            <SidebarMenuItem>
                              <div className="group/chapter-row relative w-full">
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuButton className="min-w-0 gap-1 pr-2 group-hover/chapter-row:pr-8">
                                    <ChevronRight className="-mr-1 size-2 transition-transform group-data-[state=open]:rotate-90" />
                                    <span className="text-[11px] font-medium text-foreground truncate">
                                      {chapter.title}
                                    </span>
                                  </SidebarMenuButton>
                                </CollapsibleTrigger>

                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  className="pointer-events-none absolute right-1 top-1/2 size-6 -translate-y-1/2 opacity-0 transition-opacity group-hover/chapter-row:pointer-events-auto group-hover/chapter-row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
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
                              </div>

                              <CollapsibleContent>
                                <SidebarMenu className="pl-4">
                                  {chapter.scenes.map((scene) => (
                                    <SidebarMenuItem key={scene.id}>
                                      <SidebarMenuButton size="lg">
                                        <div className="flex flex-col items-start gap-1 padding-4">
                                          <span className="text-[11px] font-medium text-foreground truncate">
                                            {scene.title}
                                          </span>
                                          <span className="text-[9px] text-muted-foreground">
                                            {" "}
                                            {scene.wordCount?.toLocaleString()}{" "}
                                            palabras
                                          </span>
                                        </div>
                                      </SidebarMenuButton>
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
