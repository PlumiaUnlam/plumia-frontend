
import { projectMock } from "@/mocks/projects.mock";

export async function getProjects() {
  return projectMock;
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