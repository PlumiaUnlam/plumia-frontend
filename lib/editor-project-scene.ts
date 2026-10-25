export function resolveProjectSceneId(
  activeSceneId: string | null,
  projectSceneIds: string[],
): string | null {
  if (activeSceneId && projectSceneIds.includes(activeSceneId)) {
    return activeSceneId
  }
  return projectSceneIds[0] ?? null
}
