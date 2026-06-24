
import { projectMock } from "@/mocks/projects.mock";



export async function getProjects() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0MjdkNTMwLTI0NmUtNGM0NS04Zjk4LTRjNTc0N2Y0ZWRkYjIiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ.rIkVGRoK511VSPXVUsxyq_pJoaYG327sEtp8VSkiOis";

  const response = await fetch("http://localhost:3000/projects/", {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });

  if (!response.ok) {
    const errorText = await response.text()

    throw new Error(
      `Error Get Libros (${response.status}): ${errorText}`
    )
  }

  return response.json()
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
    parts: [],
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