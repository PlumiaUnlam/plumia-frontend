import type { AiCredentialSource, AiSettings, EntityRecognitionThresholds } from "@/services/ai-settings.service"
import type { RejectedEntityRecognitionProposal } from "@/services/entity-recognition-settings.service"
import type { KnowledgeReviewSettings } from "@/services/knowledge-review-settings.service"
import type { ProjectResponse } from "@/services/project.service"

/**
 * Cálculos de «Configuración» que no dependen de React: qué mostrar, qué filtrar y si hay
 * cambios sin guardar. Viven acá para poder probarlos solos y para que el componente
 * solo tenga que armar la pantalla.
 */

export function normalizeEntityName(name: string) {
  return name
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()
}

export function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function getProjectWorldRules(project: ProjectResponse | undefined) {
  const genreRules = project?.genreRules
  if (!genreRules || Array.isArray(genreRules)) return []

  const rules = genreRules.rules
  return Array.isArray(rules)
    ? rules.filter((rule): rule is string => typeof rule === "string")
    : []
}

/** Filtra por texto ignorando tildes y mayúsculas; sin búsqueda devuelve todo. */
export function filterByText<T>(items: T[], search: string, textOf: (item: T) => string) {
  const normalizedSearch = normalizeEntityName(search)
  if (!normalizedSearch) return items
  return items.filter((item) => normalizeEntityName(textOf(item)).includes(normalizedSearch))
}

export function filterRejectedProposals(
  proposals: RejectedEntityRecognitionProposal[],
  search: string,
  typeFilter: string,
) {
  const byText = filterByText(proposals, search, (proposal) =>
    [proposal.name, ...proposal.aliases].join(" "),
  )
  if (typeFilter === "ALL") return byText
  return byText.filter((proposal) => proposal.type?.toUpperCase() === typeFilter)
}

type AiProviderOption = AiSettings["providers"][number]

export function describeAiCredential(
  source: AiCredentialSource,
  option: AiProviderOption | undefined,
) {
  if (source === "USER") {
    if (!option?.userKeyConfigured) {
      return "Guardá una clave personal para este proveedor en la sección siguiente."
    }
    return option.keyPrefix
      ? `Se usará tu clave cifrada (${option.keyPrefix}).`
      : "Se usará tu clave cifrada."
  }
  if (option?.serverCredentialAvailable) {
    return "Se usará la credencial configurada por PlumIA para este proveedor."
  }
  return "PlumIA no tiene una credencial disponible para este proveedor."
}

/** Hay modelo elegido y una credencial disponible para el origen elegido. */
export function isAiConfigurationValid(
  model: string,
  source: AiCredentialSource,
  option: AiProviderOption | undefined,
) {
  if (!model.trim()) return false
  if (source === "USER") return Boolean(option?.userKeyConfigured)
  if (source === "SERVER") return Boolean(option?.serverCredentialAvailable)
  return false
}

export function hasUnsavedAccountChanges(input: {
  displayName: string
  currentDisplayName: string
  avatarFile: File | null
  avatarPreview: string | null
  removeAvatar: boolean
}) {
  return (
    input.displayName.trim() !== input.currentDisplayName.trim() ||
    input.avatarFile !== null ||
    input.avatarPreview !== null ||
    input.removeAvatar
  )
}

export function haveEntityThresholdsChanged(
  current: EntityRecognitionThresholds,
  saved: EntityRecognitionThresholds,
) {
  return Object.entries(current).some(
    ([type, value]) => saved[type as keyof EntityRecognitionThresholds] !== value,
  )
}

export type EntityRecognitionBaseline = {
  projectId: string | null
  importantEntityNames: string[]
  ignoredEntityNames: string[]
}

export function haveEntityListsChanged(
  baseline: EntityRecognitionBaseline,
  selectedProjectId: string | null,
  important: string[],
  ignored: string[],
) {
  if (baseline.projectId !== selectedProjectId) return false
  return (
    !areStringArraysEqual(important, baseline.importantEntityNames) ||
    !areStringArraysEqual(ignored, baseline.ignoredEntityNames)
  )
}

export type KnowledgeReviewBaseline = Pick<
  KnowledgeReviewSettings,
  | "stateTrackingEnabled"
  | "stateReviewMode"
  | "stateConfidenceThreshold"
  | "relationshipReviewMode"
  | "relationshipConfidenceThreshold"
  | "crossChunkAuditMode"
> & { projectId: string | null }

const REVIEW_FIELDS = [
  "stateTrackingEnabled",
  "stateReviewMode",
  "stateConfidenceThreshold",
  "relationshipReviewMode",
  "relationshipConfidenceThreshold",
  "crossChunkAuditMode",
] as const

export function haveReviewSettingsChanged(
  baseline: KnowledgeReviewBaseline,
  selectedProjectId: string | null,
  current: KnowledgeReviewSettings,
) {
  if (baseline.projectId !== selectedProjectId) return false
  return REVIEW_FIELDS.some((field) => current[field] !== baseline[field])
}

export function baselineFromReviewSettings(
  projectId: string | null,
  settings: KnowledgeReviewSettings,
): KnowledgeReviewBaseline {
  return {
    projectId,
    stateTrackingEnabled: settings.stateTrackingEnabled,
    stateReviewMode: settings.stateReviewMode,
    stateConfidenceThreshold: settings.stateConfidenceThreshold,
    relationshipReviewMode: settings.relationshipReviewMode,
    relationshipConfidenceThreshold: settings.relationshipConfidenceThreshold,
    crossChunkAuditMode: settings.crossChunkAuditMode,
  }
}

type IdentitySource = {
  user: {
    id: string
    displayName?: string | null
    name?: string | null
    avatarUrl?: string | null
    email?: string | null
    updatedAt: string
  } | null
  firebaseUser: {
    uid: string
    displayName: string | null
    photoURL: string | null
    email: string | null
  } | null
}

/** Nombre, foto y correo que se muestran de la persona, con lo guardado o lo de su cuenta. */
export function resolveProfileIdentity({ user, firebaseUser }: IdentitySource) {
  const displayName = user?.displayName || firebaseUser?.displayName || user?.name || "Usuario"
  const photoUrl = user?.avatarUrl || firebaseUser?.photoURL || null
  const storedUserId = /\/profiles\/([^/]+)\//.exec(photoUrl ?? "")?.[1]
  const userId = user?.id || storedUserId || firebaseUser?.uid
  const avatarSrc =
    user?.avatarUrl && userId
      ? `/api/storage/profile-image/${userId}?v=${Date.parse(user.updatedAt)}`
      : null
  return { displayName, avatarSrc, userId, email: user?.email || firebaseUser?.email || "" }
}

/** Qué imagen se muestra en el diálogo: la nueva elegida, la guardada, o ninguna si se la quitó. */
export function resolvePreviewSrc(
  avatarPreview: string | null,
  removeAvatar: boolean,
  currentAvatarSrc: string | null,
) {
  if (avatarPreview) return avatarPreview
  return removeAvatar ? null : currentAvatarSrc
}

/** Las reglas del mundo que se están editando difieren de las guardadas del proyecto elegido. */
export function haveWorldRulesChanged(
  selectedProjectId: string | null,
  projects: ProjectResponse[],
  worldRules: string[],
) {
  if (selectedProjectId === null) return false
  const saved = getProjectWorldRules(projects.find((project) => project.id === selectedProjectId))
  return !areStringArraysEqual(worldRules, saved)
}

/** Ícono del tema: sol, luna o monitor (automático). */
export function themeIconKey(theme: string | undefined): "sun" | "moon" | "monitor" {
  if (theme === "dark") return "moon"
  if (theme === "light") return "sun"
  return "monitor"
}
