export function registerEditorSaveShortcut(
  target: Pick<Window, "addEventListener" | "removeEventListener">,
  save: () => Promise<unknown>,
  onError: (error: unknown) => void,
) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey ||
      !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return
    event.preventDefault()
    if (!event.repeat) void save().catch(onError)
  }
  target.addEventListener("keydown", handleKeyDown)
  return () => target.removeEventListener("keydown", handleKeyDown)
}
