"use client"
import Link from "next/link";
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from 'next/image';
import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  Check,
  ChevronDown,
  Download,
  Earth,
  Layers3,
  Share2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WritingMode } from "@/types/writing-mode";

type HeaderProps = {
  readonly mode?: WritingMode;
  readonly onModeChange?: (mode: WritingMode) => void;
  readonly onShareClick?: () => void;
  readonly onExportClick?: () => void;
};

const modeLabels: Record<WritingMode, string> = {
  creation: "Creación",
  review: "Revisión",
  zen: "Zen",
};

export function Header({ mode, onModeChange, onShareClick, onExportClick }: HeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = pathname.split("/");
  const projectId =
    segments[1] === "projects" && segments[2] ? segments[2] : null;
  const isStatisticsPage =
    segments[1] === "projects" && segments[3] === "statistics";

  return (
    <header
      className={`flex h-12 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground ${
        isStatisticsPage ? "sticky top-0 z-40" : "relative z-10"
      }`}
    >
      <div className="mr-1 flex items-center gap-1">
        {projectId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  size="icon-sm"
                  variant="ghost"
                  className="-ml-3 -mr-2 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/dashboard" aria-label="Volver al dashboard">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Volver al dashboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Image
          src="/dark-logo.png"
          alt="PlumIA Logo"
          width={729}
          height={816}
          className="mr-1.5 h-7 w-auto"
        />

        <Link
          href="/"
          className="text-l font-semibold tracking-tight"
        >
          <span className="text-white">Plum</span><span className="text-primary-foreground opacity-75">IA</span>
        </Link>
      </div>

      {projectId && (
        <ProjectNavigation
          projectId={projectId}
          pathname={pathname}
          worldbuildingTab={searchParams.get("tab")}
          storyboardView={searchParams.get("view")}
          mode={mode}
          onModeChange={onModeChange}
        />
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="h-5 w-px bg-white/20" />
        {onShareClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Compartir obra"
                  onClick={onShareClick}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Compartir obra</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {onExportClick && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Exportar obra"
                  onClick={onExportClick}
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Exportar obra</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <UserMenu inverted />
      </div>
    </header>
  )
}

const projectSections = [
  { segment: "editor", label: "Editor", icon: BookOpenText },
  { segment: "worldbuilding", label: "Worldbuilding", icon: Earth },
  { segment: "storyboard", label: "Tablero", icon: Layers3 },
  { segment: "statistics", label: "Estadísticas", icon: BarChart3 },
] as const;

function ProjectNavigation({
  projectId,
  pathname,
  mode,
  onModeChange,
  worldbuildingTab,
  storyboardView,
}: Readonly<{
  projectId: string;
  pathname: string;
  mode?: WritingMode;
  onModeChange?: (mode: WritingMode) => void;
  worldbuildingTab: string | null;
  storyboardView: string | null;
}>) {
  return (
    <nav
      aria-label="Secciones del proyecto"
      className="absolute left-1/2 flex h-8 -translate-x-1/2 items-center gap-0.5 rounded-lg bg-black/10 p-0.5"
    >
      {projectSections.map(({ segment, label, icon: Icon }) => {
        const href = `/projects/${encodeURIComponent(projectId)}/${segment}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const itemClassName = `flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors xl:px-2.5 ${
          isActive
            ? "bg-white text-primary shadow-sm"
            : "text-white/75 hover:bg-white/10 hover:text-white"
        }`;

        if (segment === "editor" && mode && onModeChange) {
          return (
            <DropdownMenu key={segment}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={itemClassName}
                  aria-label={`Editor, modo ${modeLabels[mode]}`}
                  aria-current="page"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>Editor · {modeLabels[mode]}</span>
                  <ChevronDown className="size-3 shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-44">
                <DropdownMenuLabel>Modo del editor</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={mode}
                  onValueChange={(value) => onModeChange(value as WritingMode)}
                >
                  <DropdownMenuRadioItem value="creation">Creación</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="review">Revisión</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="zen">Zen</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        if (segment === "worldbuilding") {
          const views = [
            { value: "wiki", label: "Entidades" },
            { value: "relationships", label: "Relaciones" },
            { value: "timeline", label: "Línea temporal" },
            { value: "summaries", label: "Resúmenes" },
          ] as const;
          const activeView = views.find((view) => view.value === worldbuildingTab) ?? views[0];

          return (
            <DropdownMenu key={segment}>
              <DropdownMenuTrigger asChild>
                <button type="button" className={itemClassName} aria-label={`Worldbuilding, ${activeView.label}`}>
                  <Icon className="size-3.5 shrink-0" />
                  <span className="hidden xl:inline">
                    {isActive ? `Worldbuilding · ${activeView.label}` : label}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-48">
                <DropdownMenuLabel>Worldbuilding</DropdownMenuLabel>
                {views.map((view) => (
                  <DropdownMenuItem key={view.value} asChild>
                    <Link
                      href={`${href}?tab=${view.value}`}
                      className="flex justify-between"
                    >
                      {view.label}
                      {isActive && activeView.value === view.value ? <Check className="size-4" /> : null}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        if (segment === "storyboard") {
          const views = [
            { value: "kanban", label: "Kanban" },
            { value: "matrix", label: "Matriz" },
          ] as const;
          const activeView = views.find((view) => view.value === storyboardView) ?? views[0];

          return (
            <DropdownMenu key={segment}>
              <DropdownMenuTrigger asChild>
                <button type="button" className={itemClassName} aria-label={`Tablero, ${activeView.label}`}>
                  <Icon className="size-3.5 shrink-0" />
                  <span className="hidden xl:inline">
                    {isActive ? `Tablero · ${activeView.label}` : label}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-40">
                <DropdownMenuLabel>Vista del tablero</DropdownMenuLabel>
                {views.map((view) => (
                  <DropdownMenuItem key={view.value} asChild>
                    <Link
                      href={`${href}?view=${view.value}`}
                      className="flex justify-between"
                    >
                      {view.label}
                      {isActive && activeView.value === view.value ? <Check className="size-4" /> : null}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Link
            key={segment}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={itemClassName}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="hidden xl:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
