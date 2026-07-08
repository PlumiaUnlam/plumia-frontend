import { EditorLayout } from "@/components/editor-page"

type ProjectEditorPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectEditorPage({ params }: ProjectEditorPageProps) {
  const { projectId } = await params

  return <EditorLayout projectId={projectId} />
}
