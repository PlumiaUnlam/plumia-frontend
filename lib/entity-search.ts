/**
 * Búsqueda de entidades de la wiki: primero las que coinciden por nombre,
 * después por alias y categoría, y al final las que solo aparecen en el
 * contenido (descripción, escena, capítulo). Dentro de cada grupo se conserva
 * el orden original.
 */

export interface SearchableFields {
  /** Nombre canónico de la entidad. */
  name: string
  aliases?: readonly string[]
  /** Categoría legible, por ejemplo «Personaje». */
  category?: string
  /** Textos donde la entidad solo se menciona (descripción, escena, etc.). */
  content?: ReadonlyArray<string | null | undefined>
}

/** Minúsculas y sin acentos, para que «Pinocho» y «pínocho» coincidan. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

/** Menor es mejor; `null` si no coincide en ningún campo. */
export function scoreEntityMatch(
  fields: SearchableFields,
  rawQuery: string,
): number | null {
  const query = normalizeSearchText(rawQuery)
  if (!query) return 0

  const name = normalizeSearchText(fields.name)
  if (name === query) return 0
  if (name.startsWith(query)) return 1
  if (name.split(/[^a-z0-9ñ]+/).some((word) => word.startsWith(query))) return 2
  if (name.includes(query)) return 3

  const aliases = (fields.aliases ?? []).map(normalizeSearchText)
  if (aliases.some((alias) => alias === query || alias.startsWith(query))) return 4
  if (aliases.some((alias) => alias.includes(query))) return 5

  if (fields.category && normalizeSearchText(fields.category).includes(query)) return 6

  const mentioned = (fields.content ?? []).some(
    (text) => !!text && normalizeSearchText(text).includes(query),
  )
  return mentioned ? 7 : null
}

/** Filtra y ordena `items` por relevancia de nombre; sin consulta, no cambia nada. */
export function searchEntities<T>(
  items: readonly T[],
  rawQuery: string,
  getFields: (item: T) => SearchableFields,
): T[] {
  if (!normalizeSearchText(rawQuery)) return [...items]

  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreEntityMatch(getFields(item), rawQuery),
    }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.item)
}
