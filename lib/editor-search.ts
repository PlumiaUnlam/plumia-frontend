import type { ProseMirrorJSON } from "@/types/scene"
import type { EditorSearchMatch } from "@/types/editor-search"

type TextNodeEntry = {
  nodePath: number[]
  text: string
}

type SearchMatchOptions = {
  sceneId: string
  section: {
    title: string
    chapterTitle: string
    bookTitle: string
  }
  content: ProseMirrorJSON | null
  query: string
}

export function collectTextNodes(
  content: ProseMirrorJSON | null | undefined,
): TextNodeEntry[] {
  if (!content) return []

  const entries: TextNodeEntry[] = []

  function visit(node: unknown, nodePath: number[]) {
    if (!isRecord(node)) return

    if (node.type === "text" && typeof node.text === "string") {
      entries.push({ nodePath, text: node.text })
      return
    }

    if (!Array.isArray(node.content)) return

    node.content.forEach((child, index) => {
      visit(child, [...nodePath, index])
    })
  }

  visit(content, [])
  return entries
}

export function findEditorSearchMatches({
  sceneId,
  section,
  content,
  query,
}: SearchMatchOptions): EditorSearchMatch[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const queryLower = trimmedQuery.toLocaleLowerCase()
  const textNodes = collectTextNodes(content)
  const matches: EditorSearchMatch[] = []
  let occurrence = 0

  for (const { nodePath, text } of textNodes) {
    const textLower = text.toLocaleLowerCase()
    let offset = textLower.indexOf(queryLower)

    while (offset >= 0) {
      const contextStart = Math.max(0, offset - 36)
      const contextEnd = Math.min(text.length, offset + trimmedQuery.length + 36)
      const prefix = contextStart > 0 ? "…" : ""
      const suffix = contextEnd < text.length ? "…" : ""

      matches.push({
        id: `${sceneId}:${nodePath.join(".")}:${offset}`,
        sceneId,
        sceneTitle: section.title,
        chapterTitle: section.chapterTitle,
        bookTitle: section.bookTitle,
        occurrence,
        context: `${prefix}${text.slice(contextStart, contextEnd)}${suffix}`,
        matchedText: text.slice(offset, offset + trimmedQuery.length),
        nodePath,
        offset,
      })
      occurrence += 1
      offset = textLower.indexOf(queryLower, offset + Math.max(trimmedQuery.length, 1))
    }
  }

  return matches
}

export function replaceEditorSearchMatches(
  content: ProseMirrorJSON | null,
  matches: readonly EditorSearchMatch[],
  replacement: string,
): ProseMirrorJSON | null {
  if (!content || matches.length === 0) return content

  const matchByPath = new Map<string, Array<EditorSearchMatch>>()
  for (const match of matches) {
    const key = match.nodePath.join(".")
    const matchesForNode = matchByPath.get(key) ?? []
    matchesForNode.push(match)
    matchByPath.set(key, matchesForNode)
  }

  function cloneAndReplace(node: unknown, nodePath: number[]): unknown {
    if (Array.isArray(node)) {
      return node.map((child, index) => cloneAndReplace(child, [...nodePath, index]))
    }

    if (!isRecord(node)) return node

    if (node.type === "text" && typeof node.text === "string") {
      const nodeMatches = matchByPath.get(nodePath.join(".")) ?? []
      if (nodeMatches.length === 0) return { ...node }

      let nextText = node.text
      for (const match of [...nodeMatches].sort((left, right) => right.offset - left.offset)) {
        nextText =
          nextText.slice(0, match.offset) +
          replacement +
          nextText.slice(match.offset + match.matchedText.length)
      }

      return { ...node, text: nextText }
    }

    const next: Record<string, unknown> = { ...node }
    if (Array.isArray(node.content)) {
      next.content = node.content.map((child, index) =>
        cloneAndReplace(child, [...nodePath, index]),
      )
    }
    return next
  }

  return cloneAndReplace(content, []) as ProseMirrorJSON
}

export function groupMatchesByScene(
  matches: readonly EditorSearchMatch[],
): Map<string, EditorSearchMatch[]> {
  const grouped = new Map<string, EditorSearchMatch[]>()
  for (const match of matches) {
    const current = grouped.get(match.sceneId) ?? []
    current.push(match)
    grouped.set(match.sceneId, current)
  }
  return grouped
}

export function getSearchResultSummary(
  matches: readonly EditorSearchMatch[],
): string {
  const occurrenceLabel = matches.length === 1 ? "ocurrencia" : "ocurrencias"
  const sceneCount = new Set(matches.map((match) => match.sceneId)).size
  const sceneLabel = sceneCount === 1 ? "escena" : "escenas"
  return `${matches.length} ${occurrenceLabel} en ${sceneCount} ${sceneLabel}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
