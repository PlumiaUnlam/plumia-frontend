"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Lock } from "lucide-react"
import useSWR from "swr"

import { Header } from "@/components/header"
import { DesktopOnlyNotice } from "@/components/mobile/desktop-only-notice"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"
import {
  DESKTOP_ONLY_FEATURES,
  DESKTOP_ONLY_QUERY_PARAM,
  MOBILE_PROJECT_SECTIONS,
  findDesktopOnlyFeature,
  getProjectHomeHref,
  getProjectSectionHref,
  type DesktopOnlyFeature,
} from "@/lib/mobile-project"
import { getProject } from "@/services/project.service"

/** Pantalla de entrada al proyecto en mobile: menú de secciones + funciones solo PC. */
export function ProjectHub({ projectId }: Readonly<{ projectId: string }>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading, firebaseUser } = useAuth()
  const requestedFeature = findDesktopOnlyFeature(
    searchParams.get(DESKTOP_ONLY_QUERY_PARAM),
  )
  const [openedFeature, setOpenedFeature] = useState<DesktopOnlyFeature | null>(
    null,
  )
  const feature = openedFeature ?? requestedFeature
  const { data: project, error } = useSWR(
    !loading && firebaseUser ? `/projects/${projectId}` : null,
    () => getProject(projectId),
  )

  const handleNoticeChange = (open: boolean) => {
    if (open) return
    setOpenedFeature(null)
    if (requestedFeature) router.replace(getProjectHomeHref(projectId))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-24 pt-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Proyecto</p>
          {project ? (
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {project.projectTitle}
            </h1>
          ) : (
            <Skeleton className="mt-1 h-8 w-2/3" />
          )}
          {error ? (
            <p role="alert" className="mt-1 text-sm text-destructive">
              No se pudo cargar el proyecto.
            </p>
          ) : null}
        </div>

        <section aria-label="Secciones disponibles" className="space-y-3">
          {MOBILE_PROJECT_SECTIONS.map(
            ({ segment, label, description, icon: Icon }) => (
              <Link
                key={segment}
                href={getProjectSectionHref(projectId, segment)}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="flex-row items-center gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">
                      {label}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Card>
              </Link>
            ),
          )}
        </section>

        <section aria-label="Solo en computadora" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Solo en computadora
          </h2>
          {DESKTOP_ONLY_FEATURES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenedFeature(item)}
              className="flex w-full items-center gap-4 rounded-xl border border-dashed border-border p-4 text-left text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="block truncate text-xs">{item.description}</span>
              </span>
              <Lock className="size-4 shrink-0" aria-hidden />
            </button>
          ))}
        </section>
      </main>

      <DesktopOnlyNotice
        open={feature !== null}
        onOpenChange={handleNoticeChange}
        featureLabel={feature?.label}
      />
    </div>
  )
}
