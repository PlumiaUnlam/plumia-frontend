import Image from "next/image"
import Link from "next/link"
import { Plus, Search } from "lucide-react"

import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

type NavbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  onCreateProject?: () => void
}

export function Navbar({
  searchQuery,
  onSearchChange,
  onCreateProject,
}: Readonly<NavbarProps>) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Ir al inicio de PlumIA"
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="size-10 object-contain"
            priority
          />
          <span className="text-xl font-semibold tracking-tight">
            Plum<span className="text-primary">IA</span>
          </span>
        </Link>

        <UserMenu />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <InputGroup className="h-10 max-w-md bg-muted/30">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar por título o género"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Buscar proyectos"
          />
        </InputGroup>

        <Button onClick={onCreateProject} className="w-full sm:w-auto">
          <Plus />
          Crear proyecto
        </Button>
      </div>
    </header>
  )
}
