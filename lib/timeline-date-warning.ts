type OrderedTimelineEvent = {
  id: string
  title: string
  date: string | null
}

type TimelinePlacement = {
  beforeEventId?: string
  afterEventId?: string
}

function parseIsoDate(value: string | null): number | null {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)

  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? timestamp
    : null
}

function findClosestDatedEvent(
  events: OrderedTimelineEvent[],
  startIndex: number,
  step: -1 | 1,
): OrderedTimelineEvent | null {
  for (let index = startIndex; index >= 0 && index < events.length; index += step) {
    if (parseIsoDate(events[index].date) !== null) return events[index]
  }

  return null
}

export function getTimelineDateWarning(
  events: OrderedTimelineEvent[],
  movingEventId: string,
  placement: TimelinePlacement,
): string | null {
  const movingEvent = events.find((event) => event.id === movingEventId)
  const movingDate = parseIsoDate(movingEvent?.date ?? null)
  if (!movingEvent || movingDate === null) return null

  const nextEvents = events.filter((event) => event.id !== movingEventId)
  const beforeIndex = placement.beforeEventId
    ? nextEvents.findIndex((event) => event.id === placement.beforeEventId)
    : -1
  const afterIndex = placement.afterEventId
    ? nextEvents.findIndex((event) => event.id === placement.afterEventId)
    : -1

  const insertIndex = beforeIndex >= 0
    ? beforeIndex
    : afterIndex >= 0
      ? afterIndex + 1
      : -1
  if (insertIndex === -1) return null

  nextEvents.splice(insertIndex, 0, movingEvent)

  const previous = findClosestDatedEvent(nextEvents, insertIndex - 1, -1)
  const next = findClosestDatedEvent(nextEvents, insertIndex + 1, 1)
  const previousDate = parseIsoDate(previous?.date ?? null)
  const nextDate = parseIsoDate(next?.date ?? null)

  if (previous && previousDate !== null && movingDate < previousDate) {
    return `La fecha ${movingEvent.date} queda después de “${previous.title}”, cuya fecha es ${previous.date}.`
  }
  if (next && nextDate !== null && movingDate > nextDate) {
    return `La fecha ${movingEvent.date} queda antes de “${next.title}”, cuya fecha es ${next.date}.`
  }

  return null
}
