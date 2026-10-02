"use client"

import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import {
  BookOpen,
  Clock3,
  FolderPlus,
  SearchX,
  TriangleAlert,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { NewProjectForm } from "@/components/form/new-project-form"
import { Navbar } from "@/components/navbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getDashboardProjects,
  type ProjectResponse,
} from "@/services/project.service"

function formatWordCount(value: number) {
  return new Intl.NumberFormat("es-ES").format(value)
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getDashboardProjects()
      .then((data) => {
        if (!isMounted) {
          return
        }

        setProjects(data)
        setErrorMessage(null)
      })
      .catch((error) => {
        console.error("Error loading projects:", error)
        if (!isMounted) {
          return
        }

        setErrorMessage(
          "No se pudo cargar la lista desde la API; se muestran datos de ejemplo.",
        )
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return projects
    }

    return projects.filter((project) => {
      const searchableText = [
        project.title,
        project.genre,
        project.description,
      ]
        .join(" ")
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
  }, [projects, searchQuery])

  const openProject = (projectId: string) => {
    router.push(`/projects/${encodeURIComponent(projectId)}/editor`)
  }

  const handleProjectKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    projectId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openProject(projectId)
    }
  }

  let projectContent
  if (isLoading) {
    projectContent = (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-full" aria-hidden="true">
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  } else if (filteredProjects.length === 0) {
    const isSearching = searchQuery.trim().length > 0
    projectContent = (
      <Empty className="min-h-64 border bg-card/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {isSearching ? <SearchX /> : <FolderPlus />}
          </EmptyMedia>
          <EmptyTitle>
            {isSearching ? "No encontramos coincidencias" : "Creá tu primer proyecto"}
          </EmptyTitle>
          <EmptyDescription>
            {isSearching
              ? "Probá con otro título, género o una búsqueda más corta."
              : "Empezá una nueva historia y reuní en un solo lugar el manuscrito, las entidades y la planificación."}
          </EmptyDescription>
        </EmptyHeader>
        {!isSearching ? (
          <EmptyContent>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon />
              Crear proyecto
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    )
  } else {
    projectContent = (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            role="button"
            tabIndex={0}
            aria-label={`Abrir ${project.title}`}
            className="flex h-full cursor-pointer flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => openProject(project.id)}
            onKeyDown={(event) => handleProjectKeyDown(event, project.id)}
          >
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {project.description}
                  </CardDescription>
                </div>
                <Badge variant="outline">{project.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{project.genre}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4" />
                <span>{formatWordCount(project.wordCountTarget)} palabras objetivo</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="size-4" />
                <span>
                  Actualizado{" "}
                  {new Date(project.updatedAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const handleCreateSuccess = (project: ProjectResponse) => {
    setProjects((currentProjects) => [project, ...currentProjects])
    setErrorMessage(null)
    setIsCreateDialogOpen(false)
  }

  const projectCountLabel = `${filteredProjects.length} ${
    filteredProjects.length === 1 ? "proyecto" : "proyectos"
  }`

  return (
    <div className="min-h-dvh bg-background">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateProject={() => setIsCreateDialogOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Biblioteca
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Mis proyectos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projectCountLabel}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <Alert className="mb-6 border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
            <TriangleAlert />
            <AlertDescription className="text-current/80">
              {errorMessage}
            </AlertDescription>
          </Alert>
        ) : null}

        {projectContent}
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear nuevo proyecto</DialogTitle>
          </DialogHeader>
          <NewProjectForm
            onCancel={() => setIsCreateDialogOpen(false)}
            onSuccess={handleCreateSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlusIcon() {
  return <FolderPlus />
}
