import { ProjectShares } from "@/components/mobile/project-shares"

type ProjectSharesPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectSharesPage({
  params,
}: Readonly<ProjectSharesPageProps>) {
  const { projectId } = await params

  return <ProjectShares projectId={projectId} />
}
