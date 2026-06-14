"use client"

import { useRouter, usePathname } from 'next/navigation'
import { FolderKanban, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="z-10 flex h-12 shrink-0 items-center gap-3 bg-primary px-4 text-primary-foreground">
      <div className="mr-1 flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-white/20">
          <FolderKanban className="size-4" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">
          Plum<span className="font-light opacity-75">IA</span>
        </span>

        {pathname === '/worldbuilding' && (
          <Button variant="ghost" onClick={() => router.push('/editor')}>Volver al editor</Button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        {user && (
          <>
            <span className="text-xs text-white/70">{user.email}</span>
            <Button variant="ghost" size="icon" className="size-7" onClick={handleLogout} aria-label="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  )
}