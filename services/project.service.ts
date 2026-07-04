
import { projectMock } from "@/mocks/projects.mock";
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

export async function getChapters() {
  /*obtener chapters */
  return projectMock.flatMap((project) => project.chapters).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    wordCount: chapter.wordCount
  }));
}

export async function getChapters() {
  /*obtener chapters */
  return projectMock.flatMap((project) => project.parts.flatMap((part) => part.chapters)).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    wordCount: chapter.wordCount
  }));
}

export async function createProject(title: string) {
  const newProject = {
    id: String(projectMock.length + 1),
    title,
    subtitle: "Nuevo borrador",
    chapters: [],
  };

  projectMock.push(newProject);

  return newProject;
}

export async function createChapter(data: {
  title: string
  partId: string
  }) {
  const response = await fetch("/api/v1/projects/", {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
  })

  if (!response.ok) {
      throw new Error("Error creando capítulo")
  }

  return response.json()
  }

async function createSection(data: {
title: string
partId: string
}) {
const response = await fetch("/api/sections", {
    method: "POST",
    headers: {
    "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
})

if (!response.ok) {
    throw new Error("Error creando sección")
}

return response.json()
}
