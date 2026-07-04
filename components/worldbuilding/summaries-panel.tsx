"use client";

import { useMemo, useState } from "react";
import { Album, FileText, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export type SummaryChapter = {
  id: string;
  title: string;
  wordCount: number;
};

type SummariesPanelProps = {
  chapters: SummaryChapter[];
  loading: boolean;
  error?: Error;
};

export function SummariesPanel({
  chapters,
  loading,
  error,
}: SummariesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );

  const filteredChapters = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return chapters;
    }

    return chapters.filter((chapter) =>
      chapter.title.toLowerCase().includes(normalizedQuery),
    );
  }, [chapters, searchQuery]);

  const toggleChapter = (chapterId: string, checked: boolean) => {
    setSelectedChapterId(checked ? chapterId : null);
  };

  const hasNoSearchResults =
    !loading && !error && chapters.length > 0 && filteredChapters.length === 0;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/30">
        <div className="border-b border-border bg-card/50 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar capítulos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 border-b border-border bg-card/50 p-3">
          <div className="flex items-center gap-1">
            <Album size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">
              SELECCIONAR CAPÍTULOS
            </p>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 p-3">
          <ItemGroup className="min-w-0">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Item
                    key={index}
                    variant="outline"
                    size="sm"
                    className="cursor-default"
                  >
                    <ItemMedia variant="icon">
                      <Skeleton className="size-4 rounded-[4px]" />
                    </ItemMedia>
                    <ItemContent>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </ItemContent>
                  </Item>
                ))
              : filteredChapters.map((chapter) => {
                  const isSelected = selectedChapterId === chapter.id;

                  return (
                    <Item
                      key={chapter.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedChapterId(chapter.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedChapterId(chapter.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "bg-white hover:bg-muted/50"
                      }`}
                    >
                      <ItemMedia variant="icon">
                        <Checkbox
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={(checked) =>
                            toggleChapter(chapter.id, checked === true)
                          }
                        />
                      </ItemMedia>

                      <ItemContent className="min-w-0">
                        <ItemTitle className="max-w-full">
                          {chapter.title}
                        </ItemTitle>
                        <ItemDescription>
                          {chapter.wordCount.toLocaleString()} palabras
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  );
                })}

            {!loading && error && (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No se pudieron cargar los capítulos.
              </div>
            )}

            {!loading && !error && chapters.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No hay capítulos disponibles.
              </div>
            )}

            {hasNoSearchResults && (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No se encontraron capítulos.
              </div>
            )}
          </ItemGroup>
        </ScrollArea>

        <div className="border-t border-border bg-card/50 p-4">
          <Button className="w-full" disabled={!selectedChapterId}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generar resumen
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center text-primary opacity-70 gap-2 bg-muted/30 p-12">
        <FileText size={48} />
        <h2 className="text-lg font-semibold">Selecciona un capítulo</h2>
        <p>
          Haz click en cualquier capítulo de la lista para generar un resumen
        </p>
      </main>
    </div>
  );
}
