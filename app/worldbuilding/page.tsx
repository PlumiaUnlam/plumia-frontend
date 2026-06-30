import { redirect } from "next/navigation"

type WorldbuildingPageProps = {
  searchParams: Promise<{
    projectId?: string | string[]
  }>
}

export default async function WorldbuildingPage({
  searchParams,
}: WorldbuildingPageProps) {
  const { projectId } = await searchParams
  const selectedProjectId = Array.isArray(projectId) ? projectId[0] : projectId

  if (!selectedProjectId) {
    redirect("/dashboard")
  }

  redirect(`/projects/${encodeURIComponent(selectedProjectId)}/worldbuilding`)
}
