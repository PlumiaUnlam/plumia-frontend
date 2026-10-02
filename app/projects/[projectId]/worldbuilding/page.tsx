import { Suspense } from "react"

import { Worldbuilding } from "@/components/worldbuilding/worldbuilding"

type ProjectWorldbuildingPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectWorldbuildingPage({
  params,
}: Readonly<ProjectWorldbuildingPageProps>) {
  const { projectId } = await params

  return (
    <Suspense>
      <Worldbuilding projectId={projectId} />
    </Suspense>
  )
}
