"use client"

import { useEffect } from "react"

const KNOWLEDGE_REFRESH_EVENT = "plumia:knowledge-refresh"

type KnowledgeRefreshEventDetail = {
  projectId: string
}

/** Notifies the project Wiki that a background extraction may change its data. */
export function requestKnowledgeRefresh(projectId: string) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<KnowledgeRefreshEventDetail>(KNOWLEDGE_REFRESH_EVENT, {
      detail: { projectId },
    }),
  )
}

/** Subscribes a mounted Wiki to extraction requests for its own project only. */
export function useKnowledgeRefresh(
  projectId: string,
  onRefreshRequested: () => void,
) {
  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const { detail } = event as CustomEvent<KnowledgeRefreshEventDetail>
      if (detail.projectId === projectId) {
        onRefreshRequested()
      }
    }

    window.addEventListener(KNOWLEDGE_REFRESH_EVENT, handleRefresh)
    return () => {
      window.removeEventListener(KNOWLEDGE_REFRESH_EVENT, handleRefresh)
    }
  }, [onRefreshRequested, projectId])
}
