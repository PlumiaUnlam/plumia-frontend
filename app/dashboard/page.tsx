"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  Clock3,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  SearchX,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

import { Navbar } from "@/components/navbar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  deleteProject,
  getDashboardProjects,
  type ProjectResponse,
} from "@/services/project.service"

const NewProjectForm = dynamic(() =>
  import("@/components/form/new-project-form").then(
    (module) => module.NewProjectForm,
  ),
)

function formatWordCount(value: number) {
  return new Intl.NumberFormat("es-ES").format(value)
}

function formatProjectStatus(status: string) {
  const labels: Record<string, string> = {
    draft: "Borrador",
    active: "Activo",
    archived: "Archivado",
  }

  return labels[status] ?? status
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<ProjectResponse | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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
            className="relative flex h-full flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
          >
            <Link
              href={`/projects/${encodeURIComponent(project.id)}/editor`}
              aria-label={`Abrir ${project.title}`}
              className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <CardHeader className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {project.description}
                  </CardDescription>
                </div>
                <div className="relative z-20 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Acciones de ${project.title}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => setProjectToEdit(project)}>
                        <Pencil />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setProjectToDelete(project)}
                      >
                        <Trash2 />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
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
              <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
                <Badge variant="secondary">{project.genre}</Badge>
                <span className="text-xs font-medium text-foreground/70">
                  Estado: {formatProjectStatus(project.status)}
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

  const handleEditSuccess = (updatedProject: ProjectResponse) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project,
      ),
    )
    setErrorMessage(null)
    setProjectToEdit(null)
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    try {
      await deleteProject(projectToDelete.id)
      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectToDelete.id),
      )
      setErrorMessage(null)
      setProjectToDelete(null)
    } catch (error) {
      console.error("Error deleting project:", error)
      setErrorMessage(
        `No se pudo eliminar “${projectToDelete.title}”. Inténtalo nuevamente.`,
      )
    } finally {
      setIsDeleting(false)
    }
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
        {isCreateDialogOpen ? (
          <NewProjectForm
            onCancel={() => setIsCreateDialogOpen(false)}
            onSuccess={handleCreateSuccess}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(projectToEdit)}
        onOpenChange={(open) => {
          if (!open) setProjectToEdit(null)
        }}
      >
        {projectToEdit ? (
          <NewProjectForm
            key={projectToEdit.id}
            project={projectToEdit}
            onCancel={() => setProjectToEdit(null)}
            onSuccess={handleEditSuccess}
          />
        ) : null}
      </Dialog>

      <AlertDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setProjectToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete
                ? `“${projectToDelete.title}” y todo su contenido dejarán de estar disponibles. Esta acción no se puede deshacer.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteProject()
              }}
            >
              {isDeleting ? <Spinner className="size-4" /> : <Trash2 />}
              {isDeleting ? "Eliminando…" : "Eliminar proyecto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PlusIcon() {
  return <FolderPlus />
}
