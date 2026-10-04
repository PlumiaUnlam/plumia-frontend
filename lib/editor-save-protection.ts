/** Un guardado fallido debe impedir desmontar el documento que conserva los cambios. */
export async function requireSuccessfulSave(save: () => Promise<unknown>): Promise<void> {
  const result = await save()
  if (result && typeof result === "object" && "status" in result && result.status === "failed") {
    throw new Error("No se pudieron guardar los cambios. El documento sigue abierto; reintentá antes de continuar.")
  }
}

/** La confirmación de cierre pertenece al navegador; el contenido se guarda antes al ocultar la página. */
export function protectPendingEditorChanges(
  windowTarget: Pick<Window, "addEventListener" | "removeEventListener">,
  documentTarget: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">,
  hasPendingChanges: () => boolean,
  flush: () => void,
) {
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasPendingChanges()) return
    event.preventDefault()
  }
  const visibilityChange = () => {
    if (documentTarget.visibilityState === "hidden" && hasPendingChanges()) flush()
  }
  windowTarget.addEventListener("beforeunload", beforeUnload)
  documentTarget.addEventListener("visibilitychange", visibilityChange)
  return () => {
    windowTarget.removeEventListener("beforeunload", beforeUnload)
    documentTarget.removeEventListener("visibilitychange", visibilityChange)
  }
}
