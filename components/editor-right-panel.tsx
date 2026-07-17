"use client";

import { useRef, useState } from "react";
import {
  BarChart2,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import useSWR from "swr";

import { NewEntityModal } from "@/components/modal/new-entity-modal";
import { getEntities, updateEntity } from "@/services/entities.service";
import {
  acceptEntityProposal,
  getEntityProposals,
  rejectEntityProposal,
} from "@/services/entity-proposals.service";
import {
  attachImage,
  generatePreviewImage,
} from "@/services/image-generation.service";
import { uploadEntityImage } from "@/services/upload.service";
import { WikiPanel } from "@/components/wiki-panel";
import type {
  CreateEntityInput,
  UpdateEntityInput,
} from "@/types/entity";
import type { EntityProposal } from "@/types/entity-proposal";

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
  const [rejectingProposalId, setRejectingProposalId] = useState<string | null>(
    null,
  );
  const [reviewingProposal, setReviewingProposal] =
    useState<EntityProposal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const aiStorageKeyRef = useRef<string | null>(null);
  const aiPromptRef = useRef<string | null>(null);
  const aiImageTypeRef = useRef<string | null>(null);

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

  const handleAcceptProposal = async (proposal: EntityProposal) => {
    setAcceptingProposalId(proposal.id);
    setActionError(null);
    try {
      await acceptEntityProposal(proposal.id, {
        canonicalName: proposal.proposedData.canonicalName,
        type: proposal.proposedData.type,
        description: proposal.proposedData.description ?? undefined,
        aliases: proposal.proposedData.aliases,
        attributes: proposal.proposedData.attributes,
        imageUrl: proposal.proposedData.imageUrl ?? undefined,
      });
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

  const handleRejectProposal = async (proposalId: string) => {
    setRejectingProposalId(proposalId);
    setActionError(null);
    try {
      await rejectEntityProposal(proposalId);
      await mutateProposals();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo rechazar la propuesta.",
      );
    } finally {
      setRejectingProposalId(null);
    }
  };

  const handleReviewProposal = (proposal: EntityProposal) => {
    setActionError(null);
    handleClearAiPreview();
    setReviewingProposal(proposal);
  };

  const handleGenerateImage = async (data: {
    canonicalName: string;
    description: string;
    type: string;
    aliases: string[];
  }): Promise<string> => {
    const result = await generatePreviewImage({
      name: data.canonicalName,
      type: data.type,
      description: data.description || undefined,
    });

    aiStorageKeyRef.current = result.storageKey;
    aiPromptRef.current = result.prompt;
    aiImageTypeRef.current = result.imageType;

    return result.imageUrl;
  };

  const handleClearAiPreview = () => {
    aiStorageKeyRef.current = null;
    aiPromptRef.current = null;
    aiImageTypeRef.current = null;
  };

  const handleCloseReviewModal = () => {
    setReviewingProposal(null);
    handleClearAiPreview();
  };

  const handleSubmitReviewedProposal = async (
    data: CreateEntityInput | UpdateEntityInput,
    file?: File | null,
  ) => {
    if (!reviewingProposal) return;

    setActionError(null);

    const entity = await acceptEntityProposal(
      reviewingProposal.id,
      data as CreateEntityInput,
    );

    try {
      if (aiStorageKeyRef.current) {
        await attachImage({
          entityId: entity.id,
          storageKey: aiStorageKeyRef.current,
          prompt: aiPromptRef.current!,
          imageType: aiImageTypeRef.current!,
        });
      }

      if (file) {
        const publicUrl = await uploadEntityImage(entity.id, file);
        await updateEntity(entity.id, { imageUrl: publicUrl });
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "La entidad se creó, pero no se pudo asociar la imagen.",
      );
    } finally {
      handleClearAiPreview();
    }

    setReviewingProposal(null);
    await Promise.all([mutateEntities(), mutateProposals()]);
  };

  const reviewInitialValues: CreateEntityInput | null = reviewingProposal
    ? {
        canonicalName: reviewingProposal.proposedData.canonicalName,
        type: reviewingProposal.proposedData.type,
        description: reviewingProposal.proposedData.description ?? undefined,
        aliases: reviewingProposal.proposedData.aliases,
        attributes: reviewingProposal.proposedData.attributes,
        imageUrl: reviewingProposal.proposedData.imageUrl ?? undefined,
      }
    : null;

  return (
    <>
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
          <WikiPanel
            entities={entities ?? []}
            proposals={proposals ?? []}
            loading={isLoading}
            proposalsLoading={isLoadingProposals}
            entitiesError={error}
            proposalsError={proposalsError}
            acceptingProposalId={acceptingProposalId}
            rejectingProposalId={rejectingProposalId}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
            onReviewProposal={handleReviewProposal}
            actionError={actionError}
          />
        )}

        {activeTab === "chat" && <div className="min-h-0 flex-1" />}

        {activeTab === "stats" && <div className="min-h-0 flex-1" />}
      </aside>

      <NewEntityModal
        show={!!reviewingProposal}
        onClose={handleCloseReviewModal}
        onSubmit={handleSubmitReviewedProposal}
        initialValues={reviewInitialValues}
        onGenerateImage={handleGenerateImage}
        onClearAiPreview={handleClearAiPreview}
      />
    </>
  );
}
