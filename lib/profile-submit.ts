export type ProfileSubmitSection = "account" | "ai" | "entityRecognition" | "inconsistencies"

export type ProfileSubmitInput = {
  section: ProfileSubmitSection
  aiKeyFilled: boolean
  hasUnsavedChanges: boolean
  entityRecognitionLoading: boolean
  inconsistenciesLoading: boolean
  hasSelectedProject: boolean
}

const MUTED_SUBMIT_CLASS =
  "bg-muted text-muted-foreground shadow-none hover:bg-muted hover:text-muted-foreground"

function isSectionUnavailable(input: ProfileSubmitInput) {
  if (input.section === "entityRecognition") return input.entityRecognitionLoading
  if (input.section === "inconsistencies") {
    return input.inconsistenciesLoading || !input.hasSelectedProject
  }
  return false
}

/** Decide si el botón principal de «Configuración» se puede usar y cómo se ve. */
export function getProfileSubmitState(input: ProfileSubmitInput) {
  const submitDisabled =
    input.section === "ai"
      ? !input.aiKeyFilled
      : !input.hasUnsavedChanges || isSectionUnavailable(input)

  return {
    submitDisabled,
    submitButtonClassName: input.hasUnsavedChanges ? undefined : MUTED_SUBMIT_CLASS,
  }
}
