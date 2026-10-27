"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  History,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/modal/form-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityIconTile } from "@/components/worldbuilding/entity-icon-tile";
import { EntityImage } from "@/components/worldbuilding/entity-image";
import { NewEntityModal } from "@/components/modal/new-entity-modal";
import { NewRelationModal } from "@/components/modal/new-relation-modal";
import { getEntityCategoryStyle } from "@/lib/entity-category-style";
import {
  TYPE_TO_CATEGORY,
  type CreateEntityInput,
  type Entity,
  type UpdateEntityInput,
} from "@/types/entity";
import type { EntityProposal } from "@/types/entity-proposal";
import type { RelationshipProposal } from "@/types/relationship-proposal";
import type { UpdateRelationshipInput } from "@/types/relationship";
import { relationStyles } from "@/lib/relation-style";
import { AuditAlertCard } from "@/components/wiki/audit-alert-card";
import { AuditAlertHistoryDialog } from "@/components/wiki/audit-alert-history-dialog";
import type { AuditAlert, AuditAlertUpdateStatus } from "@/types/audit-alert";
import type { EntityStateProposal } from "@/types/entity-state";
import type { EditorSectionOption } from "@/components/editor/editor-types";
import { getWorldbuildingEntityHref } from "@/lib/worldbuilding-links";

type WikiPanelProps = {
  readonly projectId: string;
  readonly stateTrackingEnabled: boolean;
  readonly sceneOptions: readonly EditorSectionOption[];
  readonly entities: readonly Entity[];
  readonly proposals: readonly EntityProposal[];
  readonly relationshipProposals: readonly RelationshipProposal[];
  readonly stateProposals: readonly EntityStateProposal[];
  readonly auditAlerts: readonly AuditAlert[];
  readonly loading: boolean;
  readonly proposalsLoading: boolean;
  readonly entitiesError: Error | undefined;
  readonly proposalsError: Error | undefined;
  readonly relationshipProposalsError: Error | undefined;
  readonly relationshipProposalsLoading: boolean;
  readonly stateProposalsError: Error | undefined;
  readonly stateProposalsLoading: boolean;
  readonly auditAlertsError: Error | undefined;
  readonly auditAlertsLoading: boolean;
  readonly primaryImageUrls: Readonly<Record<string, string>>;
  readonly acceptingProposalId: string | null;
  readonly rejectingProposalId: string | null;
  readonly onAcceptProposal: (
    proposal: EntityProposal,
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
  readonly acceptingStateProposalId: string | null;
  readonly rejectingStateProposalId: string | null;
  readonly onAcceptStateProposalSequence: (
    acceptedProposalIds: string[],
    rejectedProposalIds: string[],
  ) => Promise<void>;
  readonly onRejectStateProposal: (proposalId: string) => Promise<void>;
  readonly updatingAuditAlertId: string | null;
  readonly onUpdateAuditAlert: (
    alertId: string,
    status: AuditAlertUpdateStatus,
  ) => Promise<boolean>;
  readonly onFocusAuditAlert: (alert: AuditAlert, evidenceIndex?: number) => void;
  readonly onApplyAuditKnowledgeUpdate: (alertId: string) => Promise<void>;
  readonly actionError: string | null;
  readonly entityActionFeedback: {
    kind: "success" | "error";
    message: string;
  } | null;
  readonly showReviewSections: boolean;
};

type WikiSectionKey =
  | "inconsistencies"
  | "relationships"
  | "entities"
  | "proposals"
  | "states";

export function WikiPanel({
  projectId,
  stateTrackingEnabled,
  sceneOptions,
  entities,
  proposals,
  relationshipProposals,
  stateProposals,
  auditAlerts,
  loading,
  proposalsLoading,
  entitiesError,
  proposalsError,
  relationshipProposalsError,
  relationshipProposalsLoading,
  stateProposalsError,
  stateProposalsLoading,
  auditAlertsError,
  auditAlertsLoading,
  primaryImageUrls,
  acceptingProposalId,
  rejectingProposalId,
  onAcceptProposal,
  onRejectProposal,
  acceptingRelationshipProposalId,
  rejectingRelationshipProposalId,
  onAcceptRelationshipProposal,
  onRejectRelationshipProposal,
  acceptingStateProposalId,
  rejectingStateProposalId,
  onAcceptStateProposalSequence,
  onRejectStateProposal,
  updatingAuditAlertId,
  onUpdateAuditAlert,
  onFocusAuditAlert,
  onApplyAuditKnowledgeUpdate,
  actionError,
  entityActionFeedback,
  showReviewSections,
}: Readonly<WikiPanelProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [auditHistoryOpen, setAuditHistoryOpen] = useState(false);
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
    inconsistencies: true,
    relationships: true,
    entities: true,
    proposals: true,
    states: true,
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

  const updateProposalsByEntityId = useMemo(
    () =>
      new Map(
        proposals
          .filter(
            (proposal) =>
              proposal.entityId &&
              proposal.proposedData.proposalKind === "ENTITY_UPDATE",
          )
          .map((proposal) => [proposal.entityId as string, proposal] as const),
      ),
    [proposals],
  );

  const filteredAuditAlerts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return auditAlerts;

    return auditAlerts.filter((alert) =>
      [
        alert.title,
        alert.description,
        alert.explanation,
        alert.conflict?.entityName,
        alert.conflict?.field,
        alert.conflict?.currentValue,
        alert.conflict?.observedValue,
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [auditAlerts, searchQuery]);

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
    await onAcceptProposal(editingEntityProposal, data);
    setEditingEntityProposalId(null);
    setReviewingProposalId(null);
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
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-card">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-3 py-3">
        <div className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3">
          <Search size={13} className="shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              showReviewSections
                ? "Buscar en la revisión..."
                : "Buscar entidades..."
            }
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="min-w-0 max-w-full space-y-3 overflow-x-hidden p-3">
          {showReviewSections && actionError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {actionError}
            </div>
          )}

          <AuditAlertsSection
            visible={showReviewSections}
            expanded={expandedSections.inconsistencies}
            alerts={filteredAuditAlerts}
            stateTrackingEnabled={stateTrackingEnabled}
            loading={auditAlertsLoading}
            error={auditAlertsError}
            updatingAlertId={updatingAuditAlertId}
            onToggle={() => toggleSection("inconsistencies")}
            onUpdate={onUpdateAuditAlert}
            onFocus={onFocusAuditAlert}
            onApplyKnowledgeUpdate={onApplyAuditKnowledgeUpdate}
            onOpenHistory={() => setAuditHistoryOpen(true)}
          />

          <RelationshipProposalsSection
            visible={showReviewSections}
            expanded={expandedSections.relationships}
            proposals={relationshipProposals}
            loading={relationshipProposalsLoading}
            error={relationshipProposalsError}
            acceptingId={acceptingRelationshipProposalId}
            rejectingId={rejectingRelationshipProposalId}
            onToggle={() => toggleSection("relationships")}
            onAccept={onAcceptRelationshipProposal}
            onReject={onRejectRelationshipProposal}
            onEdit={setEditingRelationshipProposalId}
          />

          <WikiSectionTitle
            icon={FileText}
            label="Entidades confirmadas"
            count={filteredEntities.length}
            expanded={expandedSections.entities}
            onToggle={() => toggleSection("entities")}
          />
          {expandedSections.entities && (
            <EntityDirectoryContent
              loading={loading}
              error={entitiesError}
              entities={filteredEntities}
              proposals={proposals}
              showReviewSections={showReviewSections}
              updateProposalsByEntityId={updateProposalsByEntityId}
              primaryImageUrls={primaryImageUrls}
              projectId={projectId}
              onReviewProposal={handleEntityProposalEdit}
            />
          )}
          {showReviewSections && stateTrackingEnabled && (
            <>
              <WikiSectionTitle
                icon={RefreshCw}
                label="Cambios narrativos"
                count={stateProposals.length}
                expanded={expandedSections.states}
                onToggle={() => toggleSection("states")}
              />
              {expandedSections.states && (
                <StateProposalsContent
                  loading={stateProposalsLoading}
                  error={stateProposalsError}
                  proposals={stateProposals}
                  acceptingId={acceptingStateProposalId}
                  rejectingId={rejectingStateProposalId}
                  onAcceptSequence={onAcceptStateProposalSequence}
                  onReject={onRejectStateProposal}
                />
              )}
            </>
          )}
          <EntityProposalsSection
            visible={showReviewSections}
            expanded={expandedSections.proposals}
            proposals={filteredProposals}
            loading={proposalsLoading}
            error={proposalsError}
            feedback={entityActionFeedback}
            acceptingId={acceptingProposalId}
            rejectingId={rejectingProposalId}
            onToggle={() => toggleSection("proposals")}
            onAccept={onAcceptProposal}
            onReject={onRejectProposal}
            onEdit={handleEntityProposalEdit}
          />
        </div>
      </ScrollArea>

      <AuditAlertHistoryDialog
        projectId={projectId}
        open={auditHistoryOpen}
        onOpenChange={setAuditHistoryOpen}
        updatingAlertId={updatingAuditAlertId}
        onRestore={(alertId) => onUpdateAuditAlert(alertId, "ACTIVE")}
        onFocusEvidence={onFocusAuditAlert}
      />

      <WikiPanelDialogs
        sceneOptions={sceneOptions}
        reviewingProposal={reviewingProposal}
        editingEntityProposal={editingEntityProposal}
        editingRelationshipProposal={editingRelationshipProposal}
        acceptingProposalId={acceptingProposalId}
        rejectingProposalId={rejectingProposalId}
        entities={entities}
        onCloseReview={handleCloseReview}
        onAcceptProposal={onAcceptProposal}
        onRejectProposal={onRejectProposal}
        onSetEditingEntityProposalId={setEditingEntityProposalId}
        onSetEditingRelationshipProposalId={setEditingRelationshipProposalId}
        onEditEntitySubmit={handleEditEntitySubmit}
        onEditRelationshipSubmit={handleEditRelationshipSubmit}
      />
    </div>
  );
}

function WikiPanelDialogs({
  sceneOptions,
  reviewingProposal,
  editingEntityProposal,
  editingRelationshipProposal,
  acceptingProposalId,
  rejectingProposalId,
  entities,
  onCloseReview,
  onAcceptProposal,
  onRejectProposal,
  onSetEditingEntityProposalId,
  onSetEditingRelationshipProposalId,
  onEditEntitySubmit,
  onEditRelationshipSubmit,
}: Readonly<{
  sceneOptions: readonly EditorSectionOption[];
  reviewingProposal: EntityProposal | null;
  editingEntityProposal: EntityProposal | null;
  editingRelationshipProposal: RelationshipProposal | null;
  acceptingProposalId: string | null;
  rejectingProposalId: string | null;
  entities: readonly Entity[];
  onCloseReview: () => void;
  onAcceptProposal: (
    proposal: EntityProposal,
    data?: CreateEntityInput | UpdateEntityInput,
  ) => Promise<void>;
  onRejectProposal: (proposalId: string) => Promise<void>;
  onSetEditingEntityProposalId: (proposalId: string | null) => void;
  onSetEditingRelationshipProposalId: (proposalId: string | null) => void;
  onEditEntitySubmit: (
    data: CreateEntityInput | UpdateEntityInput,
  ) => Promise<void>;
  onEditRelationshipSubmit: (data: UpdateRelationshipInput) => Promise<void>;
}>) {
  return (
    <>
      <EntityUpdateReviewDialog
        proposal={reviewingProposal}
        accepting={acceptingProposalId === reviewingProposal?.id}
        rejecting={rejectingProposalId === reviewingProposal?.id}
        onClose={onCloseReview}
        onAccept={
          reviewingProposal
            ? () => {
                void onAcceptProposal(reviewingProposal).catch(() => undefined);
              }
            : undefined
        }
        onReject={
          reviewingProposal
            ? () => void onRejectProposal(reviewingProposal.id)
            : undefined
        }
        onEdit={
          reviewingProposal
            ? () => onSetEditingEntityProposalId(reviewingProposal.id)
            : undefined
        }
      />

      <NewEntityModal
        show={!!editingEntityProposal}
        mode="proposal"
        initialValues={getEntityProposalInitialValues(editingEntityProposal)}
        onClose={() => onSetEditingEntityProposalId(null)}
        onSubmit={onEditEntitySubmit}
      />

      <NewRelationModal
        show={!!editingRelationshipProposal}
        mode="proposal"
        entities={entities}
        scenes={sceneOptions.map((scene) => ({
          id: scene.id,
          title: `${scene.bookTitle} · ${scene.chapterTitle} · ${scene.title}`,
        }))}
        initialValues={getRelationshipProposalInitialValues(
          editingRelationshipProposal,
        )}
        onClose={() => onSetEditingRelationshipProposalId(null)}
        onSubmit={onEditRelationshipSubmit}
      />

    </>
  );
}

function getEntityProposalInitialValues(proposal: EntityProposal | null) {
  if (!proposal) return undefined;
  const targetEntity = proposal.targetEntity;

  return {
    canonicalName:
      targetEntity?.canonicalName ?? proposal.proposedData.canonicalName,
    type: targetEntity?.type ?? proposal.proposedData.type,
    description: combineEntityDescriptions(
      targetEntity?.description ?? null,
      proposal.proposedData.description,
    ),
    aliases: [
      ...new Set([
        ...(targetEntity?.aliases ?? []),
        ...proposal.proposedData.aliases,
      ]),
    ],
    attributes: {
      ...targetEntity?.attributes,
      ...proposal.proposedData.attributes,
    },
    imageUrl: targetEntity?.id ? null : proposal.proposedData.imageUrl,
  };
}

function getRelationshipProposalInitialValues(
  proposal: RelationshipProposal | null,
) {
  if (!proposal) return undefined;

  return {
    sourceEntityId: proposal.source.id,
    targetEntityId: proposal.target.id,
    sourceEntityName: proposal.source.canonicalName,
    targetEntityName: proposal.target.canonicalName,
    relationType: proposal.relationType,
    intensity: Math.max(1, Math.round(proposal.intensity * 5)),
    description: proposal.description,
    validFromSceneId: proposal.sceneId,
    proposalKind: proposal.kind,
  };
}

function EntityDirectoryContent({
  loading,
  error,
  entities,
  proposals,
  showReviewSections,
  updateProposalsByEntityId,
  primaryImageUrls,
  projectId,
  onReviewProposal,
}: Readonly<{
  loading: boolean;
  error: Error | undefined;
  entities: readonly Entity[];
  proposals: readonly EntityProposal[];
  showReviewSections: boolean;
  updateProposalsByEntityId: ReadonlyMap<string, EntityProposal>;
  primaryImageUrls: Readonly<Record<string, string>>;
  projectId: string;
  onReviewProposal: (proposal: EntityProposal) => void;
}>) {
  if (loading) {
    return Array.from({ length: 3 }).map((_, index) => (
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
    ));
  }
  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        No se pudieron cargar las entidades.
      </div>
    );
  }
  if (entities.length === 0) {
    return (
      <EmptyWikiState
        title="Sin entidades"
        description="Crea entidades en la wiki para consultarlas desde el editor."
      />
    );
  }

  return entities.map((entity) => (
    <EditorWikiEntityCard
      key={entity.id}
      entity={entity}
      primaryImageUrl={primaryImageUrls[entity.id]}
      projectId={projectId}
      updateProposal={
        showReviewSections
          ? updateProposalsByEntityId.get(entity.id) ?? null
          : null
      }
      onReviewProposal={(proposalId) => {
        const proposal = proposals.find(
          (candidate) => candidate.id === proposalId,
        );
        if (proposal) onReviewProposal(proposal);
      }}
    />
  ));
}

function StateProposalsContent({
  loading,
  error,
  proposals,
  acceptingId,
  rejectingId,
  onAcceptSequence,
  onReject,
}: Readonly<{
  loading: boolean;
  error: Error | undefined;
  proposals: readonly EntityStateProposal[];
  acceptingId: string | null;
  rejectingId: string | null;
  onAcceptSequence: (
    acceptedProposalIds: string[],
    rejectedProposalIds: string[],
  ) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
}>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-muted-foreground">
        Revisando cambios narrativos...
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
        No se pudieron cargar los cambios narrativos.
      </div>
    );
  }
  if (proposals.length === 0) {
    return (
      <EmptyWikiState
        title="Sin cambios narrativos pendientes"
        description="Los cambios de ubicacion, estado vital y condicion apareceran aqui para revision."
      />
    );
  }

  const groups = new Map<string, EntityStateProposal[]>();
  proposals.forEach((proposal) => {
    const key = `${proposal.entityId}:${proposal.attributeKey}`;
    const current = groups.get(key) ?? [];
    current.push(proposal);
    groups.set(key, current);
  });

  return [...groups.entries()].map(([key, group]) => (
    <EntityStateSequenceCard
      key={key}
      proposals={group}
      accepting={acceptingId === "__sequence__"}
      rejecting={rejectingId !== null}
      onAccept={onAcceptSequence}
      onReject={onReject}
    />
  ));
}

function EntityStateSequenceCard({
  proposals,
  accepting,
  rejecting,
  onAccept,
  onReject,
}: Readonly<{
  proposals: readonly EntityStateProposal[];
  accepting: boolean;
  rejecting: boolean;
  onAccept: (acceptedIds: string[], rejectedIds: string[]) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
}>) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const entity = proposals[0];
  if (!entity) return null;
  const byScene = new Map<string, EntityStateProposal[]>();
  for (const proposal of proposals) {
    const items = byScene.get(proposal.sceneId) ?? [];
    items.push(proposal);
    byScene.set(proposal.sceneId, items);
  }
  const conflicts = new Set(
    [...byScene.entries()]
      .filter(([, items]) => {
        const values = new Set(items.map((item) => item.toValue?.trim().toLocaleLowerCase()));
        return values.size > 1 && items.some((item) => item.sequenceKind !== "TRANSITION");
      })
      .map(([sceneId]) => sceneId),
  );
  const selectedIds = proposals
    .filter((proposal) =>
      conflicts.has(proposal.sceneId)
        ? choices[proposal.sceneId] === proposal.id
        : true,
    )
    .map((proposal) => proposal.id);
  const canAccept = [...conflicts].every((sceneId) => Boolean(choices[sceneId]));
  const rejectedIds = proposals
    .filter((proposal) => !selectedIds.includes(proposal.id))
    .map((proposal) => proposal.id);

  return (
    <section className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.035] p-3">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold text-cyan-900 dark:text-cyan-100">
            {entity.entityName} · {getStateLabel(entity.attributeKey)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {proposals.length} {proposals.length === 1 ? "cambio" : "cambios"} en el recorrido narrativo
          </p>
        </div>
        <Badge variant="outline" className="border-cyan-500/30 text-[9px]">
          {new Set(proposals.map((proposal) => proposal.sceneId)).size} escenas
        </Badge>
      </header>

      <div className="space-y-2">
        {proposals.map((proposal) => {
          const isConflict = conflicts.has(proposal.sceneId);
          const sceneLabel = [proposal.bookTitle, proposal.chapterTitle, proposal.sceneTitle]
            .filter(Boolean)
            .join(" · ") || "Escena";
          return (
            <div key={proposal.id} className="rounded-lg border bg-card p-2.5">
              <div className="flex min-w-0 items-start gap-2">
                {isConflict && (
                  <input
                    type="radio"
                    name={`state-choice-${entity.entityId}-${entity.attributeKey}-${proposal.sceneId}`}
                    aria-label={`Elegir ${proposal.toValue} en ${sceneLabel}`}
                    checked={choices[proposal.sceneId] === proposal.id}
                    onChange={() =>
                      setChoices((current) => ({ ...current, [proposal.sceneId]: proposal.id }))
                    }
                    className="mt-1 accent-cyan-700"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">{sceneLabel}</p>
                  <p className="mt-1 break-words text-[11px] text-foreground">
                    {proposal.fromValue ?? "Sin valor anterior"} → <strong>{proposal.toValue ?? "Sin valor nuevo"}</strong>
                  </p>
                  {proposal.sequenceKind === "CONTRADICTION" && (
                    <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                      Se detectaron valores incompatibles; elegí cuál conservar en esta escena.
                    </p>
                  )}
                  {proposal.sequenceKind === "UNCERTAIN" && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      El orden del cambio no está claro; revisá la evidencia antes de aceptarlo.
                    </p>
                  )}
                  {proposal.conflictsWithLocked && (
                    <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                      Este cambio toca un campo protegido por una edición manual.
                    </p>
                  )}
                  {proposal.evidence[0] && (
                    <p className="mt-1 break-words text-[10px] italic text-muted-foreground">
                      “{proposal.evidence[0]}”
                    </p>
                  )}
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    Confianza {Math.round(proposal.confidenceScore * 100)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {conflicts.size > 0 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300">
          Elegí un valor para cada escena marcada antes de aceptar el recorrido.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="min-w-0 flex-1"
          disabled={accepting || rejecting || !canAccept}
          onClick={() => void onAccept(selectedIds, rejectedIds)}
        >
          {accepting ? "Guardando recorrido..." : "Aceptar recorrido"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="min-w-0 flex-1"
          disabled={accepting || rejecting}
          onClick={() => void Promise.all(proposals.map((proposal) => onReject(proposal.id)))}
        >
          {rejecting ? "Rechazando..." : "Rechazar recorrido"}
        </Button>
      </div>
    </section>
  );
}

function AuditAlertList({
  loading,
  error,
  alerts,
  updatingAlertId,
  onUpdate,
  onFocus,
  onApplyKnowledgeUpdate,
  stateTrackingEnabled,
}: Readonly<{
  loading: boolean;
  error: Error | undefined;
  alerts: readonly AuditAlert[];
  updatingAlertId: string | null;
  onUpdate: (alertId: string, status: AuditAlertUpdateStatus) => Promise<boolean>;
  onFocus: (alert: AuditAlert, evidenceIndex?: number) => void;
  onApplyKnowledgeUpdate: (alertId: string) => Promise<void>;
  stateTrackingEnabled: boolean;
}>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        Revisando inconsistencias...
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
        No se pudieron cargar las inconsistencias.
      </div>
    )
  }
  if (alerts.length === 0) {
    return (
      <EmptyWikiState
        title="Sin inconsistencias pendientes"
        description="Las posibles contradicciones de entidades apareceran aqui para tu revision."
      />
    )
  }

  return alerts.map((alert) => (
    <AuditAlertCard
      key={alert.id}
      alert={alert}
      updating={updatingAlertId === alert.id}
      stateTrackingEnabled={stateTrackingEnabled}
      onFocusEvidence={(evidenceIndex) => onFocus(alert, evidenceIndex)}
      onResolve={() => void onUpdate(alert.id, "RESOLVED")}
      onDismiss={() => void onUpdate(alert.id, "DISMISSED")}
      onApplyKnowledgeUpdate={() => void onApplyKnowledgeUpdate(alert.id)}
    />
  ))
}

function AuditAlertsSection({
  visible,
  expanded,
  alerts,
  loading,
  error,
  updatingAlertId,
  onToggle,
  onUpdate,
  onFocus,
  onApplyKnowledgeUpdate,
  stateTrackingEnabled,
  onOpenHistory,
}: Readonly<{
  visible: boolean;
  expanded: boolean;
  alerts: readonly AuditAlert[];
  loading: boolean;
  error: Error | undefined;
  updatingAlertId: string | null;
  onToggle: () => void;
  onUpdate: (alertId: string, status: AuditAlertUpdateStatus) => Promise<boolean>;
  onFocus: (alert: AuditAlert, evidenceIndex?: number) => void;
  onApplyKnowledgeUpdate: (alertId: string) => Promise<void>;
  stateTrackingEnabled: boolean;
  onOpenHistory: () => void;
}>) {
  if (!visible) return null
  return (
    <>
      <div className="flex min-w-0 items-center gap-1">
        <div className="min-w-0 flex-1">
          <WikiSectionTitle
            icon={AlertTriangle}
            label="Inconsistencias detectadas"
            count={alerts.length}
            expanded={expanded}
            onToggle={onToggle}
          />
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="h-7 shrink-0 px-2 text-[10px] text-muted-foreground"
          onClick={onOpenHistory}
        >
          <History className="size-3.5" />
          Historial
        </Button>
      </div>
      {expanded && (
        <AuditAlertList
          loading={loading}
          error={error}
          alerts={alerts}
          updatingAlertId={updatingAlertId}
          onUpdate={onUpdate}
          onFocus={onFocus}
          onApplyKnowledgeUpdate={onApplyKnowledgeUpdate}
          stateTrackingEnabled={stateTrackingEnabled}
        />
      )}
    </>
  )
}

function RelationshipProposalList({
  loading,
  error,
  proposals,
  acceptingId,
  rejectingId,
  onAccept,
  onReject,
  onEdit,
}: Readonly<{
  loading: boolean;
  error: Error | undefined;
  proposals: readonly RelationshipProposal[];
  acceptingId: string | null;
  rejectingId: string | null;
  onAccept: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  onEdit: (proposalId: string) => void;
}>) {
  if (loading) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
        Revisando relaciones...
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
        No se pudieron cargar las propuestas de relaciones.
      </div>
    )
  }
  if (proposals.length === 0) {
    return (
      <EmptyWikiState
        title="Sin relaciones pendientes"
        description="Las relaciones detectadas aparecerán aquí para revisión."
      />
    )
  }

  return proposals.map((proposal) => (
    <RelationshipProposalCard
      key={proposal.id}
      proposal={proposal}
      accepting={acceptingId === proposal.id}
      rejecting={rejectingId === proposal.id}
      onAccept={() => void onAccept(proposal.id)}
      onReject={() => void onReject(proposal.id)}
      onEdit={() => onEdit(proposal.id)}
    />
  ))
}

function RelationshipProposalsSection({
  visible,
  expanded,
  proposals,
  loading,
  error,
  acceptingId,
  rejectingId,
  onToggle,
  onAccept,
  onReject,
  onEdit,
}: Readonly<{
  visible: boolean;
  expanded: boolean;
  proposals: readonly RelationshipProposal[];
  loading: boolean;
  error: Error | undefined;
  acceptingId: string | null;
  rejectingId: string | null;
  onToggle: () => void;
  onAccept: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  onEdit: (proposalId: string) => void;
}>) {
  if (!visible) return null
  return (
    <>
      <WikiSectionTitle
        icon={RefreshCw}
        label="Relaciones detectadas"
        count={proposals.length}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && (
        <RelationshipProposalList
          loading={loading}
          error={error}
          proposals={proposals}
          acceptingId={acceptingId}
          rejectingId={rejectingId}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
        />
      )}
    </>
  )
}

function EntityProposalList({
  loading,
  error,
  proposals,
  acceptingId,
  rejectingId,
  onAccept,
  onReject,
  onEdit,
}: Readonly<{
  loading: boolean;
  error: Error | undefined;
  proposals: readonly EntityProposal[];
  acceptingId: string | null;
  rejectingId: string | null;
  onAccept: (proposal: EntityProposal) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  onEdit: (proposal: EntityProposal) => void;
}>) {
  if (loading) {
    return Array.from({ length: 2 }).map((_, index) => (
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
  }
  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        No se pudieron cargar las propuestas.
      </div>
    )
  }
  if (proposals.length === 0) {
    return (
      <EmptyWikiState
        title="Sin propuestas"
        description="Cuando el modelo detecte entidades nuevas o detalles adicionales, aparecerán aquí para revisión."
      />
    )
  }

  return proposals.map((proposal) => (
    <EditorWikiProposalCard
      key={proposal.id}
      proposal={proposal}
      accepting={acceptingId === proposal.id}
      rejecting={rejectingId === proposal.id}
      onAccept={() => void onAccept(proposal).catch(() => undefined)}
      onReject={() => void onReject(proposal.id)}
      onEdit={() => onEdit(proposal)}
    />
  ))
}

function EntityProposalsSection({
  visible,
  expanded,
  proposals,
  loading,
  error,
  feedback,
  acceptingId,
  rejectingId,
  onToggle,
  onAccept,
  onReject,
  onEdit,
}: Readonly<{
  visible: boolean;
  expanded: boolean;
  proposals: readonly EntityProposal[];
  loading: boolean;
  error: Error | undefined;
  feedback: { kind: "success" | "error"; message: string } | null;
  acceptingId: string | null;
  rejectingId: string | null;
  onToggle: () => void;
  onAccept: (proposal: EntityProposal) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  onEdit: (proposal: EntityProposal) => void;
}>) {
  if (!visible) return null
  return (
    <>
      <WikiSectionTitle
        icon={Sparkles}
        label="Propuestas detectadas"
        count={proposals.length}
        expanded={expanded}
        onToggle={onToggle}
      />
      {expanded && feedback && (
        <output
          role={feedback.kind === "error" ? "alert" : undefined}
          aria-live="polite"
          className={`block rounded-lg border px-3 py-2 text-xs ${
            feedback.kind === "error"
              ? "border-destructive/20 bg-destructive/5 text-destructive"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {feedback.message}
        </output>
      )}
      {expanded && (
        <EntityProposalList
          loading={loading}
          error={error}
          proposals={proposals}
          acceptingId={acceptingId}
          rejectingId={rejectingId}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
        />
      )}
    </>
  )
}

function RelationshipProposalCard({
  proposal,
  accepting,
  rejecting,
  onAccept,
  onReject,
  onEdit,
}: Readonly<{
  readonly proposal: RelationshipProposal;
  readonly accepting: boolean;
  readonly rejecting: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onEdit: () => void;
}>) {
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
}: Readonly<{
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly label: string;
  readonly count: number;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}>) {
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
}: Readonly<{
  readonly title: string;
  readonly description: string;
}>) {
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

function getStateLabel(attributeKey: string): string {
  const normalized = attributeKey.trim().toLowerCase().replace(/[ -]/g, "_");
  if (normalized === "location") return "Ubicación";
  if (normalized === "status") return "Estado vital";
  if (normalized === "health_status") return "Salud y condición";
  return attributeKey
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));
}

function EditorWikiEntityCard({
  entity,
  primaryImageUrl,
  projectId,
  updateProposal,
  onReviewProposal,
}: {
  readonly entity: Entity;
  readonly primaryImageUrl: string | undefined;
  readonly projectId: string;
  readonly updateProposal?: EntityProposal | null;
  readonly onReviewProposal?: (proposalId: string) => void;
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
              onClick={() => onReviewProposal?.(updateProposal.id)}
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

        <Link
          href={`${getWorldbuildingEntityHref(projectId, entity.id)}#entity-state-history`}
          className="mt-2 flex w-full min-w-0 items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[10px] font-medium text-primary transition-colors hover:border-primary/35 hover:bg-primary/10"
        >
          <span className="min-w-0 flex-1">Ver historial en Worldbuilding</span>
          <ArrowUpRight className="size-3.5 shrink-0" />
        </Link>
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
}: Readonly<{
  readonly proposal: EntityProposal;
  readonly accepting: boolean;
  readonly rejecting: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly onEdit: () => void;
}>) {
  const category = TYPE_TO_CATEGORY[proposal.proposedData.type];
  const categoryStyle = getEntityCategoryStyle(category);
  const isUpdate = proposal.proposedData.proposalKind === "ENTITY_UPDATE";
  const aliases = isUpdate ? [] : proposal.proposedData.aliases.slice(0, 2);

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
          {isUpdate
            ? "Se detectaron detalles nuevos para esta entidad."
            : proposal.proposedData.description || "Sin descripcion"}
        </p>

        {proposal.conflictsWithLocked && (
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-800 dark:text-amber-300">
            Esta sugerencia contradice un campo bloqueado manualmente por el
            autor.
          </p>
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
            {accepting ? "Aceptando..." : "Aceptar"}
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
}: Readonly<{
  readonly proposal: EntityProposal | null;
  readonly accepting: boolean;
  readonly rejecting: boolean;
  readonly onClose: () => void;
  readonly onAccept?: () => void;
  readonly onReject?: () => void;
  readonly onEdit?: () => void;
}>) {
  const currentEntity = proposal?.targetEntity ?? null;
  const suggestedAliases = proposal?.proposedData.aliases ?? [];
  const suggestedAttributes = Object.entries(
    proposal?.proposedData.attributes ?? {},
  );

  return (
    <FormDialog
      open={!!proposal}
      onOpenChange={(open) => !open && onClose()}
      title="Actualizar entidad"
      description="Revisá la información nueva detectada antes de sumarla a la ficha."
      size="lg"
      footer={
        <>
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
        </>
      }
    >
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
    </FormDialog>
  );
}
