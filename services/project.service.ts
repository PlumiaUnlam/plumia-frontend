
import { projectMock } from "@/mocks/projects.mock";

export async function getProjects() {
  return projectMock;
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