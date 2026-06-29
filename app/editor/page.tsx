import { redirect } from "next/navigation"

type EditorPageProps = {
  searchParams: Promise<{
    projectId?: string | string[]
  }>
}

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const { projectId } = await searchParams
  const selectedProjectId = Array.isArray(projectId) ? projectId[0] : projectId

  if (!selectedProjectId) {
    redirect("/dashboard")
  }

  redirect(`/projects/${encodeURIComponent(selectedProjectId)}/editor`)
}
