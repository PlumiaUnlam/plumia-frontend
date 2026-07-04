"use client"

import { Header } from "../header"
import { EditorContainer } from "@/components/editor/editor-container"
import { LeftSidebar } from "../left-sidebar"
import { getProjects } from "@/services/project.service";
import { SidebarProvider } from "@/components/ui/sidebar"
import { useEditorStore } from "@/stores/editor.store"

const projects = await getProjects();

export function EditorLayout() {

const activeChapterId = useEditorStore((s) => s.activeChapterId)

return (
  <div className="flex h-screen flex-col bg-background text-foreground">
    <Header />

    <SidebarProvider>
      <div className="flex flex-1 min-h-0">
        <LeftSidebar books={projects} />

        <main className="flex flex-1 min-h-0 flex-col">
          <EditorContainer chapterId={activeChapterId ?? "ch1"} />
        </main>
      </div>
    </SidebarProvider>

    <footer className="h-8 shrink-0 border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground flex items-center">
    </footer>
  </div>
)
}