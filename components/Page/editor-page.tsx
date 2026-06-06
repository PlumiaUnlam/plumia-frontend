"use client"

import { useState } from "react"
import {
  ChevronRight,
  Earth,
  FolderKanban,
  Layers3,
  GitBranch,
  TrendingUp,
} from "lucide-react"

import { Sidebar, type SidebarBook } from "../ui/sidebar"
import { NewProjectForm } from "../form/new-project-form"
import { getProjects } from "@/services/project.service";

const projects = await getProjects();

export function EditorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeChapter, setActiveChapter] = useState("ch3")
  const [activePanel, setActivePanel] = useState<"project" | "world" | "board" | "stats" | "history" | "new">("project")
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground select-none">
      {/* ── TOP BAR ── */}
      <header className="z-10 flex h-12 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground">
        <div className="mr-1 flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-white/20">
            <FolderKanban className="size-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Plum<span className="font-light opacity-75">IA</span>
          </span>
        </div>

        <div className="h-5 w-px bg-white/20" />
      </header>

      {/* ── MAIN ROW ── */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen ? (
          <Sidebar
            title="Proyecto"
            books={projects}
            defaultActiveChapterId={activeChapter}
            footerActions={[
              {
                id: "world",
                label: "World",
                icon: <Earth className="size-4" />,
                onClick: () => setActivePanel("world"),
              },
              {
                id: "board",
                label: "Board",
                icon: <Layers3 className="size-4" />,
                onClick: () => setActivePanel("board"),
              },
              {
                id: "stats",
                label: "Stats",
                icon: <TrendingUp className="size-4" />,
                onClick: () => setActivePanel("stats"),
              },
              {
                id: "hist",
                label: "History",
                icon: <GitBranch className="size-4" />,
                onClick: () => setActivePanel("history"),
              },
            ]}

            onNewProject={() => {
              setActivePanel("new")
              setShowNewProjectForm(true)
            }}
            onCollapse={() => setSidebarOpen(false)}
            onChapterChange={setActiveChapter}
          />
        ) : (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex w-5 shrink-0 items-center justify-center border-r border-border bg-muted text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            aria-label="Abrir sidebar"
            title="Abrir sidebar"
          >
            <ChevronRight className="size-3" />
          </button>
        )}

        {/* ── EDITOR AREA ── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-background">

        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="flex h-6 shrink-0 items-center gap-4 border-t border-border bg-muted/50 px-4 text-[10px] text-muted-foreground">
      </div>

      {/* ── NEW PROJECT FORM ── */}
      {showNewProjectForm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <NewProjectForm onCancel={() => setShowNewProjectForm(false)} />
        </div>
      )}
    </div>
  )
}