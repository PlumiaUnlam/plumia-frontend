"use client"

import { Header } from "./header"
import { LeftSidebar } from "./left-sidebar"
import { getProjects } from "@/services/project.service";
import { SidebarProvider } from "@/components/ui/sidebar"

const projects = await getProjects();

export function EditorLayout() {

  return (
  <div className="flex h-screen flex-col bg-background text-foreground">
    <Header />

    <SidebarProvider>
      <div className="flex flex-1 min-h-0">
        <LeftSidebar books={projects} />
      </div>
    </SidebarProvider>

    <footer className="h-8 shrink-0 border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground flex items-center">
    </footer>
  </div>
  )
}