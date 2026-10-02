import { PublicReadingPage } from "@/components/reading/public-reading-page"

export default async function SharedReadingRoute({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params
  return <PublicReadingPage slug={slug} />
}
