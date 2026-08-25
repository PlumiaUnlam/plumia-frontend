import Link from "next/link";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";
import { Input } from "./ui/input";
import Image from "next/image";

type NavbarProps = {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onCreateProject?: () => void;
};

export function Navbar({ searchQuery, onSearchChange, onCreateProject }: NavbarProps) {
    return (
        <header className="border-b bg-white">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <div className="flex items-center gap-1">
                    <Image
                        src="/logo.png"
                        alt="PlumIA Logo"
                        width={40}
                        height={40}
                        className="h-10 w-auto object-contain"
                    />
                    <Link
                        href="/"
                        className="text-xl font-semibold tracking-tight"
                    >
                        Plum<span className="text-primary">IA</span>
                    </Link>

                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar className="cursor-pointer">
                                <AvatarFallback>AP</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>Profile</DropdownMenuItem>
                            <DropdownMenuItem>Settings</DropdownMenuItem>
                            <DropdownMenuItem>Logout</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        placeholder="Buscar por título o género"
                        className="pl-9"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                    />
                </div>

                <Button onClick={onCreateProject}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear proyecto
                </Button>
            </div>
        </header>
    );
}
