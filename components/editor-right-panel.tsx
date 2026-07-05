"use client";

import { useMemo, useState } from "react";
import {
  BarChart2,
  FileText,
  GitBranch,
  MessageSquare,
  Search,
} from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";
import { getEntityCategoryStyle } from "@/lib/entity-category-style";
import { getEntities } from "@/services/entities.service";
import type { Entity } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";

type RightTab = "wiki" | "chat" | "stats";

type EditorRightPanelProps = {
  readonly projectId: string;
};

const tabs = [
  { id: "wiki" as const, label: "Wiki", icon: GitBranch },
  { id: "chat" as const, label: "Chat IA", icon: MessageSquare },
  { id: "stats" as const, label: "Stats", icon: BarChart2 },
];

export function EditorRightPanel({ projectId }: EditorRightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>("wiki");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: entities,
    error,
    isLoading,
  } = useSWR(
    projectId ? `/knowledge/entities?projectId=${projectId}` : null,
    () => getEntities(projectId),
  );

  const filteredEntities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentEntities = entities ?? [];

    if (!query) return currentEntities;

    return currentEntities.filter((entity) => {
      const category = TYPE_TO_CATEGORY[entity.type];
      return (
        entity.canonicalName.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        (entity.description ?? "").toLowerCase().includes(query) ||
        entity.aliases.some((alias) => alias.toLowerCase().includes(query))
      );
    });
  }, [entities, searchQuery]);

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      <div className="flex h-12 shrink-0 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 text-[11px] font-medium transition-colors ${
              activeTab === id
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "wiki" && (
        <WikiPanelContent
          entities={filteredEntities}
          loading={isLoading}
          error={error}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {activeTab === "chat" && <div className="min-h-0 flex-1" />}

      {activeTab === "stats" && <div className="min-h-0 flex-1" />}
    </aside>
  );
}

type WikiPanelContentProps = {
  readonly entities: readonly Entity[];
  readonly loading: boolean;
  readonly error: Error | undefined;
  readonly searchQuery: string;
  readonly onSearchChange: (value: string) => void;
};

function WikiPanelContent({
  entities,
  loading,
  error,
  searchQuery,
  onSearchChange,
}: WikiPanelContentProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
          <Search size={11} className="shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar entidades..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="size-7 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-3 animate-pulse rounded bg-muted" />
              </div>
            ))}

          {!loading && error && (
            <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              No se pudieron cargar las entidades.
            </div>
          )}

          {!loading && !error && entities.length === 0 && (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background p-4 text-center text-muted-foreground">
              <FileText className="size-8" />
              <p className="text-sm font-medium text-foreground">
                Sin entidades
              </p>
              <p className="text-xs">
                Crea entidades en la wiki para consultarlas desde el editor.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            entities.map((entity) => (
              <EditorWikiEntityCard key={entity.id} entity={entity} />
            ))}
        </div>

      </ScrollArea>
    </div>
  );
}

function EditorWikiEntityCard({ entity }: { readonly entity: Entity }) {
  const category = TYPE_TO_CATEGORY[entity.type];
  const categoryStyle = getEntityCategoryStyle(category);
  const imageSrc = `/api/storage/image/${entity.id}?v=${Date.parse(entity.updatedAt)}`;

  return (
    <article className="flex min-w-0 cursor-pointer gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/25 hover:bg-muted/50">
      <div className="size-9 shrink-0 overflow-hidden rounded-sm">
        {entity.imageUrl ? (
          <img
            src={imageSrc}
            alt={entity.canonicalName}
            width={72}
            height={72}
            className="size-full object-cover"
          />
        ) : (
          <EntityIconTile
            category={category}
            className="size-full rounded-sm"
            iconClassName="size-4"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-foreground">
            {entity.canonicalName}
          </p>
          <Badge
            className="h-auto shrink-0 border-transparent px-1.5 py-0 text-[9px]"
            style={{
              backgroundColor: `${categoryStyle.color}1A`,
              color: categoryStyle.color,
            }}
          >
            {categoryStyle.label}
          </Badge>
        </div>

        {entity.aliases.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {entity.aliases.slice(0, 2).map((alias) => (
              <Badge
                key={alias}
                variant="secondary"
                className="h-auto px-1.5 py-0 text-[9px]"
              >
                {alias}
              </Badge>
            ))}
          </div>
        )}

        <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
          {entity.description || "Sin descripción"}
        </p>
      </div>
    </article>
  );
}
