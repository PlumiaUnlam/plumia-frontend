import { ProjectEntry } from "@/components/mobile/project-entry"

type ProjectPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectPage({ params }: Readonly<ProjectPageProps>) {
  const { projectId } = await params

  return <ProjectEntry projectId={projectId} />
}
