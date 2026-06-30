"use client"

import { useRouter, usePathname } from 'next/navigation'
import { FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split("/");
  const projectId =
    segments[1] === "projects" && segments[2] ? segments[2] : null;
  const isWorldbuildingPage =
    segments[1] === "projects" && segments[3] === "worldbuilding";

  return (
    <header className="z-10 flex h-12 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground">
      <div className="mr-1 flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-white/20">
          <FolderKanban className="size-4" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">
          Plum<span className="font-light opacity-75">IA</span>
        </span>

        {isWorldbuildingPage && projectId && (
          <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}/editor`)}>Volver al editor</Button>
        )}
      </div>

      <div className="h-5 w-px bg-white/20" />
    </header>
  )
}
