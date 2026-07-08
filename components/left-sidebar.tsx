
import { useState } from "react"
import { useRouter } from "next/navigation"

import {
    SidebarTrigger, Sidebar, SidebarContent, SidebarFooter,
    SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "@/components/ui/collapsible"
import { BookOpen, Earth, Layers3, GitBranch, TrendingUp, Plus, ChevronRight } from "lucide-react"

import { NewItemModal } from "@/components/modal/new-item-modal"
import { createBook, createChapter, createSection } from "@/services/project.service";
import { useEditorStore } from "@/stores/editor.store";

export type SidebarChapter = {
    id: string
    title: string
    sortKey: string
    wordCount?: number
    scenes: SidebarScene[]
}

export type SidebarScene = {
    id: string
    title: string
    sortKey: string
    wordCount?: number
    order: number
}

export type SidebarBook = {
    id: string
    title: string
    sortKey: string
    chapters: SidebarChapter[]
}

type LeftSidebarProps = {
    projectTitle: string;
    books: SidebarBook[];
    projectId: string;
    onRefresh: () => Promise<void>;
};

function nextSortKey(items: Array<{ sortKey?: string }>) {
    const next = Math.max(
        0,
        ...items.map((item) => Number.parseInt(item.sortKey ?? "", 10)).filter(Number.isFinite),
    ) + 1

    return next.toString().padStart(3, "0")
}

function nextOrder(items: Array<{ order?: number }>) {
    return Math.max(0, ...items.map((item) => item.order ?? 0)) + 1
}

//LLega ID del proyecto elegido
export function LeftSidebar({ projectTitle, books, projectId, onRefresh }: LeftSidebarProps) {
    const [modalType, setModalType] = useState<{
        type: "book" | "chapter" | "section"
        parentId: string
        sortKey: string
        order?: number
    } | null>(null)

    const router = useRouter()
    const setActiveScene = useEditorStore((s) => s.setActiveScene)
    const activeSceneId = useEditorStore((s) => s.activeSceneId)

return (
        <div className="flex h-full min-h-0">
            <Sidebar className="relative flex h-full min-h-0 flex-col border-r bg-background">
                <SidebarHeader className="border-b bg-background">
                    <div className="grid w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-1">
                        <h2 className="truncate font-semibold center text-[15px] justify-center">
                            {projectTitle}
                        </h2>

                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => {
                                setModalType({ type: "book", parentId: projectId, sortKey: nextSortKey(books), })
                            }}
                        >
                            <Plus className="size-4" />
                        </Button>
                    </div>
                </SidebarHeader>
                <SidebarContent className="flex-1 overflow-y-auto bg-background">
                    {books.map((book) => (
                        <SidebarGroup key={book.id}>
                            <SidebarMenu>

                                <Collapsible defaultOpen>
                                    <SidebarMenuItem>

                                        <div className="grid w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-1">
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton className="min-w-0 flex-1">
                                                    <ChevronRight
                                                        className="size-4 transition-transform group-data-[state=open]:rotate-90"
                                                    />

                                                    <BookOpen className="size-4" />

                                                    <span className="text-[12px] font-bold text-foreground truncate">{book.title}</span>
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>

                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="size-8"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setModalType({ type: "chapter", parentId: book.id, sortKey: nextSortKey(book.chapters), })
                                                }}
                                            >
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>

                                        <CollapsibleContent>
                                            <SidebarMenu className="mt-1 pl-3">

                                                {book.chapters.map((chapter) => (
                                                    <Collapsible
                                                        key={chapter.id}
                                                        defaultOpen
                                                    >
                                                        <SidebarMenuItem>

                                                            <div className="grid w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-1">
                                                                <CollapsibleTrigger asChild>
                                                                    <SidebarMenuButton className="min-w-0 flex-1">
                                                                        <ChevronRight
                                                                            className="size-3 transition-transform group-data-[state=open]:rotate-90"
                                                                        />
                                                                        <span className="text-[11px] font-medium text-foreground truncate">{chapter.title}</span>
                                                                    </SidebarMenuButton>
                                                                </CollapsibleTrigger>

                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="size-8"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setModalType({
                                                                            type: "section",
                                                                            parentId: chapter.id,
                                                                            sortKey: nextSortKey(chapter.scenes),
                                                                            order: nextOrder(chapter.scenes),
                                                                        })
                                                                    }}
                                                                >
                                                                    <Plus className="size-4" />
                                                                </Button>
                                                            </div>

                                                            <CollapsibleContent>
                                                                <SidebarMenu className="pl-4">

                                                                    {chapter.scenes.map((scene) => (
                                                                        <SidebarMenuItem
                                                                            key={scene.id}
                                                                        >
                                                                            <SidebarMenuButton
                                                                                isActive={activeSceneId === scene.id}
                                                                                onClick={() => setActiveScene(scene.id)}
                                                                                size="lg"
                                                                            >
                                                                                <div className="flex flex-col items-start gap-1 padding-4">
                                                                                    <span className="text-[11px] font-medium text-foreground truncate">{scene.title}</span>
                                                                                    <span className="text-[9px] text-muted-foreground"> {scene.wordCount?.toLocaleString()} palabras</span>
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
                <SidebarFooter className="flex border-t p-2 bg-background ">
                    <div className="flex gap-1 justify-center">
                        <Button variant="ghost" className="justify-start"
                            onClick={() => router.push(`/projects/${encodeURIComponent(projectId)}/worldbuilding`)}>
                            <Earth className="mr-2 size-4" />

                        </Button>
                        <Button variant="ghost" className="justify-start">
                            <Layers3 className="mr-2 size-4" />
                        </Button>
                        <Button variant="ghost" className="justify-start">
                            <TrendingUp className="mr-2 size-4" />
                        </Button>
                        <Button variant="ghost" className="justify-start">
                            <GitBranch className="mr-2 size-4" />
                        </Button>
                    </div>
                </SidebarFooter>
            </Sidebar>
            <main className="fixed bottom-0 left-0 z-10 justify-center w-full">
                <SidebarTrigger />
                Arbol
            </main>

            <NewItemModal
                show={modalType?.type === "chapter"}
                onClose={() => setModalType(null)}
                onSubmit={async (name) => {
                    await createChapter({
                        title: name,
                        partId: modalType!.parentId,
                        sortKey: modalType!.sortKey,
                    })
                    await onRefresh()
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
                    })
                    await onRefresh()
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
                    })
                    await onRefresh()
                }}
                title="Nuevo Libro"
                label="Nombre del Libro"
                placeholder="Ej: Libro 1: ..."
                submitText="Crear Libro"
            />
        </div>
    )
}
