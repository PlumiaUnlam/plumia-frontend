
import { api } from "@/services/api.service";

export type ProjectResponse = {
  id: string
  userId: string
  title: string
  description: string
  genre: string
  genreRules: {
    tone: string
    audience: string
  }
  wordCountTarget: number
  status: string
  createdAt: string
  updatedAt: string
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


export async function getDashboardProjects() {
  return api.get<ProjectResponse[]>("/projects")
}

export async function getProject(projectId: string) {
  const selectedProject = await api.get<ProjectWithTreeResponse>(`/projects/${projectId}`)

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

export async function updateBook(id: string, data: { title: string }) {
  return api.patch(`/books/${id}`, data)
}

export async function deleteBook(id: string) {
  return api.delete(`/books/${id}`)
}

export async function updateChapter(id: string, data: { title: string }) {
  return api.patch(`/chapters/${id}`, data)
}

export async function deleteChapter(id: string) {
  return api.delete(`/chapters/${id}`)
}

export async function updateSection(id: string, data: { title: string }) {
  return api.patch(`/scenes/${id}`, data)
}

export async function deleteSection(id: string) {
  return api.delete(`/scenes/${id}`)
}

export type CreateProjectPayload = {
  title: string
  description?: string
  genre?: string
  genreRules?: Record<string, unknown>
  wordCountTarget?: number
}

export async function createProject(payload: CreateProjectPayload) {
  return api.post<ProjectResponse>("/projects", payload)
}

export async function getChapters() {
  return [] as Array<{
    id: string
    title: string
    wordCount: number
  }>
}
