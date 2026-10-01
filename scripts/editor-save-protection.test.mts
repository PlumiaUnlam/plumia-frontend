import assert from "node:assert/strict"
import test from "node:test"
import { protectPendingEditorChanges, requireSuccessfulSave } from "../lib/editor-save-protection"

test("un error de guardado conserva el documento y permite reintentar el cambio", async () => {
  let scene = "actual"
  const changeScene = async (save: () => Promise<unknown>) => {
    await requireSuccessfulSave(save)
    scene = "siguiente"
  }
  await assert.rejects(changeScene(async () => ({ status: "failed" })), /documento sigue abierto/)
  assert.equal(scene, "actual")
  await changeScene(async () => ({ status: "saved" }))
  assert.equal(scene, "siguiente")
})

test("espera a que termine el guardado y propaga los errores de red", async () => {
  let complete!: (result: { status: "saved" }) => void
  let changed = false
  const saving = new Promise<{ status: "saved" }>((resolve) => { complete = resolve })
  const navigation = requireSuccessfulSave(() => saving).then(() => { changed = true })
  await Promise.resolve()
  assert.equal(changed, false)
  complete({ status: "saved" })
  await navigation
  assert.equal(changed, true)
  await assert.rejects(requireSuccessfulSave(async () => { throw new Error("Sin conexión") }), /Sin conexión/)
  await requireSuccessfulSave(async () => ({ status: "unchanged" }))
})

test("advierte al cerrar sólo con cambios pendientes y guarda al ocultar la página", () => {
  const windowEvents = new EventTarget()
  const documentEvents = new EventTarget()
  const windowTarget = {
    addEventListener: windowEvents.addEventListener.bind(windowEvents) as Window["addEventListener"],
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents) as Window["removeEventListener"],
  }
  const documentTarget = {
    addEventListener: documentEvents.addEventListener.bind(documentEvents) as Document["addEventListener"],
    removeEventListener: documentEvents.removeEventListener.bind(documentEvents) as Document["removeEventListener"],
    visibilityState: "visible" as DocumentVisibilityState,
  }
  let pending = true
  let flushes = 0
  const cleanup = protectPendingEditorChanges(windowTarget, documentTarget, () => pending, () => { flushes += 1 })
  const close = new Event("beforeunload", { cancelable: true })
  windowEvents.dispatchEvent(close)
  assert.equal(close.defaultPrevented, true)
  assert.equal(flushes, 0)
  documentEvents.dispatchEvent(new Event("visibilitychange"))
  assert.equal(flushes, 0)
  documentTarget.visibilityState = "hidden"
  documentEvents.dispatchEvent(new Event("visibilitychange"))
  assert.equal(flushes, 1)
  pending = false
  const cleanClose = new Event("beforeunload", { cancelable: true })
  windowEvents.dispatchEvent(cleanClose)
  assert.equal(cleanClose.defaultPrevented, false)
  documentEvents.dispatchEvent(new Event("visibilitychange"))
  assert.equal(flushes, 1)
  cleanup()
  pending = true
  const unmountedClose = new Event("beforeunload", { cancelable: true })
  windowEvents.dispatchEvent(unmountedClose)
  documentEvents.dispatchEvent(new Event("visibilitychange"))
  assert.equal(unmountedClose.defaultPrevented, false)
  assert.equal(flushes, 1)
})
