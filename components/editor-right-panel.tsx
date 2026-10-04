"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart2,
  GitBranch,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import useSWR from "swr";

import { ChatPanel } from "@/components/chat-panel";
import { StatsSidebarPanel } from "@/components/statistics/stats-sidebar-panel";
import { WikiPanel } from "@/components/wiki-panel";
import { getEntities } from "@/services/entities.service";
import {
  acceptEntityProposal,
  buildEntityProposalAcceptanceInput,
  getEntityProposals,
  rejectEntityProposal,
} from "@/services/entity-proposals.service";
import { getPrimaryEntityImages } from "@/services/image-generation.service";
import {
  acceptRelationshipProposal,
  getRelationshipProposals,
  rejectRelationshipProposal,
} from "@/services/relationship-proposals.service";
import {
  applyAuditAlertKnowledgeUpdate,
  updateAuditAlert,
} from "@/services/audit-alerts.service";
import {
  acceptEntityStateProposal,
  createEntityState,
  getEntityStateProposals,
  getTemporalKnowledgeView,
  rejectEntityStateProposal,
} from "@/services/entity-states.service";
import { useAuditAlerts } from "@/hooks/use-audit-alerts";
import { useKnowledgeRefresh } from "@/hooks/use-knowledge-refresh";
import { useEditorStore } from "@/stores/editor.store";
import type { CreateEntityInput, Entity, UpdateEntityInput } from "@/types/entity";
import type { EntityProposal } from "@/types/entity-proposal";
import type { UpdateRelationshipInput } from "@/types/relationship";
import type { AuditAlert, AuditAlertResolution } from "@/types/audit-alert";
import type {
  CreateEntityStateInput,
  EntityStateProposal,
  EntityStateProposalOverride,
} from "@/types/entity-state";
import type { WritingMode } from "@/types/writing-mode";

type RightTab = "wiki" | "chat" | "stats";

type EditorRightPanelProps = {
  readonly projectId: string;
  readonly mode: Exclude<WritingMode, "zen">;
};

type EntityActionFeedback = {
  kind: "success" | "error";
  message: string;
};

const tabs = [
  { id: "wiki" as const, label: "Wiki", icon: GitBranch },
  { id: "chat" as const, label: "Chat IA", icon: MessageSquare },
  { id: "stats" as const, label: "Stats", icon: BarChart2 },
];

export function EditorRightPanel({
  projectId,
  mode,
}: EditorRightPanelProps) {
  const activeSceneId = useEditorStore((state) => state.activeSceneId);
  const setActiveScene = useEditorStore((state) => state.setActiveScene);
  const focusCitation = useEditorStore((state) => state.focusCitation);
  const clearCitationFocus = useEditorStore(
    (state) => state.clearCitationFocus,
  );
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<RightTab>("wiki");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(
    null,
  );
  const [rejectingProposalId, setRejectingProposalId] = useState<string | null>(
    null,
  );
  const [acceptingRelationshipProposalId, setAcceptingRelationshipProposalId] =
    useState<string | null>(null);
  const [rejectingRelationshipProposalId, setRejectingRelationshipProposalId] =
    useState<string | null>(null);
  const [updatingAuditAlertId, setUpdatingAuditAlertId] = useState<
    string | null
  >(null);
  const [acceptingStateProposalId, setAcceptingStateProposalId] = useState<
    string | null
  >(null);
  const [rejectingStateProposalId, setRejectingStateProposalId] = useState<
    string | null
  >(null);
  const [creatingStateForEntityId, setCreatingStateForEntityId] = useState<
    string | null
  >(null);
  const [temporalSceneId, setTemporalSceneId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [entityActionFeedback, setEntityActionFeedback] =
    useState<EntityActionFeedback | null>(null);
  const shouldLoadEntityData = activeTab === "wiki" || activeTab === "chat";
  const shouldLoadWikiData = activeTab === "wiki";

  const {
    data: entities,
    error,
    isLoading,
    mutate: mutateEntities,
  } = useSWR(
    projectId && shouldLoadEntityData
      ? `/knowledge/entities?projectId=${projectId}`
      : null,
    () => getEntities(projectId),
  );
  const entityIds = useMemo(
    () => (entities ?? []).map((entity) => entity.id),
    [entities],
  );
  const primaryImagesKey =
    projectId && shouldLoadEntityData && entityIds.length > 0
      ? `/publishing/images/primary?entityIds=${encodeURIComponent(entityIds.join(","))}`
      : null;
  const { data: primaryImageUrls = {} } = useSWR(primaryImagesKey, () =>
    getPrimaryEntityImages(entityIds),
  );
  const {
    data: relationshipProposals,
    error: relationshipProposalsError,
    isLoading: isLoadingRelationshipProposals,
    mutate: mutateRelationshipProposals,
  } = useSWR(
    projectId && shouldLoadWikiData
      ? `/v1/projects/${projectId}/relationship-proposals`
      : null,
    () => getRelationshipProposals(projectId),
  );
  const {
    data: proposals,
    error: proposalsError,
    isLoading: isLoadingProposals,
    mutate: mutateProposals,
  } = useSWR(
    projectId && shouldLoadWikiData
      ? `/v1/projects/${projectId}/proposals`
      : null,
    () => getEntityProposals(projectId),
  );
  const {
    data: auditAlerts,
    error: auditAlertsError,
    isLoading: isLoadingAuditAlerts,
    mutate: mutateAuditAlerts,
  } = useAuditAlerts(projectId);
  const {
    data: stateProposals,
    error: stateProposalsError,
    isLoading: isLoadingStateProposals,
    mutate: mutateStateProposals,
  } = useSWR(
    projectId && shouldLoadWikiData
      ? `/v1/projects/${projectId}/state-proposals`
      : null,
    () => getEntityStateProposals(projectId),
  );
  const selectedTemporalSceneId = temporalSceneId ?? activeSceneId;
  const {
    data: temporalKnowledgeView,
    error: temporalKnowledgeViewError,
    isLoading: isLoadingTemporalKnowledgeView,
    mutate: mutateTemporalKnowledgeView,
  } = useSWR(
    projectId && shouldLoadWikiData && selectedTemporalSceneId
      ? `/knowledge/projects/${projectId}/temporal-view?sceneId=${selectedTemporalSceneId}`
      : null,
    () => getTemporalKnowledgeView(projectId, selectedTemporalSceneId!),
  );

  const refreshKnowledge = useCallback(() => {
    void Promise.all([
      mutateEntities(),
      mutateProposals(),
      mutateRelationshipProposals(),
      mutateAuditAlerts(),
      mutateStateProposals(),
      mutateTemporalKnowledgeView(),
    ]).catch(() => undefined);
  }, [
    mutateAuditAlerts,
    mutateEntities,
    mutateProposals,
    mutateRelationshipProposals,
    mutateStateProposals,
    mutateTemporalKnowledgeView,
  ]);

  const scheduleKnowledgeRefresh = useCallback(() => {
    refreshKnowledge();

    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    let remainingRefreshes = 12;
    refreshTimerRef.current = setInterval(() => {
      refreshKnowledge();
      remainingRefreshes -= 1;

      if (remainingRefreshes === 0 && refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }, 5000);
  }, [refreshKnowledge]);

  useKnowledgeRefresh(projectId, scheduleKnowledgeRefresh);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  const handleAcceptProposal = async (
    proposal: EntityProposal,
    override?: CreateEntityInput | UpdateEntityInput,
  ): Promise<void> => {
    setAcceptingProposalId(proposal.id);
    setActionError(null);
    setEntityActionFeedback(null);
    try {
      const acceptedEntity = await acceptEntityProposal(
        proposal.id,
        override ?? buildEntityProposalAcceptanceInput(proposal),
      );
      await Promise.all([
        mutateEntities(
          (current) => upsertEntity(current, acceptedEntity),
          { revalidate: false },
        ),
        mutateProposals(
          (current) => (current ?? []).filter(({ id }) => id !== proposal.id),
          { revalidate: false },
        ),
      ]);
      setEntityActionFeedback({
        kind: "success",
        message:
          proposal.proposedData.proposalKind === "ENTITY_UPDATE"
            ? "La actualización de la entidad fue aceptada."
            : "La entidad fue aceptada y agregada a la Wiki.",
      });
      void Promise.all([
        mutateEntities(),
        mutateProposals(),
        mutateRelationshipProposals(),
      ]).catch(() => undefined);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo aceptar la propuesta.";
      setEntityActionFeedback({ kind: "error", message });
      throw error;
    } finally {
      setAcceptingProposalId(null);
    }
  };

  const handleAcceptRelationshipProposal = async (
    proposalId: string,
    override?: UpdateRelationshipInput,
  ) => {
    setAcceptingRelationshipProposalId(proposalId);
    setActionError(null);
    try {
      await acceptRelationshipProposal(proposalId, override);
      await mutateRelationshipProposals();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo aceptar la relacion.",
      );
    } finally {
      setAcceptingRelationshipProposalId(null);
    }
  };

  const handleRejectRelationshipProposal = async (proposalId: string) => {
    setRejectingRelationshipProposalId(proposalId);
    setActionError(null);
    try {
      await rejectRelationshipProposal(proposalId);
      await mutateRelationshipProposals();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo rechazar la relacion.",
      );
    } finally {
      setRejectingRelationshipProposalId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    setRejectingProposalId(proposalId);
    setActionError(null);
    setEntityActionFeedback(null);
    try {
      await rejectEntityProposal(proposalId);
      await mutateProposals();
      setEntityActionFeedback({
        kind: "success",
        message: "La propuesta fue rechazada.",
      });
    } catch (error) {
      setEntityActionFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo rechazar la propuesta.",
      });
    } finally {
      setRejectingProposalId(null);
    }
  };

  const handleUpdateAuditAlert = async (
    alertId: string,
    status: AuditAlertResolution,
  ) => {
    setUpdatingAuditAlertId(alertId);
    setActionError(null);
    try {
      await updateAuditAlert(alertId, status);
      if (status === "DISMISSED") {
        clearCitationFocus();
      }
      await mutateAuditAlerts(
        (current) => (current ?? []).filter((alert) => alert.id !== alertId),
        { revalidate: false },
      );
      void mutateAuditAlerts().catch(() => undefined);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la advertencia.",
      );
    } finally {
      setUpdatingAuditAlertId(null);
    }
  };

  const handleFocusAuditAlert = useCallback(
    (alert: AuditAlert) => {
      const evidence = alert.conflict?.evidence[0];
      setActiveScene(alert.sceneId);
      if (evidence) {
        focusCitation({ sceneId: alert.sceneId, textQuote: evidence });
      } else {
        clearCitationFocus();
      }
    },
    [clearCitationFocus, focusCitation, setActiveScene],
  );

  const handleApplyAuditKnowledgeUpdate = async (alertId: string) => {
    setUpdatingAuditAlertId(alertId);
    setActionError(null);
    try {
      await applyAuditAlertKnowledgeUpdate(alertId);
      await Promise.all([
        mutateAuditAlerts(),
        mutateStateProposals(),
        mutateTemporalKnowledgeView(),
      ]);
      scheduleKnowledgeRefresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la base de conocimiento.",
      );
    } finally {
      setUpdatingAuditAlertId(null);
    }
  };

  const handleAcceptStateProposal = async (
    proposal: EntityStateProposal,
    override?: EntityStateProposalOverride,
  ) => {
    setAcceptingStateProposalId(proposal.id);
    setActionError(null);
    try {
      await acceptEntityStateProposal(proposal.id, override);
      await Promise.all([mutateStateProposals(), mutateTemporalKnowledgeView()]);
      scheduleKnowledgeRefresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo aceptar el cambio de estado.",
      );
      throw error;
    } finally {
      setAcceptingStateProposalId(null);
    }
  };

  const handleRejectStateProposal = async (proposalId: string) => {
    setRejectingStateProposalId(proposalId);
    setActionError(null);
    try {
      await rejectEntityStateProposal(proposalId);
      await mutateStateProposals();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo rechazar el cambio de estado.",
      );
    } finally {
      setRejectingStateProposalId(null);
    }
  };

  const handleCreateEntityState = async (
    entityId: string,
    input: CreateEntityStateInput,
  ) => {
    setCreatingStateForEntityId(entityId);
    setActionError(null);
    try {
      await createEntityState(entityId, input);
      await mutateTemporalKnowledgeView();
      scheduleKnowledgeRefresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo guardar el estado.",
      );
      throw error;
    } finally {
      setCreatingStateForEntityId(null);
    }
  };

  return (
    <aside
      className={`flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-card transition-[width] duration-200 ${
        isCollapsed ? "w-12" : "w-80 xl:w-96"
      }`}
    >
      <div className={isCollapsed ? "hidden" : "flex h-full min-h-0 flex-col"}>
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-pressed={activeTab === id}
              className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
                activeTab === id
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span className="truncate">{label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="ml-0.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            title="Colapsar panel derecho"
            aria-label="Colapsar panel derecho"
          >
            <PanelRightClose size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-card">
          {activeTab === "wiki" && (
            <WikiPanel
              entities={entities ?? []}
              proposals={proposals ?? []}
              relationshipProposals={relationshipProposals ?? []}
              stateProposals={stateProposals ?? []}
              auditAlerts={auditAlerts ?? []}
              loading={isLoading}
              proposalsLoading={isLoadingProposals}
              entitiesError={error}
              proposalsError={proposalsError}
              relationshipProposalsError={relationshipProposalsError}
              relationshipProposalsLoading={isLoadingRelationshipProposals}
              stateProposalsError={stateProposalsError}
              stateProposalsLoading={isLoadingStateProposals}
              auditAlertsError={auditAlertsError}
              auditAlertsLoading={isLoadingAuditAlerts}
              primaryImageUrls={primaryImageUrls}
              acceptingProposalId={acceptingProposalId}
              rejectingProposalId={rejectingProposalId}
              onAcceptProposal={handleAcceptProposal}
              onRejectProposal={handleRejectProposal}
              acceptingRelationshipProposalId={acceptingRelationshipProposalId}
              rejectingRelationshipProposalId={rejectingRelationshipProposalId}
              onAcceptRelationshipProposal={handleAcceptRelationshipProposal}
              onRejectRelationshipProposal={handleRejectRelationshipProposal}
              acceptingStateProposalId={acceptingStateProposalId}
              rejectingStateProposalId={rejectingStateProposalId}
              onAcceptStateProposal={handleAcceptStateProposal}
              onRejectStateProposal={handleRejectStateProposal}
              creatingStateForEntityId={creatingStateForEntityId}
              onCreateEntityState={handleCreateEntityState}
              temporalKnowledgeView={temporalKnowledgeView ?? null}
              temporalKnowledgeViewError={temporalKnowledgeViewError}
              temporalKnowledgeViewLoading={isLoadingTemporalKnowledgeView}
              selectedTemporalSceneId={selectedTemporalSceneId}
              onSelectTemporalScene={setTemporalSceneId}
              updatingAuditAlertId={updatingAuditAlertId}
              onUpdateAuditAlert={handleUpdateAuditAlert}
              onFocusAuditAlert={handleFocusAuditAlert}
              onApplyAuditKnowledgeUpdate={handleApplyAuditKnowledgeUpdate}
              actionError={actionError}
              entityActionFeedback={entityActionFeedback}
              showReviewSections={mode === "review"}
            />
          )}

          {activeTab === "chat" && (
            <ChatPanel
              key={projectId}
              projectId={projectId}
              primaryImageUrls={primaryImageUrls}
            />
          )}

          {activeTab === "stats" && (
            <StatsSidebarPanel projectId={projectId} />
          )}
        </div>
      </div>

      <div className={isCollapsed ? "flex h-full min-h-0 flex-col items-center" : "hidden"}>
        <div className="flex h-12 w-full shrink-0 items-center justify-center border-b border-border">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            title="Expandir panel derecho"
            aria-label="Expandir panel derecho"
          >
            <PanelRightOpen size={16} />
          </button>
      </div>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-1 p-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setIsCollapsed(false);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                activeTab === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
              title={label}
              aria-label={`Mostrar ${label}`}
              aria-pressed={activeTab === id}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function upsertEntity(
  currentEntities: readonly Entity[] | undefined,
  acceptedEntity: Entity,
): Entity[] {
  return [
    ...(currentEntities ?? []).filter(({ id }) => id !== acceptedEntity.id),
    acceptedEntity,
  ].sort((left, right) =>
    left.canonicalName.localeCompare(right.canonicalName),
  );
}
