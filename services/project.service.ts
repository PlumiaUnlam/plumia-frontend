
import { api } from "@/services/api.service";
import type { SidebarBook } from "@/components/left-sidebar";

type ProjectResponse = {
  id: string
  title: string
}

type ProjectWithTreeResponse = ProjectResponse & {
  books: {
    id: string
    title: string
    chapters: {
      id: string
      title: string
      scenes: {
        id: string
        title: string | null
        wordCount: number
      }[]
    }[]
  }[]
}


export async function getProjects() {
  const projects = await api.get<ProjectResponse[]>("/projects")
  if (projects.length === 0) {
    return {
      projectTitle: "Proyecto",
      books: [] as SidebarBook[],
      projectId: "0",
    }
  }

  const projectsWithTree = await Promise.all(
    projects.map((project) =>
      api.get<ProjectWithTreeResponse>(`/projects/${project.id}`),
    ),
  )
  const selectedProject = projectsWithTree[0]

  return {
    projectTitle: selectedProject.title,
    projectId: selectedProject.id,
    books: selectedProject.books.map((book) => ({
      id: book.id,
      title: book.title,
      chapters: book.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        wordCount: chapter.scenes.reduce(
          (total, scene) => total + scene.wordCount,
          0,
        ),
        scenes: chapter.scenes.map((scene) => ({
          id: scene.id,
          title: scene.title ?? "Escena sin título",
          wordCount: scene.wordCount,
        })),
      })),
    })),
  }
}

export async function createBook(data: {
  title: string
  partId: string
  sortKey: string
}) {
  return api.post(`/projects/${data.partId}/books`, { title: data.title, sortKey: data.sortKey })
}

export async function createChapter(data: {
  title: string
  partId: string
  sortKey: string
}) {
  return api.post(`/books/${data.partId}/chapters`, { title: data.title, sortKey: data.sortKey })
}

export async function createSection(data: {
  title: string
  partId: string
  sortKey: string
}) {
  return api.post(`/chapters/${data.partId}/scenes`, { title: data.title, sortKey: data.sortKey })
}

export async function createProject(){

}

