import { Storyboard } from "@/components/storyboard/storyboard"

type ProjectStoryboardPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectStoryboardPage({
  params,
}: ProjectStoryboardPageProps) {
  const { projectId } = await params

  return <Storyboard projectId={projectId} />
}
