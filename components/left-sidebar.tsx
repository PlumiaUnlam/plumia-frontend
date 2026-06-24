
import { useState } from "react"
import { useRouter } from "next/navigation"

import {
    SidebarTrigger, Sidebar, SidebarContent, SidebarFooter, 
    SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import {Collapsible,CollapsibleContent,CollapsibleTrigger,} from "@/components/ui/collapsible"
import {BookOpen, Earth,Layers3,GitBranch,TrendingUp, Plus,ChevronRight} from "lucide-react"

import { NewProjectForm } from "./form/new-project-form";
import { NewItemModal } from "@/components/modal/new-section-modal"
import { createChapter } from "@/services/project.service";

export type SidebarChapter = {
  id: string
  title: string
  wordCount?: number
  scenes: SidebarScene[]
}

export type SidebarScene = {
  id: string
  title: string
  wordCount?: number
}

export type SidebarBook = {
  id: string
  title: string
  chapters: SidebarChapter[]
}

type LeftSidebarProps = {
    projectTitle: string;
    books: SidebarBook[];
};

//LLega ID del proyecto elegido
export function LeftSidebar({ projectTitle, books, }: LeftSidebarProps) {
    const [showNewProjectForm, setShowNewProjectForm] = useState(false)
    const [modalType, setModalType] = useState<{
    type: "chapter" | "section"
    parentId: string
    } | null>(null)
    
    const router = useRouter()

return (
        <div className=" h-full">
            <Sidebar className="relative overflow-hidden flex border-r bg-background">
                <SidebarHeader className="border-b bg-background">
                    
                    <div className="flex items-center justify-between px-4 py-3">
                        <h2 className="truncate font-semibold">
                            {projectTitle}
                        </h2>

                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                setShowNewProjectForm(true)
                            }}
                        >
                            <Plus className="size-4" />
                        </Button>
                        </div>
                </SidebarHeader>
                <SidebarContent className="bg-background">
                    {books.map((book) => (
                        <SidebarGroup key={book.id}>
                            <SidebarMenu>

                                <Collapsible defaultOpen>
                                    <SidebarMenuItem>

                                        <div className="flex w-full items-center gap-1">
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton className="min-w-0 flex-1">
                                                    <ChevronRight
                                                        className="size-4 transition-transform group-data-[state=open]:rotate-90"
                                                    />

                                                    <BookOpen className="size-4" />

                                                    <span className="truncate">{book.title}</span>
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>

                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setModalType({ type: "chapter", parentId: book.id })
                                                }}
                                            >
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>

                                        <CollapsibleContent>
                                            <SidebarMenu className="ml-3 mt-1">

                                                {book.chapters.map((chapter) => (
                                                    <Collapsible
                                                        key={chapter.id}
                                                        defaultOpen
                                                    >
                                                        <SidebarMenuItem>

                                                            <div className="flex w-full items-center gap-1">
                                                                <CollapsibleTrigger asChild>
                                                                    <SidebarMenuButton className="min-w-0 flex-1">
                                                                        <ChevronRight
                                                                            className="size-3 transition-transform group-data-[state=open]:rotate-90"
                                                                        />
                                                                        <span className="truncate">{chapter.title}</span>
                                                                    </SidebarMenuButton>
                                                                </CollapsibleTrigger>

                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setModalType({ type: "section", parentId: chapter.id })
                                                                    }}
                                                                >
                                                                    <Plus className="size-4" />
                                                                </Button>
                                                            </div>

                                                            <CollapsibleContent>
                                                                <SidebarMenu className="ml-4">

                                                                    {chapter.scenes.map((scene) => (
                                                                        <SidebarMenuItem
                                                                            key={scene.id}
                                                                        >
                                                                            <SidebarMenuButton
                                                                                size="sm"
                                                                            >
                                                                                {scene.title}
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
                            onClick={() => router.push("/worldbuilding")}>
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
      {showNewProjectForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <NewProjectForm onCancel={() => setShowNewProjectForm(false)} />
        </div>
      )}

        <NewItemModal
        show={modalType?.type === "chapter"}
        onClose={() => setModalType(null)}
        onSubmit={async (name) => {
            await createChapter({
            title: name,
            partId: modalType!.parentId,
            })
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
            })
        }}
        title="Nueva Sección"
        label="Nombre de la Sección"
        placeholder="Ej: Sección 1: ..."
        submitText="Crear Sección"
        />
        </div>
    )
}
