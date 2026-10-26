"use client"

import Link from "next/link"
import { ChevronRight, MessageSquare } from "lucide-react"
import useSWR from "swr"

import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"
import { messageForApiError } from "@/helpers/api-errors"
import { getShareStatusLabel, permissionLabels } from "@/lib/share-labels"
import { getProject } from "@/services/project.service"
import { getBookShares, getReaderComments } from "@/services/sharing.service"
import type { ShareSummary } from "@/types/sharing"

type BookShares = { id: string; title: string; shares: ShareSummary[] }

async function loadProjectShares(projectId: string): Promise<BookShares[]> {
  const project = await getProject(projectId)
  return Promise.all(
    project.books.map(async (book) => ({
      id: book.id,
      title: book.title,
      shares: await getBookShares(book.id),
    })),
  )
}

/** Lo que ve la autora en mobile: sus versiones compartidas y cuántos comentarios tienen. */
export function ProjectShares({ projectId }: Readonly<{ projectId: string }>) {
  const { loading, firebaseUser } = useAuth()
  const { data, error, isLoading, mutate } = useSWR(
    !loading && firebaseUser ? `/projects/${projectId}/shares` : null,
    () => loadProjectShares(projectId),
  )
  const sharedBooks = (data ?? []).filter((book) => book.shares.length > 0)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col gap-5 px-4 pb-24 pt-5">
        <div>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Lectores y comentarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Abrí una versión compartida para leer lo que comentaron.
          </p>
        </div>

        {isLoading ? <SharesSkeleton /> : null}

        {error ? (
          <div role="alert" className="space-y-3 text-sm text-destructive">
            <p>{messageForApiError(error, "No se pudieron cargar las versiones compartidas.")}</p>
            <Button variant="outline" size="sm" onClick={() => void mutate()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {data !== undefined && sharedBooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 size-6" aria-hidden />
            <p className="font-medium text-foreground">
              Todavía no compartiste tu obra
            </p>
            <p>Podés compartirla desde una computadora.</p>
          </div>
        ) : null}

        {sharedBooks.map((book) => (
          <section key={book.id} className="space-y-2" aria-label={book.title}>
            <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {book.title}
            </h2>
            {book.shares.map((share) => (
              <ShareRow key={share.id} share={share} />
            ))}
          </section>
        ))}
      </main>
    </div>
  )
}

function ShareRow({ share }: Readonly<{ share: ShareSummary }>) {
  return (
    <Link
      href={`/shared/${share.slug}`}
      aria-label={`${share.status === "REVOKED" ? "Ver historial de la versión" : "Abrir versión"} compartida con ${share.invitedEmail}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="flex-row items-center gap-3 p-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {share.invitedEmail}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{permissionLabels[share.permission]}</span>
            <Badge variant={share.status === "ACCEPTED" ? "secondary" : "default"}>
              {getShareStatusLabel(share.status)}
            </Badge>
          </span>
        </span>
        {share.status === "ACCEPTED" ? <OpenCommentsBadge slug={share.slug} /> : null}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Card>
    </Link>
  )
}

/** Cantidad de comentarios pendientes; si no se puede leer, no muestra nada. */
function OpenCommentsBadge({ slug }: Readonly<{ slug: string }>) {
  const { data } = useSWR(`/reading/invitations/${slug}/comments`, () =>
    getReaderComments(slug),
  )
  if (!data) return null
  const open = data.filter((comment) => comment.status === "OPEN").length
  return (
    <span
      className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary-text"
      aria-label={`${open} comentarios pendientes`}
    >
      <MessageSquare className="size-3.5" aria-hidden />
      {open}
    </span>
  )
}

function SharesSkeleton() {
  return (
    <div className="space-y-2" aria-label="Cargando versiones compartidas">
      {[0, 1].map((index) => (
        <Skeleton key={index} className="h-[4.5rem] w-full rounded-xl" />
      ))}
    </div>
  )
}
