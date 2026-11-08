export type AiConfigurationFields = {
  provider: string
  model: string
  credentialSource: string
}

/** La configuración de IA que se está editando es igual a la guardada (sin guardada, nunca lo es). */
export function isAiConfigurationUnchanged(
  saved: AiConfigurationFields | null,
  editing: AiConfigurationFields,
) {
  if (!saved) return false
  return (
    saved.provider === editing.provider &&
    saved.model === editing.model.trim() &&
    saved.credentialSource === editing.credentialSource
  )
}

/** Hay una configuración guardada y la que se edita es distinta. */
export function hasAiConfigurationChanged(
  saved: AiConfigurationFields | null,
  editing: AiConfigurationFields,
) {
  return saved !== null && !isAiConfigurationUnchanged(saved, editing)
}

export type ProfileSubmitSection = "account" | "ai" | "entityRecognition" | "inconsistencies"

export type ProfileSubmitInput = {
  section: ProfileSubmitSection
  aiConfigurationValid: boolean
  aiSettingsLoading: boolean
  hasUnsavedChanges: boolean
  entityRecognitionLoading: boolean
  inconsistenciesLoading: boolean
  hasSelectedProject: boolean
}

const MUTED_SUBMIT_CLASS =
  "bg-muted text-muted-foreground shadow-none hover:bg-muted hover:text-muted-foreground"

function isSectionUnavailable(input: ProfileSubmitInput) {
  if (input.section === "ai") return input.aiSettingsLoading
  if (input.section === "entityRecognition") return input.entityRecognitionLoading
  if (input.section === "inconsistencies") {
    return input.inconsistenciesLoading || !input.hasSelectedProject
  }
  return false
}

/** Decide si el botón principal de «Configuración» se puede usar y cómo se ve. */
export function getProfileSubmitState(input: ProfileSubmitInput) {
  const submitDisabled =
    !input.hasUnsavedChanges ||
    isSectionUnavailable(input) ||
    (input.section === "ai" && !input.aiConfigurationValid)

  return {
    submitDisabled,
    submitButtonClassName: input.hasUnsavedChanges ? undefined : MUTED_SUBMIT_CLASS,
  }
}
