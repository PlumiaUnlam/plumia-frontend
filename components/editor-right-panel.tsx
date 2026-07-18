"use client";

import { useState } from "react";
import {
  BarChart2,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import useSWR from "swr";

import { getEntities } from "@/services/entities.service";
import {
  acceptEntityProposal,
  getEntityProposals,
} from "@/services/entity-proposals.service";
import { WikiPanel } from "@/components/wiki-panel";

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
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: entities,
    error,
    isLoading,
    mutate: mutateEntities,
  } = useSWR(
    projectId ? `/knowledge/entities?projectId=${projectId}` : null,
    () => getEntities(projectId),
  );
  const {
    data: proposals,
    error: proposalsError,
    isLoading: isLoadingProposals,
    mutate: mutateProposals,
  } = useSWR(
    projectId ? `/v1/projects/${projectId}/proposals` : null,
    () => getEntityProposals(projectId),
  );

  const handleAcceptProposal = async (proposalId: string) => {
    setAcceptingProposalId(proposalId);
    setActionError(null);
    try {
      await acceptEntityProposal(proposalId);
      await Promise.all([mutateEntities(), mutateProposals()]);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo aceptar la propuesta.",
      );
    } finally {
      setAcceptingProposalId(null);
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
          loading={isLoading}
          proposalsLoading={isLoadingProposals}
          entitiesError={error}
          proposalsError={proposalsError}
          acceptingProposalId={acceptingProposalId}
          onAcceptProposal={handleAcceptProposal}
          actionError={actionError}
        />
      )}

      {activeTab === "chat" && <div className="min-h-0 flex-1" />}

      {activeTab === "stats" && <div className="min-h-0 flex-1" />}
    </aside>
  );
}
