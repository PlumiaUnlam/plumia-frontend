import { EditorLayout } from "@/components/editor/editor-page"

type ProjectEditorPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectEditorPage({ params }: Readonly<ProjectEditorPageProps>) {
  const { projectId } = await params

  return <EditorLayout projectId={projectId} />
}
