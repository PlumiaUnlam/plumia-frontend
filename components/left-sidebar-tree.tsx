import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BookOpen, ChevronRight, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";

import type {
  EditableItem,
  SidebarBook,
  SidebarChapter,
} from "@/components/left-sidebar-types";

type LeftSidebarTreeProps = {
  books: SidebarBook[];
  onAddChapter: (book: SidebarBook) => void;
  onAddScene: (chapter: SidebarChapter) => void;
  onSelectScene: (sceneId: string) => void;
  onEditItem: (item: EditableItem) => void;
  onDeleteItem: (item: EditableItem) => void;
};

function SidebarItemMenu({
  item,
  onEdit,
  onDelete,
}: {
  item: EditableItem;
  onEdit: (item: EditableItem) => void;
  onDelete: (item: EditableItem) => void;
}) {
  return (
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
            onSelect={() => onEdit(item)}
          >
            <Pencil className="size-3" />
            Editar
          </MenubarItem>
          <MenubarItem
            variant="destructive"
            className="gap-1 px-1.5 py-0.5 text-xs"
            onSelect={() => onDelete(item)}
          >
            <Trash2 className="size-3" />
            Eliminar
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

export function LeftSidebarTree({
  books,
  onAddChapter,
  onAddScene,
  onSelectScene,
  onEditItem,
  onDeleteItem,
}: LeftSidebarTreeProps) {
  return (
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
                      <span className="truncate text-xs font-semibold text-foreground">
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
                        onAddChapter(book);
                      }}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <SidebarItemMenu
                      item={{ type: "book", id: book.id, title: book.title }}
                      onEdit={onEditItem}
                      onDelete={onDeleteItem}
                    />
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
                                  onAddScene(chapter);
                                }}
                              >
                                <Plus className="size-3" />
                              </Button>
                              <SidebarItemMenu
                                item={{
                                  type: "chapter",
                                  id: chapter.id,
                                  title: chapter.title,
                                }}
                                onEdit={onEditItem}
                                onDelete={onDeleteItem}
                              />
                            </div>
                          </div>

                          <CollapsibleContent>
                            <SidebarMenu className="pl-4">
                              {chapter.scenes.map((scene) => (
                                <SidebarMenuItem key={scene.id}>
                                  <div className="group/scene-row relative w-full">
                                    <SidebarMenuButton
                                      onClick={() => onSelectScene(scene.id)}
                                      size="lg"
                                      className="pr-2 group-hover/scene-row:bg-sidebar-accent group-hover/scene-row:pr-8 group-hover/scene-row:text-sidebar-accent-foreground"
                                    >
                                      <div className="flex min-w-0 flex-col items-start gap-1 padding-4">
                                        <span className="truncate text-[11px] font-medium text-foreground">
                                          {scene.title}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">
                                          {scene.wordCount?.toLocaleString()} palabras
                                        </span>
                                      </div>
                                    </SidebarMenuButton>
                                    <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover/scene-row:pointer-events-auto group-hover/scene-row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                                      <SidebarItemMenu
                                        item={{
                                          type: "section",
                                          id: scene.id,
                                          title: scene.title,
                                        }}
                                        onEdit={onEditItem}
                                        onDelete={onDeleteItem}
                                      />
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
  );
}
