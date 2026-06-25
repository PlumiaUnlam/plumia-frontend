"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, FileText } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    getDashboardProjects,
    type ProjectResponse,
} from "@/services/project.service";

function formatWordCount(value: number) {
    return new Intl.NumberFormat("es-ES").format(value);
}

function formatLabel(value: string) {
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function DashboardPage() {
    const [projects, setProjects] = useState<ProjectResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        getDashboardProjects()
            .then((data) => {
                if (!isMounted) {
                    return;
                }

                setProjects(data);
                setErrorMessage(null);
            })
            .catch((error) => {
                console.error("Error loading projects:", error);
                if (!isMounted) {
                    return;
                }

                setErrorMessage("No se pudo cargar la lista desde la API, mostrando datos de ejemplo.");
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredProjects = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        if (!normalizedQuery) {
            return projects;
        }

        return projects.filter((project) => {
            const searchableText = [
                project.title,
                project.genre,
                project.description,
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(normalizedQuery);
        });
    }, [projects, searchQuery]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

            <main className="container mx-auto px-4 py-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Mis proyectos
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {filteredProjects.length} proyectos
                        </p>
                    </div>
                </div>

                {errorMessage ? (
                    <p className="mb-4 text-sm text-amber-600">{errorMessage}</p>
                ) : null}

                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Card key={index} className="h-full">
                                <CardHeader>
                                    <div className="h-4 w-24 rounded bg-muted" />
                                    <div className="h-3 w-full rounded bg-muted/80" />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="h-3 w-full rounded bg-muted/70" />
                                    <div className="h-3 w-2/3 rounded bg-muted/70" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No se encontraron proyectos para esta búsqueda.
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {filteredProjects.map((project) => (
                            <Card key={project.id} className="flex h-full flex-col">
                                <CardHeader className="gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle className="line-clamp-2">{project.title}</CardTitle>
                                            <CardDescription className="mt-1 line-clamp-2">
                                                {project.description}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="secondary">{project.status}</Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge>{project.genre}</Badge>
                                        <Badge variant="outline">
                                            {formatLabel(project.genreRules.tone)}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        <span>{formatWordCount(project.wordCountTarget)} palabras objetivo</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Clock3 className="h-4 w-4" />
                                        <span>
                                            Actualizado {" "}
                                            {new Date(project.updatedAt).toLocaleDateString("es-ES", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>Audiencia: {formatLabel(project.genreRules.audience)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
