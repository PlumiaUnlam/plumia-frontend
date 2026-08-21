"use client";

import { useMemo, useState } from "react";
import { BarChart2, GitBranch, MessageSquare } from "lucide-react";
import useSWR from "swr";

import { getEntities } from "@/services/entities.service";
import { getPrimaryEntityImages } from "@/services/image-generation.service";
import {
  acceptEntityProposal,
  buildEntityProposalAcceptanceInput,
  getEntityProposals,
  rejectEntityProposal,
} from "@/services/entity-proposals.service";
import {
  acceptRelationshipProposal,
  getRelationshipProposals,
  rejectRelationshipProposal,
} from "@/services/relationship-proposals.service";
import { updateAuditAlert } from "@/services/audit-alerts.service";
import { WikiPanel } from "@/components/wiki-panel";
import { useAuditAlerts } from "@/hooks/use-audit-alerts";
import type { CreateEntityInput, Entity, UpdateEntityInput } from "@/types/entity";
import type { EntityProposal } from "@/types/entity-proposal";
import type { UpdateRelationshipInput } from "@/types/relationship";
import type { AuditAlertResolution } from "@/types/audit-alert";

type RightTab = "wiki" | "chat" | "stats";

type EditorRightPanelProps = {
  readonly projectId: string;
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

export function EditorRightPanel({ projectId }: EditorRightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightTab>("wiki");
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [entityActionFeedback, setEntityActionFeedback] =
    useState<EntityActionFeedback | null>(null);

  const {
    data: entities,
    error,
    isLoading,
    mutate: mutateEntities,
  } = useSWR(
    projectId ? `/knowledge/entities?projectId=${projectId}` : null,
    () => getEntities(projectId),
  );
  const entityIds = useMemo(
    () => (entities ?? []).map((entity) => entity.id),
    [entities],
  );
  const primaryImagesKey =
    projectId && entityIds.length > 0
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
    projectId ? `/v1/projects/${projectId}/relationship-proposals` : null,
    () => getRelationshipProposals(projectId),
  );
  const {
    data: proposals,
    error: proposalsError,
    isLoading: isLoadingProposals,
    mutate: mutateProposals,
  } = useSWR(projectId ? `/v1/projects/${projectId}/proposals` : null, () =>
    getEntityProposals(projectId),
  );
  const {
    data: auditAlerts,
    error: auditAlertsError,
    isLoading: isLoadingAuditAlerts,
    mutate: mutateAuditAlerts,
  } = useAuditAlerts(projectId);

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

  return (
    <aside className="flex w-80 min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-card xl:w-96">
      <div className="flex h-12 shrink-0 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-[11px] font-medium transition-colors ${
              activeTab === id
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Icon size={12} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "wiki" && (
        <WikiPanel
          entities={entities ?? []}
          proposals={proposals ?? []}
          relationshipProposals={relationshipProposals ?? []}
          auditAlerts={auditAlerts ?? []}
          loading={isLoading}
          proposalsLoading={isLoadingProposals}
          entitiesError={error}
          proposalsError={proposalsError}
          relationshipProposalsError={relationshipProposalsError}
          relationshipProposalsLoading={isLoadingRelationshipProposals}
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
          updatingAuditAlertId={updatingAuditAlertId}
          onUpdateAuditAlert={handleUpdateAuditAlert}
          actionError={actionError}
          entityActionFeedback={entityActionFeedback}
        />
      )}

      {activeTab === "chat" && <div className="min-h-0 flex-1" />}

      {activeTab === "stats" && <div className="min-h-0 flex-1" />}
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
