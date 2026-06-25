
import { api } from "@/services/api.service";

type ProjectResponse = {
  id: string
  title: string
}

type ProjectWithTreeResponse = ProjectResponse & {
  books: {
    id: string
    title: string
    sortKey: string
    chapters: {
      id: string
      title: string
      sortKey: string
      scenes: {
        id: string
        title: string | null
        sortKey: string
        wordCount: number
        order: number
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
      sortKey: book.sortKey,
      chapters: book.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        sortKey: chapter.sortKey,
        wordCount: chapter.scenes.reduce(
          (total, scene) => total + scene.wordCount,
          0,
        ),
        scenes: chapter.scenes.map((scene) => ({
          id: scene.id,
          sortKey: scene.sortKey,
          title: scene.title ?? "Escena sin título",
          wordCount: scene.wordCount,
          order: scene.order,
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
  order: number
}) {
  return api.post(`/chapters/${data.partId}/scenes`, { title: data.title, sortKey: data.sortKey, order: data.order })
}

export async function createProject(){

}

