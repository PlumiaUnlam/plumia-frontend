"use client"

import { Header } from "./header"
import { LeftSidebar } from "./left-sidebar"
import { getProjects } from "@/services/project.service";

const projects = await getProjects();

export function EditorLayout() {

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background font-sans text-foreground select-none">
      {( <Header />)}

      <LeftSidebar books={projects} ></LeftSidebar>

      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-muted/50 px-5 text-[10px] text-muted-foreground">
      </div>

    </div>
  )
}