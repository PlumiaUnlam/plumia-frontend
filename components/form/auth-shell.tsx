import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AuthShellProps = Readonly<{
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}>

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-background via-background to-secondary/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 top-12 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-secondary blur-3xl"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4 md:p-6">
        <Link
          href="/"
          className="group mx-auto flex items-center gap-3 rounded-xl px-2 py-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Ir al inicio de PlumIA"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-foreground/10 transition-transform group-hover:-translate-y-0.5">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="size-9 object-contain"
              priority
            />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">
              Plum<span className="text-primary">IA</span>
            </span>
            <span className="block text-xs text-muted-foreground">
              Tu espacio de escritura
            </span>
          </span>
        </Link>

        <Card className="rounded-2xl shadow-xl shadow-primary/10">
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl md:text-3xl">{title}</CardTitle>
            <CardDescription className="leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-center p-4 text-center text-xs text-muted-foreground">
            {footer}
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Escribí, organizá y conectá cada parte de tu historia.
        </p>
      </div>
    </main>
  )
}
