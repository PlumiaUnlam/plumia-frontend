import type NSpell from "nspell"
import type { SpellcheckLanguage } from "@/types/editor-search"

const dictionaries = new Map<SpellcheckLanguage, Promise<NSpell>>()

/** Los diccionarios se sirven desde la aplicación; las palabras no se envían a ningún servidor. */
export function loadSpellchecker(language: SpellcheckLanguage): Promise<NSpell> {
  const cached = dictionaries.get(language)
  if (cached) return cached

  const code = language === "en-US" ? "en" : "es"
  const loading = Promise.all([
    import("nspell"),
    fetch(`/spellcheck/${code}.aff`).then(readDictionary),
    fetch(`/spellcheck/${code}.dic`).then(readDictionary),
  ]).then(([{ default: nspell }, aff, dic]) => nspell({ aff, dic }))
  dictionaries.set(language, loading)
  loading.catch(() => {
    // Un fallo de red no debe impedir volver a intentar cargar el diccionario.
    if (dictionaries.get(language) === loading) dictionaries.delete(language)
  })
  return loading
}

async function readDictionary(response: Response) {
  if (!response.ok) throw new Error("No se pudo cargar el diccionario ortográfico.")
  return response.text()
}
