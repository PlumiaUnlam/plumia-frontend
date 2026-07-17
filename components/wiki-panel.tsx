"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Check, FileText, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";
import { getEntityCategoryStyle } from "@/lib/entity-category-style";
import type { Entity } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";
import type { EntityProposal } from "@/types/entity-proposal";

type WikiPanelProps = {
  readonly entities: readonly Entity[];
  readonly proposals: readonly EntityProposal[];
  readonly loading: boolean;
  readonly proposalsLoading: boolean;
  readonly entitiesError: Error | undefined;
  readonly proposalsError: Error | undefined;
  readonly acceptingProposalId: string | null;
  readonly onAcceptProposal: (proposalId: string) => Promise<void>;
  readonly actionError: string | null;
};

export function WikiPanel({
  entities,
  proposals,
  loading,
  proposalsLoading,
  entitiesError,
  proposalsError,
  acceptingProposalId,
  onAcceptProposal,
  actionError,
}: WikiPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentProposals = proposals ?? [];

    if (!query) return currentProposals;

    return currentProposals.filter((proposal) => {
      const category = TYPE_TO_CATEGORY[proposal.proposedData.type];
      return (
        proposal.proposedData.canonicalName.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        (proposal.proposedData.description ?? "").toLowerCase().includes(query) ||
        proposal.proposedData.aliases.some((alias) =>
          alias.toLowerCase().includes(query),
        ) ||
        (proposal.sceneTitle ?? "").toLowerCase().includes(query) ||
        (proposal.chapterTitle ?? "").toLowerCase().includes(query)
      );
    });
  }, [proposals, searchQuery]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
          <Search size={11} className="shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar entidades..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {actionError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {actionError}
            </div>
          )}

          <WikiSectionTitle
            icon={FileText}
            label="Entidades confirmadas"
            count={filteredEntities.length}
          />
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
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
            ))
          ) : entitiesError ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              No se pudieron cargar las entidades.
            </div>
          ) : filteredEntities.length === 0 ? (
            <EmptyWikiState
              title="Sin entidades"
              description="Crea entidades en la wiki para consultarlas desde el editor."
            />
          ) : (
            filteredEntities.map((entity) => (
              <EditorWikiEntityCard key={entity.id} entity={entity} />
            ))
          )}

          <WikiSectionTitle
            icon={Sparkles}
            label="Propuestas detectadas"
            count={filteredProposals.length}
          />
          {proposalsLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="size-7 animate-pulse rounded-lg bg-amber-500/10" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-amber-500/10" />
                </div>
                <div className="h-3 animate-pulse rounded bg-amber-500/10" />
              </div>
            ))
          ) : proposalsError ? (
            <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              No se pudieron cargar las propuestas.
            </div>
          ) : filteredProposals.length === 0 ? (
            <EmptyWikiState
              title="Sin propuestas"
              description="Cuando el modelo detecte entidades nuevas, aparecerán aquí para revisión."
            />
          ) : (
            filteredProposals.map((proposal) => (
              <EditorWikiProposalCard
                key={proposal.id}
                proposal={proposal}
                accepting={acceptingProposalId === proposal.id}
                onAccept={() => void onAcceptProposal(proposal.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function WikiSectionTitle({
  icon: Icon,
  label,
  count,
}: {
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly label: string;
  readonly count: number;
}) {
  return (
    <div className="mt-1 flex items-center justify-between px-1 py-1">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon size={12} className="text-primary/80" />
        <span>{label}</span>
      </div>
      <Badge variant="outline" className="h-auto px-1.5 py-0 text-[9px]">
        {count}
      </Badge>
    </div>
  );
}

function EmptyWikiState({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background p-4 text-center text-muted-foreground">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs">{description}</p>
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

function EditorWikiProposalCard({
  proposal,
  accepting,
  onAccept,
}: {
  readonly proposal: EntityProposal;
  readonly accepting: boolean;
  readonly onAccept: () => void;
}) {
  const category = TYPE_TO_CATEGORY[proposal.proposedData.type];
  const categoryStyle = getEntityCategoryStyle(category);
  const aliases = proposal.proposedData.aliases.slice(0, 2);

  return (
    <article className="flex min-w-0 gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-amber-500/10 text-amber-600">
        <Sparkles className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-foreground">
            {proposal.proposedData.canonicalName}
          </p>
          <Badge
            className="h-auto shrink-0 border-transparent px-1.5 py-0 text-[9px]"
            style={{
              backgroundColor: `${categoryStyle.color}1A`,
              color: categoryStyle.color,
            }}
          >
            IA
          </Badge>
        </div>

        <div className="mb-1.5 flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className="h-auto border-amber-500/20 px-1.5 py-0 text-[9px] text-amber-700 dark:text-amber-400"
          >
            {categoryStyle.label}
          </Badge>
          {aliases.map((alias) => (
            <Badge
              key={alias}
              variant="secondary"
              className="h-auto px-1.5 py-0 text-[9px]"
            >
              {alias}
            </Badge>
          ))}
        </div>

        <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
          {proposal.proposedData.description || "Sin descripción"}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span>
            Escena: {proposal.sceneTitle ?? "Sin título"}
            {proposal.chapterTitle ? ` · ${proposal.chapterTitle}` : ""}
          </span>
          <span>·</span>
          <span>{Math.round((proposal.confidenceScore ?? 0) * 100)}%</span>
        </div>

        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="xs"
            className="h-7"
            variant="outline"
            onClick={onAccept}
            disabled={accepting}
          >
            <Check className="size-3.5" />
            {accepting ? "Aceptando..." : "Aceptar"}
          </Button>
        </div>
      </div>
    </article>
  );
}
