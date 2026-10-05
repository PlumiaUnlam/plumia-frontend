export function getWorldbuildingEntityHref(
  projectId: string,
  entityId: string,
): string {
  return `/projects/${encodeURIComponent(projectId)}/worldbuilding?tab=wiki&entityId=${encodeURIComponent(entityId)}`;
}

export function getWorldbuildingTimelineEventHref(
  projectId: string,
  eventId: string,
): string {
  return `/projects/${encodeURIComponent(projectId)}/worldbuilding?tab=timeline&eventId=${encodeURIComponent(eventId)}`;
}
