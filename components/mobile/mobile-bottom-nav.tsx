"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  MOBILE_HOME_NAV,
  MOBILE_PROJECT_SECTIONS,
  getProjectHomeHref,
  getProjectSectionHref,
} from "@/lib/mobile-project"
import { cn } from "@/lib/utils"

/** Navegación inferior del proyecto en mobile. En escritorio no se muestra. */
export function MobileBottomNav({ projectId }: Readonly<{ projectId: string }>) {
  const pathname = usePathname()
  const homeHref = getProjectHomeHref(projectId)
  const items = [
    { href: homeHref, ...MOBILE_HOME_NAV, active: pathname === homeHref },
    ...MOBILE_PROJECT_SECTIONS.map((section) => {
      const href = getProjectSectionHref(projectId, section.segment)
      return {
        href,
        navLabel: section.navLabel,
        icon: section.icon,
        active: pathname === href || pathname.startsWith(`${href}/`),
      }
    }),
  ]

  return (
    <nav
      aria-label="Secciones del proyecto"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ href, navLabel, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-2xs font-medium transition-colors",
            active ? "text-primary-text" : "text-muted-foreground",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {navLabel}
        </Link>
      ))}
    </nav>
  )
}
