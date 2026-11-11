import assert from "node:assert/strict"

import { getProfileSubmitState, isAiConfigurationUnchanged, type ProfileSubmitInput } from "../lib/profile-submit"

const base: ProfileSubmitInput = {
  section: "account",
  aiConfigurationValid: false,
  aiSettingsLoading: false,
  hasUnsavedChanges: true,
  entityRecognitionLoading: false,
  inconsistenciesLoading: false,
  hasSelectedProject: true,
}

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

check("sin cambios el botón queda deshabilitado y apagado", () => {
  const state = getProfileSubmitState({ ...base, hasUnsavedChanges: false })
  assert.equal(state.submitDisabled, true)
  assert.ok(state.submitButtonClassName?.includes("bg-muted"))
})

check("con cambios en la cuenta se puede guardar", () => {
  const state = getProfileSubmitState(base)
  assert.equal(state.submitDisabled, false)
  assert.equal(state.submitButtonClassName, undefined)
})

check("la sección de IA requiere cambios y una configuración válida", () => {
  assert.equal(getProfileSubmitState({ ...base, section: "ai", hasUnsavedChanges: false }).submitDisabled, true)
  assert.equal(
    getProfileSubmitState({ ...base, section: "ai", aiConfigurationValid: true, hasUnsavedChanges: false }).submitDisabled,
    true,
  )
  assert.equal(
    getProfileSubmitState({ ...base, section: "ai", hasUnsavedChanges: true }).submitDisabled,
    true,
  )
  assert.equal(
    getProfileSubmitState({ ...base, section: "ai", aiConfigurationValid: true }).submitDisabled,
    false,
  )
  assert.equal(
    getProfileSubmitState({ ...base, section: "ai", aiSettingsLoading: true }).submitDisabled,
    true,
  )
})

check("reconocimiento espera a que termine de cargar", () => {
  assert.equal(
    getProfileSubmitState({ ...base, section: "entityRecognition", entityRecognitionLoading: true }).submitDisabled,
    true,
  )
  assert.equal(getProfileSubmitState({ ...base, section: "entityRecognition" }).submitDisabled, false)
})

check("inconsistencias necesita un proyecto elegido y datos cargados", () => {
  assert.equal(
    getProfileSubmitState({ ...base, section: "inconsistencies", hasSelectedProject: false }).submitDisabled,
    true,
  )
  assert.equal(
    getProfileSubmitState({ ...base, section: "inconsistencies", inconsistenciesLoading: true }).submitDisabled,
    true,
  )
  assert.equal(getProfileSubmitState({ ...base, section: "inconsistencies" }).submitDisabled, false)
})

const saved = { provider: "gemini", model: "gemini-pro", credentialSource: "user" }

check("sin configuración guardada nunca se considera sin cambios", () => {
  assert.equal(isAiConfigurationUnchanged(null, saved), false)
})

check("la misma configuración (ignorando espacios del modelo) está sin cambios", () => {
  assert.equal(isAiConfigurationUnchanged(saved, { ...saved, model: "  gemini-pro " }), true)
})

check("cambiar proveedor, modelo u origen de la clave cuenta como cambio", () => {
  assert.equal(isAiConfigurationUnchanged(saved, { ...saved, provider: "openai" }), false)
  assert.equal(isAiConfigurationUnchanged(saved, { ...saved, model: "otro" }), false)
  assert.equal(isAiConfigurationUnchanged(saved, { ...saved, credentialSource: "system" }), false)
})

console.log(`profile-submit: ${passed} pruebas`)
