"use client"
import Link from "next/link";
import { useRouter, usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import type { WritingMode } from "@/types/writing-mode";

type HeaderProps = {
  readonly mode?: WritingMode;
  readonly onModeChange?: (mode: WritingMode) => void;
};

const writingModes: readonly WritingMode[] = ["creation", "review", "zen"];

const modeLabels: Record<WritingMode, string> = {
  creation: "Creación",
  review: "Revisión",
  zen: "Zen",
};

export function Header({ mode, onModeChange }: HeaderProps) {
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
    <header className="relative z-10 flex h-12 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground">
      <div className="mr-1 flex items-center gap-2.5">
        <Image src="/dark-logo.png" alt="PlumIA Logo" width={35} height={30} />

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

      {mode && onModeChange && (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-px rounded-lg bg-white/10 p-0.5 text-[11px]">
          {writingModes.map((writingMode) => (
            <button
              key={writingMode}
              type="button"
              aria-pressed={mode === writingMode}
              onClick={() => onModeChange(writingMode)}
              className={`rounded-md px-3 py-1 font-medium transition-all duration-150 ${
                mode === writingMode
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/75 hover:text-white hover:bg-white/10"
              }`}
            >
              {modeLabels[writingMode]}
            </button>
          ))}
        </div>
      )}

      <div className="h-5 w-px bg-white/20" />
    </header>
  )
}
