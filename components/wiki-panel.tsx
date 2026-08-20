"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import { NewEntityModal } from "@/components/modal/new-entity-modal";
import { NewRelationModal } from "@/components/modal/new-relation-modal";
import { getEntityCategoryStyle } from "@/lib/entity-category-style";
import type { Entity } from "@/types/entity";
import type { CreateEntityInput, UpdateEntityInput } from "@/types/entity";
import { TYPE_TO_CATEGORY } from "@/types/entity";
import type { EntityProposal } from "@/types/entity-proposal";
import type { RelationshipProposal } from "@/types/relationship-proposal";
import type { UpdateRelationshipInput } from "@/types/relationship";
import { relationStyles } from "@/lib/relation-style";

type WikiPanelProps = {
  readonly entities: readonly Entity[];
  readonly proposals: readonly EntityProposal[];
  readonly relationshipProposals: readonly RelationshipProposal[];
  readonly loading: boolean;
  readonly proposalsLoading: boolean;
  readonly entitiesError: Error | undefined;
  readonly proposalsError: Error | undefined;
  readonly relationshipProposalsError: Error | undefined;
  readonly relationshipProposalsLoading: boolean;
  readonly primaryImageUrls: Readonly<Record<string, string>>;
  readonly acceptingProposalId: string | null;
  readonly rejectingProposalId: string | null;
  readonly onAcceptProposal: (
    proposalId: string,
    override?: CreateEntityInput | UpdateEntityInput,
  ) => Promise<void>;
  readonly onRejectProposal: (proposalId: string) => Promise<void>;
  readonly acceptingRelationshipProposalId: string | null;
  readonly rejectingRelationshipProposalId: string | null;
  readonly onAcceptRelationshipProposal: (
    proposalId: string,
    override?: UpdateRelationshipInput,
  ) => Promise<void>;
  readonly onRejectRelationshipProposal: (proposalId: string) => Promise<void>;
  readonly actionError: string | null;
};

type WikiSectionKey = "relationships" | "entities" | "proposals";

export function WikiPanel({
  entities,
  proposals,
  relationshipProposals,
  loading,
  proposalsLoading,
  entitiesError,
  proposalsError,
  relationshipProposalsError,
  relationshipProposalsLoading,
  primaryImageUrls,
  acceptingProposalId,
  rejectingProposalId,
  onAcceptProposal,
  onRejectProposal,
  acceptingRelationshipProposalId,
  rejectingRelationshipProposalId,
  onAcceptRelationshipProposal,
  onRejectRelationshipProposal,
  actionError,
}: WikiPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewingProposalId, setReviewingProposalId] = useState<string | null>(
    null,
  );
  const [editingEntityProposalId, setEditingEntityProposalId] = useState<
    string | null
  >(null);
  const [editingRelationshipProposalId, setEditingRelationshipProposalId] =
    useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<WikiSectionKey, boolean>
  >({
    relationships: true,
    entities: true,
    proposals: true,
  });

  const toggleSection = (section: WikiSectionKey) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

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
        (proposal.proposedData.description ?? "")
          .toLowerCase()
          .includes(query) ||
        proposal.proposedData.aliases.some((alias) =>
          alias.toLowerCase().includes(query),
        ) ||
        (proposal.sceneTitle ?? "").toLowerCase().includes(query) ||
        (proposal.chapterTitle ?? "").toLowerCase().includes(query)
      );
    });
  }, [proposals, searchQuery]);

  const updateProposalsByEntityId = useMemo(() => {
    const result = new Map<string, EntityProposal>();
    for (const proposal of proposals) {
      if (
        proposal.targetEntity &&
        proposal.proposedData.proposalKind === "ENTITY_UPDATE"
      ) {
        result.set(proposal.targetEntity.id, proposal);
      }
    }
    return result;
  }, [proposals]);

  const reviewingProposal =
    proposals.find((proposal) => proposal.id === reviewingProposalId) ?? null;
  const editingEntityProposal =
    proposals.find((proposal) => proposal.id === editingEntityProposalId) ??
    null;
  const editingRelationshipProposal =
    relationshipProposals.find(
      (proposal) => proposal.id === editingRelationshipProposalId,
    ) ?? null;

  const handleCloseReview = () => {
    if (acceptingProposalId || rejectingProposalId) {
      return;
    }
    setReviewingProposalId(null);
  };

  const handleEditEntitySubmit = async (
    data: CreateEntityInput | UpdateEntityInput,
  ) => {
    if (!editingEntityProposal) return;
    await onAcceptProposal(editingEntityProposal.id, data);
    setEditingEntityProposalId(null);
  };

  const handleEntityProposalEdit = (proposal: EntityProposal) => {
    if (
      proposal.targetEntity &&
      proposal.proposedData.proposalKind === "ENTITY_UPDATE"
    ) {
      setReviewingProposalId(proposal.id);
      return;
    }
    setEditingEntityProposalId(proposal.id);
  };

  const handleEditRelationshipSubmit = async (
    data: UpdateRelationshipInput,
  ) => {
    if (!editingRelationshipProposal) return;
    await onAcceptRelationshipProposal(editingRelationshipProposal.id, data);
    setEditingRelationshipProposalId(null);
  };

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border p-3">
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
          <Search size={11} className="shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar entidades..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="min-w-0 max-w-full space-y-2 overflow-x-hidden p-3">
          {actionError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {actionError}
            </div>
          )}

          <WikiSectionTitle
            icon={RefreshCw}
            label="Relaciones detectadas"
            count={relationshipProposals.length}
            expanded={expandedSections.relationships}
            onToggle={() => toggleSection("relationships")}
          />
          {expandedSections.relationships &&
            (relationshipProposalsLoading ? (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
                Revisando relaciones...
              </div>
            ) : relationshipProposalsError ? (
              <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
                No se pudieron cargar las propuestas de relaciones.
              </div>
            ) : relationshipProposals.length === 0 ? (
              <EmptyWikiState
                title="Sin relaciones pendientes"
                description="Las relaciones detectadas aparecerán aquí para revisión."
              />
            ) : (
              relationshipProposals.map((proposal) => (
                <RelationshipProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  accepting={acceptingRelationshipProposalId === proposal.id}
                  rejecting={rejectingRelationshipProposalId === proposal.id}
                  onAccept={() =>
                    void onAcceptRelationshipProposal(proposal.id)
                  }
                  onReject={() =>
                    void onRejectRelationshipProposal(proposal.id)
                  }
                  onEdit={() => setEditingRelationshipProposalId(proposal.id)}
                />
              ))
            ))}

          <WikiSectionTitle
            icon={FileText}
            label="Entidades confirmadas"
            count={filteredEntities.length}
            expanded={expandedSections.entities}
            onToggle={() => toggleSection("entities")}
          />
          {expandedSections.entities &&
            (loading ? (
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
                <EditorWikiEntityCard
                  key={entity.id}
                  entity={entity}
                  primaryImageUrl={primaryImageUrls[entity.id]}
                  updateProposal={
                    updateProposalsByEntityId.get(entity.id) ?? null
                  }
                  onReviewProposal={(proposalId) => {
                    const proposal = proposals.find(
                      (candidate) => candidate.id === proposalId,
                    );
                    if (proposal) handleEntityProposalEdit(proposal);
                  }}
                />
              ))
            ))}

          <WikiSectionTitle
            icon={Sparkles}
            label="Propuestas detectadas"
            count={filteredProposals.length}
            expanded={expandedSections.proposals}
            onToggle={() => toggleSection("proposals")}
          />
          {expandedSections.proposals &&
            (proposalsLoading ? (
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
                description="Cuando el modelo detecte entidades nuevas o detalles adicionales, aparecerán aquí para revisión."
              />
            ) : (
              filteredProposals.map((proposal) => (
                <EditorWikiProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  accepting={acceptingProposalId === proposal.id}
                  rejecting={rejectingProposalId === proposal.id}
                  onAccept={() => void onAcceptProposal(proposal.id)}
                  onReject={() => void onRejectProposal(proposal.id)}
                  onEdit={() => handleEntityProposalEdit(proposal)}
                />
              ))
            ))}
        </div>
      </ScrollArea>

      <EntityUpdateReviewDialog
        proposal={reviewingProposal}
        accepting={acceptingProposalId === reviewingProposal?.id}
        rejecting={rejectingProposalId === reviewingProposal?.id}
        onClose={handleCloseReview}
        onAccept={
          reviewingProposal
            ? () => void onAcceptProposal(reviewingProposal.id)
            : undefined
        }
        onReject={
          reviewingProposal
            ? () => void onRejectProposal(reviewingProposal.id)
            : undefined
        }
        onEdit={
          reviewingProposal
            ? () => setEditingEntityProposalId(reviewingProposal.id)
            : undefined
        }
      />

      <NewEntityModal
        show={!!editingEntityProposal}
        mode="proposal"
        initialValues={
          editingEntityProposal
            ? {
                canonicalName:
                  editingEntityProposal.targetEntity?.canonicalName ??
                  editingEntityProposal.proposedData.canonicalName,
                type:
                  editingEntityProposal.targetEntity?.type ??
                  editingEntityProposal.proposedData.type,
                description: combineEntityDescriptions(
                  editingEntityProposal.targetEntity?.description ?? null,
                  editingEntityProposal.proposedData.description,
                ),
                aliases: [
                  ...new Set([
                    ...(editingEntityProposal.targetEntity?.aliases ?? []),
                    ...editingEntityProposal.proposedData.aliases,
                  ]),
                ],
                attributes: {
                  ...(editingEntityProposal.targetEntity?.attributes ?? {}),
                  ...editingEntityProposal.proposedData.attributes,
                },
                imageUrl: editingEntityProposal.targetEntity?.id
                  ? null
                  : editingEntityProposal.proposedData.imageUrl,
              }
            : undefined
        }
        onClose={() => setEditingEntityProposalId(null)}
        onSubmit={handleEditEntitySubmit}
      />

      <NewRelationModal
        show={!!editingRelationshipProposal}
        mode="proposal"
        entities={entities}
        initialValues={
          editingRelationshipProposal
            ? {
                sourceEntityId: editingRelationshipProposal.source.id,
                targetEntityId: editingRelationshipProposal.target.id,
                sourceEntityName:
                  editingRelationshipProposal.source.canonicalName,
                targetEntityName:
                  editingRelationshipProposal.target.canonicalName,
                relationType: editingRelationshipProposal.relationType,
                intensity: Math.max(
                  1,
                  Math.round(editingRelationshipProposal.intensity * 5),
                ),
                description: editingRelationshipProposal.description,
              }
            : undefined
        }
        onClose={() => setEditingRelationshipProposalId(null)}
        onSubmit={handleEditRelationshipSubmit}
      />
    </div>
  );
}

function RelationshipProposalCard({
  proposal,
  accepting,
  rejecting,
  onAccept,
  onReject,
  onEdit,
}: {
  readonly proposal: RelationshipProposal;
  readonly accepting: boolean;
  readonly rejecting: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onEdit: () => void;
}) {
  const style = relationStyles[proposal.relationType];
  const RelationIcon = style.icon;
  const busy = accepting || rejecting;

  return (
    <div className="min-w-0 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
      <div className="flex min-w-0 items-start gap-2">
        <RelationIcon
          className="mt-0.5 size-4 shrink-0"
          style={{ color: style.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-semibold text-foreground">
            {proposal.source.canonicalName} → {proposal.target.canonicalName}
          </p>
          <p
            className="mt-1 text-[11px] font-medium"
            style={{ color: style.color }}
          >
            {style.label} · {Math.round(proposal.intensity * 5)} / 5
          </p>
          {proposal.description && (
            <p className="mt-2 break-words text-[11px] text-muted-foreground">
              {proposal.description}
            </p>
          )}
          {proposal.current && (
            <div className="mt-2 grid min-w-0 gap-1 rounded-md border border-blue-500/15 bg-background/50 p-2 text-[10px]">
              <p className="font-semibold text-muted-foreground">
                Actual vs. nuevo
              </p>
              <p className="break-words text-muted-foreground">
                Tipo: {relationStyles[proposal.current.relationType].label}{" "}
                -&gt; {style.label}
              </p>
              <p className="break-words text-muted-foreground">
                Intensidad: {Math.round(proposal.current.intensity * 5)} / 5
                -&gt; {Math.round(proposal.intensity * 5)} / 5
              </p>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">
                Descripcion actual:{" "}
                {proposal.current.description || "Sin descripcion"}
              </p>
            </div>
          )}
          {proposal.evidence.length > 0 && (
            <p className="mt-2 break-words text-[10px] italic text-muted-foreground">
              “{proposal.evidence[0]}”
            </p>
          )}
          {!proposal.canAccept && (
            <p className="mt-2 text-[10px] text-amber-700">
              Aceptá primero las entidades vinculadas para aprobar esta
              relación.
            </p>
          )}
          <div className="mt-3 flex w-full min-w-0 gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-7 min-w-0 flex-1 text-[11px]"
              disabled={busy}
              onClick={onReject}
            >
              <X className="size-3.5" />
              {rejecting ? "Rechazando..." : "Rechazar"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-7 min-w-0 flex-1 text-[11px]"
              disabled={busy}
              onClick={onEdit}
            >
              Editar
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-7 min-w-0 flex-1 text-[11px]"
              disabled={busy || !proposal.canAccept}
              onClick={onAccept}
            >
              <Check className="size-3.5" />
              {accepting ? "Aceptando..." : "Aceptar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WikiSectionTitle({
  icon: Icon,
  label,
  count,
  expanded,
  onToggle,
}: {
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly label: string;
  readonly count: number;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="mt-1 flex items-center justify-between gap-2 px-1 py-1">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown size={12} className="shrink-0 text-primary/80" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-primary/80" />
        )}
        <Icon size={12} className="shrink-0 text-primary/80" />
        <span className="truncate">{label}</span>
      </button>
      <Badge
        variant="outline"
        className="h-auto shrink-0 px-1.5 py-0 text-[9px]"
      >
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

function combineEntityDescriptions(
  current: string | null,
  suggested: string | null | undefined,
): string | null {
  const currentValue = current?.trim();
  const suggestedValue = suggested?.trim();

  if (!suggestedValue) return currentValue ?? null;
  if (!currentValue) return suggestedValue;

  const normalizedCurrent = currentValue.toLowerCase();
  const normalizedSuggested = suggestedValue.toLowerCase();
  if (normalizedCurrent.includes(normalizedSuggested)) {
    return currentValue;
  }
  if (normalizedSuggested.includes(normalizedCurrent)) {
    return suggestedValue;
  }

  return currentValue + "\n\n" + suggestedValue;
}

function EditorWikiEntityCard({
  entity,
  primaryImageUrl,
  updateProposal,
  onReviewProposal,
}: {
  readonly entity: Entity;
  readonly primaryImageUrl: string | undefined;
  readonly updateProposal: EntityProposal | null;
  readonly onReviewProposal: (proposalId: string) => void;
}) {
  const category = TYPE_TO_CATEGORY[entity.type];
  const categoryStyle = getEntityCategoryStyle(category);
  const imageSrc = `/api/storage/image/${entity.id}?v=${Date.parse(entity.updatedAt)}`;
  const resolvedImageSrc = primaryImageUrl ?? entity.imageUrl ?? imageSrc;

  return (
    <article className="flex w-full min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-primary/25 hover:bg-muted/50">
      <div className="size-9 shrink-0 overflow-hidden rounded-sm">
        {primaryImageUrl || entity.imageUrl ? (
          <EntityImage
            src={resolvedImageSrc}
            alt={entity.canonicalName}
            width={72}
            height={72}
            className="size-full object-cover"
            category={category}
            iconClassName="size-4"
          />
        ) : (
          <EntityIconTile
            category={category}
            className="size-full rounded-sm"
            iconClassName="size-4"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="mb-1.5 flex min-w-0 flex-wrap items-start gap-1.5">
          <p className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-snug text-foreground">
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
          {updateProposal && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-6 shrink-0 border-amber-500/30 px-2 text-[9px] text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => onReviewProposal(updateProposal.id)}
            >
              <RefreshCw className="size-3" />
              Actualizar
            </Button>
          )}
        </div>

        {entity.aliases.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {entity.aliases.slice(0, 2).map((alias) => (
              <Badge
                key={alias}
                variant="secondary"
                className="h-auto max-w-full break-all px-1.5 py-0 text-[9px]"
              >
                {alias}
              </Badge>
            ))}
          </div>
        )}

        <p className="line-clamp-2 break-words text-[10px] leading-relaxed text-muted-foreground">
          {entity.description || "Sin descripcion"}
        </p>
      </div>
    </article>
  );
}

function EditorWikiProposalCard({
  proposal,
  accepting,
  rejecting,
  onAccept,
  onReject,
  onEdit,
}: {
  readonly proposal: EntityProposal;
  readonly accepting: boolean;
  readonly rejecting: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onEdit: () => void;
}) {
  const category = TYPE_TO_CATEGORY[proposal.proposedData.type];
  const categoryStyle = getEntityCategoryStyle(category);
  const aliases = proposal.proposedData.aliases.slice(0, 2);
  const isUpdate = proposal.proposedData.proposalKind === "ENTITY_UPDATE";

  return (
    <article className="flex w-full min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-amber-500/10 text-amber-600">
        {isUpdate ? (
          <RefreshCw className="size-4" />
        ) : (
          <Sparkles className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="mb-1.5 flex min-w-0 flex-wrap items-start gap-1.5">
          <p className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-snug text-foreground">
            {proposal.proposedData.canonicalName}
          </p>
          <Badge
            className="h-auto shrink-0 border-transparent px-1.5 py-0 text-[9px]"
            style={{
              backgroundColor: `${categoryStyle.color}1A`,
              color: categoryStyle.color,
            }}
          >
            {isUpdate ? "Actualizar" : "IA"}
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
              className="h-auto max-w-full break-all px-1.5 py-0 text-[9px]"
            >
              {alias}
            </Badge>
          ))}
        </div>

        <p className="line-clamp-2 break-words text-[10px] leading-relaxed text-muted-foreground">
          {proposal.proposedData.description ||
            (isUpdate
              ? "Se detectaron detalles nuevos para esta entidad."
              : "Sin descripcion")}
        </p>

        {isUpdate && proposal.targetEntity && (
          <div className="mt-2 grid min-w-0 gap-1 rounded-md border border-amber-500/20 bg-background/50 p-2 text-[10px]">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              Informacion actual y nueva
            </p>
            <p className="break-words text-muted-foreground">
              Descripcion actual:{" "}
              {proposal.targetEntity.description || "Sin descripcion"}
            </p>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">
              Informacion nueva:{" "}
              {proposal.proposedData.description || "Sin descripcion nueva"}
            </p>
            <p className="break-words text-muted-foreground">
              Alias actuales:{" "}
              {proposal.targetEntity.aliases.join(", ") || "Sin alias"}
            </p>
            <p className="break-words text-muted-foreground">
              Alias nuevos:{" "}
              {proposal.proposedData.aliases.join(", ") || "Sin alias nuevos"}
            </p>
          </div>
        )}

        <div className="mt-2 flex min-w-0 max-w-full flex-col gap-1 text-[10px] text-muted-foreground">
          <span className="break-words">
            Escena: {proposal.sceneTitle ?? "Sin titulo"}
            {proposal.chapterTitle ? ` · ${proposal.chapterTitle}` : ""}
          </span>
          <span className="shrink-0">
            Confianza: {Math.round((proposal.confidenceScore ?? 0) * 100)}%
          </span>
        </div>

        <div className="mt-2 flex w-full min-w-0 gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="h-7 flex-1"
            onClick={onReject}
            disabled={rejecting || accepting}
          >
            <X className="size-3.5" />
            {rejecting ? "Rechazando..." : "Rechazar"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="h-7 flex-1"
            onClick={onEdit}
            disabled={rejecting || accepting}
          >
            Editar
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="h-7 flex-1"
            onClick={onAccept}
            disabled={accepting || rejecting}
          >
            <Check className="size-3.5" />
            {accepting ? "Aceptando..." : isUpdate ? "Aceptar" : "Aceptar"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function EntityUpdateReviewDialog({
  proposal,
  accepting,
  rejecting,
  onClose,
  onAccept,
  onReject,
  onEdit,
}: {
  readonly proposal: EntityProposal | null;
  readonly accepting: boolean;
  readonly rejecting: boolean;
  readonly onClose: () => void;
  readonly onAccept?: () => void;
  readonly onReject?: () => void;
  readonly onEdit?: () => void;
}) {
  const currentEntity = proposal?.targetEntity ?? null;
  const suggestedAliases = proposal?.proposedData.aliases ?? [];
  const suggestedAttributes = Object.entries(
    proposal?.proposedData.attributes ?? {},
  );

  return (
    <Dialog open={!!proposal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Actualizar entidad</DialogTitle>
          <DialogDescription>
            Revisá la información nueva detectada antes de sumarla a la ficha.
          </DialogDescription>
        </DialogHeader>

        {proposal && currentEntity && (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Ficha actual
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Nombre
                  </p>
                  <p>{currentEntity.canonicalName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Descripción
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {currentEntity.description || "Sin descripción"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Alias
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {currentEntity.aliases.length > 0 ? (
                      currentEntity.aliases.map((alias) => (
                        <Badge
                          key={alias}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {alias}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin alias
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Sugerencia detectada
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Nueva descripción
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {proposal.proposedData.description ||
                      "Sin descripción nueva"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Alias nuevos
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestedAliases.length > 0 ? (
                      suggestedAliases.map((alias) => (
                        <Badge
                          key={alias}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {alias}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin alias nuevos
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Características nuevas
                  </p>
                  <div className="mt-1 space-y-1">
                    {suggestedAttributes.length > 0 ? (
                      suggestedAttributes.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs"
                        >
                          <span className="font-medium text-foreground">
                            {key}:
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {typeof value === "string"
                              ? value
                              : JSON.stringify(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin características nuevas
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Detectado en: {proposal.sceneTitle ?? "Sin titulo"}
                  {proposal.chapterTitle ? ` · ${proposal.chapterTitle}` : ""}
                </div>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={accepting || rejecting}
          >
            Cerrar
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={!proposal || accepting || rejecting}
          >
            Editar propuesta
          </Button>
          <Button
            variant="outline"
            onClick={onReject}
            disabled={!proposal || accepting || rejecting}
          >
            <X className="size-4" />
            {rejecting ? "Rechazando..." : "Rechazar"}
          </Button>
          <Button
            onClick={onAccept}
            disabled={!proposal || accepting || rejecting}
          >
            <Check className="size-4" />
            {accepting ? "Aplicando..." : "Aplicar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
