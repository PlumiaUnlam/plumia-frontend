import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav"

type ProjectLayoutProps = {
  children: React.ReactNode
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectLayout({
  children,
  params,
}: Readonly<ProjectLayoutProps>) {
  const { projectId } = await params

  return (
    <>
      {children}
      <MobileBottomNav projectId={projectId} />
    </>
  )
}
