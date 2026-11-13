"use client"

import { useEffect, useState } from "react"

import {
  buildChatPromptSuggestions,
  DEFAULT_CHAT_PROMPT_SUGGESTIONS,
} from "@/lib/chat-prompt-suggestions"
import { getEntities } from "@/services/entities.service"

/**
 * Sugerencias del chat vacío basadas en las entidades del proyecto. Mientras
 * cargan, o si la carga falla, muestra el set fijo (que también responde bien).
 */
export function useChatPromptSuggestions(projectId: string): readonly string[] {
  const [result, setResult] = useState<{
    projectId: string
    suggestions: readonly string[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void getEntities(projectId)
      .then((entities) => {
        if (!cancelled) {
          setResult({ projectId, suggestions: buildChatPromptSuggestions(entities) })
        }
      })
      .catch(() => {
        // Sin entidades disponibles se mantienen las sugerencias por defecto.
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Nunca muestra sugerencias de otro proyecto mientras llega la respuesta nueva.
  return result?.projectId === projectId
    ? result.suggestions
    : DEFAULT_CHAT_PROMPT_SUGGESTIONS
}
