/** Título de una tarjeta creada por voz: primera frase de la transcripción. */
export function voiceTitle(text: string): string {
  const firstSentence = text.split(/[.!?]/u)[0]?.trim() ?? ""
  const title = firstSentence || text.trim()
  return title.slice(0, 200) || "Idea registrada por voz"
}
