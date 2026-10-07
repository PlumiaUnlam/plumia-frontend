import { SharedReader } from "@/components/sharing/shared-reader"

type SharedPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function SharedPage({
  params,
  searchParams,
}: Readonly<SharedPageProps>) {
  const { slug } = await params
  const tokenValue = (await searchParams).token
  const initialToken = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue

  return <SharedReader slug={slug} initialToken={initialToken} />
}
