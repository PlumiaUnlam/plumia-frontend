import { Worldbuilding } from "@/components/worldbuilding/worldbuilding"

type ProjectWorldbuildingPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectWorldbuildingPage({
  params,
}: ProjectWorldbuildingPageProps) {
  const { projectId } = await params

  return <Worldbuilding projectId={projectId} />
}
