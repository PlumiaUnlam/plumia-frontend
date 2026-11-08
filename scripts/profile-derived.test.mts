import assert from "node:assert/strict"

import {
  areStringArraysEqual,
  baselineFromReviewSettings,
  describeAiCredential,
  filterByText,
  filterRejectedProposals,
  hasUnsavedAccountChanges,
  haveEntityListsChanged,
  haveEntityThresholdsChanged,
  haveReviewSettingsChanged,
  haveWorldRulesChanged,
  isAiConfigurationValid,
  normalizeEntityName,
  resolvePreviewSrc,
  resolveProfileIdentity,
  themeIconKey,
} from "../lib/profile-derived"
import { hasAiConfigurationChanged } from "../lib/profile-submit"

let passed = 0
function check(name: string, fn: () => void) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

check("normaliza tildes, mayúsculas y signos", () => {
  assert.equal(normalizeEntityName("  Álvaro-Ñandú  "), "alvaro nandu")
})

check("compara listas de texto en orden", () => {
  assert.equal(areStringArraysEqual(["a", "b"], ["a", "b"]), true)
  assert.equal(areStringArraysEqual(["a", "b"], ["b", "a"]), false)
})

check("filtra por texto sin importar tildes y sin búsqueda deja todo", () => {
  const names = ["Álvaro", "Beatriz"]
  assert.deepEqual(filterByText(names, "alva", (name) => name), ["Álvaro"])
  assert.deepEqual(filterByText(names, "  ", (name) => name), names)
})

check("las propuestas rechazadas se filtran por texto (con alias) y por tipo", () => {
  const proposals = [
    { name: "Maren", aliases: ["La capitana"], type: "character" },
    { name: "Faro", aliases: [], type: "LOCATION" },
  ] as never
  assert.equal(filterRejectedProposals(proposals, "capitana", "ALL").length, 1)
  assert.equal(filterRejectedProposals(proposals, "", "LOCATION").length, 1)
  assert.equal(filterRejectedProposals(proposals, "", "ALL").length, 2)
})

const withKey = { userKeyConfigured: true, keyPrefix: "AIza", serverCredentialAvailable: false } as never
const withoutKey = { userKeyConfigured: false, keyPrefix: null, serverCredentialAvailable: true } as never

check("describe la credencial según el origen elegido", () => {
  assert.match(describeAiCredential("USER", withKey), /AIza/)
  assert.match(describeAiCredential("USER", withoutKey), /Guardá una clave/)
  assert.match(describeAiCredential("SERVER", withoutKey), /credencial configurada por PlumIA/)
  assert.match(describeAiCredential("SERVER", withKey), /no tiene una credencial/)
  assert.match(describeAiCredential("SERVER", undefined), /no tiene una credencial/)
})

check("la configuración de IA es válida con modelo y credencial disponible", () => {
  assert.equal(isAiConfigurationValid("gemini-pro", "USER", withKey), true)
  assert.equal(isAiConfigurationValid("  ", "USER", withKey), false)
  assert.equal(isAiConfigurationValid("gemini-pro", "USER", withoutKey), false)
  assert.equal(isAiConfigurationValid("gemini-pro", "SERVER", withoutKey), true)
})

check("detecta cambios sin guardar en la cuenta", () => {
  const base = { displayName: "Ana", currentDisplayName: "Ana", avatarFile: null, avatarPreview: null, removeAvatar: false }
  assert.equal(hasUnsavedAccountChanges(base), false)
  assert.equal(hasUnsavedAccountChanges({ ...base, displayName: "Ana M." }), true)
  assert.equal(hasUnsavedAccountChanges({ ...base, removeAvatar: true }), true)
  assert.equal(hasUnsavedAccountChanges({ ...base, avatarPreview: "blob:x" }), true)
})

check("detecta cambios de umbrales y de listas de entidades", () => {
  assert.equal(haveEntityThresholdsChanged({ A: 1 } as never, { A: 1 } as never), false)
  assert.equal(haveEntityThresholdsChanged({ A: 2 } as never, { A: 1 } as never), true)
  const baseline = { projectId: "p1", importantEntityNames: ["a"], ignoredEntityNames: [] }
  assert.equal(haveEntityListsChanged(baseline, "p1", ["a"], []), false)
  assert.equal(haveEntityListsChanged(baseline, "p1", ["a", "b"], []), true)
  assert.equal(haveEntityListsChanged(baseline, "otro", ["a", "b"], []), false)
})

const review = {
  stateTrackingEnabled: false,
  stateReviewMode: "MANUAL",
  stateConfidenceThreshold: 0.9,
  relationshipReviewMode: "MANUAL",
  relationshipConfidenceThreshold: 0.9,
  crossChunkAuditMode: "ADJACENT_CHUNKS",
  updatedAt: "",
} as never

check("detecta cambios en la revisión automática solo del proyecto elegido", () => {
  const baseline = baselineFromReviewSettings("p1", review)
  assert.equal(haveReviewSettingsChanged(baseline, "p1", review), false)
  assert.equal(haveReviewSettingsChanged(baseline, "p1", { ...(review as object), stateTrackingEnabled: true } as never), true)
  assert.equal(haveReviewSettingsChanged(baseline, "p2", { ...(review as object), stateTrackingEnabled: true } as never), false)
})

check("detecta cambios en las reglas del mundo contra las guardadas", () => {
  const projects = [{ id: "p1", genreRules: { rules: ["a"] } }] as never
  assert.equal(haveWorldRulesChanged(null, projects, ["x"]), false)
  assert.equal(haveWorldRulesChanged("p1", projects, ["a"]), false)
  assert.equal(haveWorldRulesChanged("p1", projects, ["a", "b"]), true)
})

check("la identidad usa lo guardado y, si falta, lo de la cuenta", () => {
  const empty = resolveProfileIdentity({ user: null, firebaseUser: null })
  assert.equal(empty.displayName, "Usuario")
  assert.equal(empty.avatarSrc, null)
  const fromAccount = resolveProfileIdentity({
    user: null,
    firebaseUser: { uid: "u1", displayName: "Ana", photoURL: null, email: "a@b.c" },
  })
  assert.equal(fromAccount.displayName, "Ana")
  assert.equal(fromAccount.email, "a@b.c")
  assert.equal(fromAccount.userId, "u1")
  const saved = resolveProfileIdentity({
    user: { id: "u9", displayName: "Bea", avatarUrl: "x", email: "b@c.d", updatedAt: "2026-01-01T00:00:00.000Z" },
    firebaseUser: null,
  })
  assert.match(saved.avatarSrc ?? "", /^\/api\/storage\/profile-image\/u9\?v=\d+$/)
})

check("la vista previa prioriza la imagen nueva y respeta «Quitar»", () => {
  assert.equal(resolvePreviewSrc("blob:nueva", true, "/vieja"), "blob:nueva")
  assert.equal(resolvePreviewSrc(null, true, "/vieja"), null)
  assert.equal(resolvePreviewSrc(null, false, "/vieja"), "/vieja")
})

check("el ícono del tema corresponde al tema elegido", () => {
  assert.equal(themeIconKey("dark"), "moon")
  assert.equal(themeIconKey("light"), "sun")
  assert.equal(themeIconKey("system"), "monitor")
  assert.equal(themeIconKey(undefined), "monitor")
})

check("sin configuración guardada de IA no hay cambios que avisar", () => {
  const editing = { provider: "gemini", model: "m", credentialSource: "USER" }
  assert.equal(hasAiConfigurationChanged(null, editing), false)
  assert.equal(hasAiConfigurationChanged({ ...editing }, editing), false)
  assert.equal(hasAiConfigurationChanged({ ...editing, model: "otro" }, editing), true)
})

console.log(`profile-derived: ${passed} pruebas`)
