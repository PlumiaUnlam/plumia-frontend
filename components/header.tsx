"use client"
import Link from "next/link";
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button";
import Image from 'next/image';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split("/");
  const projectId =
    segments[1] === "projects" && segments[2] ? segments[2] : null;
  const isWorldbuildingPage =
    segments[1] === "projects" && segments[3] === "worldbuilding";
  const isStoryboardPage =
    segments[1] === "projects" && segments[3] === "storyboard";

  return (
    <header className="z-10 flex h-12 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground">
      <div className="mr-1 flex items-center gap-2.5">
        <Image
          src="/dark-logo.png"
          alt="PlumIA Logo"
          width={729}
          height={816}
          className="h-7 w-auto"
        />

        <Link
          href="/"
          className="text-l font-semibold tracking-tight"
        >
          <span className="text-white">Plum</span><span className="text-primary-foreground opacity-75">IA</span>
        </Link>

        {(isWorldbuildingPage || isStoryboardPage) && projectId && (
          <Button variant="ghost" onClick={() => router.push(`/projects/${projectId}/editor`)}>Volver al editor</Button>
        )}
      </div>

      <div className="h-5 w-px bg-white/20" />
    </header>
  )
}
