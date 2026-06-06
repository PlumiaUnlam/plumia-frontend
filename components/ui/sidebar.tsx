"use client"

import * as React from "react"
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, FileText, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

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

export type SidebarQuickAction = {
  id: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
}

export type SidebarProps = {
  title: string
  books: SidebarBook[]
  activeChapterId?: string
  defaultActiveChapterId?: string
  defaultExpandedBooks?: string[]
  defaultExpandedParts?: string[]
  footerActions?: SidebarQuickAction[]
  className?: string
  onNewProject?: () => void
  onCollapse?: () => void
  onChapterChange?: (chapterId: string) => void
}

function Sidebar({
  title,
  books,
  activeChapterId,
  defaultActiveChapterId,
  defaultExpandedBooks,
  defaultExpandedParts,
  footerActions,
  className,
  onNewProject,
  onCollapse,
  onChapterChange,
}: SidebarProps) {
  const [expandedBooks, setExpandedBooks] = React.useState<string[]>(
    defaultExpandedBooks ?? books.map((book) => book.id)
  )
  const [expandedParts, setExpandedParts] = React.useState<string[]>(
    defaultExpandedParts ?? books.flatMap((book) => book.parts.map((part) => part.id))
  )
  const [internalActiveChapterId, setInternalActiveChapterId] = React.useState(
    defaultActiveChapterId ?? books[0]?.parts[0]?.chapters[0]?.id ?? ""
  )

  const resolvedActiveChapterId = activeChapterId ?? internalActiveChapterId

  const activeLocation = React.useMemo(() => {
    for (const book of books) {
      for (const part of book.parts) {
        const chapter = part.chapters.find((item) => item.id === resolvedActiveChapterId)
        if (chapter) {
          return { book, part, chapter }
        }
      }
    }

    const fallbackBook = books[0]
    const fallbackPart = fallbackBook?.parts[0]
    const fallbackChapter = fallbackPart?.chapters[0]

    return fallbackBook && fallbackPart && fallbackChapter
      ? { book: fallbackBook, part: fallbackPart, chapter: fallbackChapter }
      : null
  }, [books, resolvedActiveChapterId])

  React.useEffect(() => {
    if (activeChapterId) {
      return
    }

    if (!internalActiveChapterId) {
      const firstChapter = books[0]?.parts[0]?.chapters[0]?.id ?? ""
      if (firstChapter) {
        setInternalActiveChapterId(firstChapter)
      }
    }
  }, [activeChapterId, books, internalActiveChapterId])

  const toggleBook = (bookId: string) => {
    setExpandedBooks((current) =>
      current.includes(bookId) ? current.filter((item) => item !== bookId) : [...current, bookId]
    )
  }

  const togglePart = (partId: string) => {
    setExpandedParts((current) =>
      current.includes(partId) ? current.filter((item) => item !== partId) : [...current, partId]
    )
  }

  const handleChapterChange = (chapterId: string) => {
    if (activeChapterId === undefined) {
      setInternalActiveChapterId(chapterId)
    }

    onChapterChange?.(chapterId)
  }

  return (
    <aside
      className={cn(
        "flex h-full w-56 shrink-0 flex-col overflow-hidden border-r border-border bg-muted text-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {title}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {activeLocation ? `${activeLocation.book.title}` : "Sin capítulo activo"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onNewProject}
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground"
            title="Nuevo proyecto"
            aria-label="Nuevo proyecto"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground"
            title="Cerrar sidebar"
            aria-label="Cerrar sidebar"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {books.map((book) => {
          const isBookExpanded = expandedBooks.includes(book.id)

          return (
            <div key={book.id}>
              <button
                type="button"
                onClick={() => toggleBook(book.id)}
                className="flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/30"
              >
                {isBookExpanded ? (
                  <ChevronDown className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                )}
                <BookOpen className="mt-0.5 size-3 shrink-0 text-primary/70" />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-foreground">{book.title}</div>
                  <div className="truncate text-[9px] text-muted-foreground">{book.subtitle}</div>
                </div>
              </button>

              {isBookExpanded ? (
                <div className="ml-3">
                  {book.parts.map((part) => {
                    const isPartExpanded = expandedParts.includes(part.id)

                    return (
                      <div key={part.id} className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => togglePart(part.id)}
                          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent/30"
                        >
                          {isPartExpanded ? (
                            <ChevronDown className="size-2.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-2.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 truncate text-[10px] font-medium text-muted-foreground">
                            {part.title}
                          </span>
                        </button>

                        {isPartExpanded ? (
                          <div className="ml-3">
                            {part.chapters.map((chapter) => {
                              const isActive = chapter.id === resolvedActiveChapterId

                              return (
                                <button
                                  key={chapter.id}
                                  type="button"
                                  onClick={() => handleChapterChange(chapter.id)}
                                  aria-pressed={isActive}
                                  className={cn(
                                    "mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors",
                                    isActive
                                      ? "bg-primary/12 text-primary"
                                      : "text-foreground hover:bg-accent/30"
                                  )}
                                >
                                  <FileText
                                    className={cn(
                                      "size-2.5 shrink-0",
                                      isActive ? "text-primary" : "text-muted-foreground"
                                    )}
                                  />
                                  <div className="min-w-0">
                                    <div className="truncate text-[10px] font-medium">{chapter.title}</div>
                                    {typeof chapter.wordCount === "number" && chapter.wordCount > 0 ? (
                                      <div className="text-[9px] text-muted-foreground">
                                        {chapter.wordCount.toLocaleString("es-ES")} palabras
                                      </div>
                                    ) : (
                                      <div className="text-[9px] italic text-muted-foreground/60">vacío</div>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {footerActions?.length ? (
        <div className="border-t border-border p-2">
          <div className="grid grid-cols-4 gap-1">
            {footerActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                title={action.label}
                className="flex h-9 items-center justify-center rounded-md border border-transparent bg-accent/50 text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                <span className="flex size-4 items-center justify-center">{action.icon}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}

export { Sidebar }