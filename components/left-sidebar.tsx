
import { useState } from "react"
import { useRouter } from "next/navigation"

import {
    SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarFooter, 
    SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button";
import {Collapsible,CollapsibleContent,CollapsibleTrigger,} from "@/components/ui/collapsible"
import {BookOpen, Earth,Layers3,GitBranch,TrendingUp, Plus,ChevronRight} from "lucide-react"

import { NewProjectForm } from "./form/new-project-form";
import { Header } from "./header";
import { useEditorStore } from "@/stores/editor.store";

export type SidebarChapter = {
  id: string
  title: string
  wordCount?: number
}

export type SidebarPart = {
  id: string
  title: string
  chapters: SidebarChapter[]
}

export type SidebarBook = {
  id: string
  title: string
  subtitle: string
  parts: SidebarPart[]
}

type LeftSidebarProps = {
    books: SidebarBook[];
};

export function LeftSidebar({ books, }: LeftSidebarProps) {
    const [showNewProjectForm, setShowNewProjectForm] = useState(false)
    const router = useRouter()
    const setActiveChapter = useEditorStore((s) => s.setActiveChapter)
    const activeChapterId = useEditorStore((s) => s.activeChapterId)
return (
        <div className=" h-full">
            <Sidebar className="relative overflow-hidden flex border-r bg-background">
                <SidebarHeader className="border-b bg-background">
                    <div className="flex items-center justify-between px-4 py-3">
                        <h2 className="font-semibold">
                            Proyecto
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

                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton>
                                                <ChevronRight
                                                    className="size-4 transition-transform group-data-[state=open]:rotate-90"
                                                />

                                                <BookOpen className="size-4" />

                                                <span>{book.title}</span>
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <SidebarMenu className="ml-4 mt-1">

                                                {book.parts.map((part) => (
                                                    <Collapsible
                                                        key={part.id}
                                                        defaultOpen
                                                    >
                                                        <SidebarMenuItem>

                                                            <CollapsibleTrigger asChild>
                                                                <SidebarMenuButton size="sm">
                                                                    <ChevronRight
                                                                        className="size-3 transition-transform group-data-[state=open]:rotate-9"
                                                                    />
                                                                    <span>{part.title}</span>
                                                                </SidebarMenuButton>
                                                            </CollapsibleTrigger>

                                                            <CollapsibleContent>
                                                                <SidebarMenu className="ml-4">

                                                                    {part.chapters.map((chapter) => (
                                                                        <SidebarMenuItem
                                                                            key={chapter.id}
                                                                        >
                                                                            <SidebarMenuButton
                                                                                size="sm"
                                                                                isActive={activeChapterId === chapter.id}
                                                                                onClick={() => setActiveChapter(chapter.id)}
                                                                            >
                                                                                {chapter.title}
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
        </div>
    )
}