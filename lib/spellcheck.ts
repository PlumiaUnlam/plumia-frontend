import type NSpell from "nspell"
import type { SpellcheckLanguage } from "@/types/editor-search"

const dictionaries = new Map<SpellcheckLanguage, Promise<NSpell>>()
const customDictionaryKey = (language: SpellcheckLanguage) => `plumia:spellcheck:custom-words:${language}`

/** Los diccionarios se sirven desde la aplicación; las palabras no se envían a ningún servidor. */
export function loadSpellchecker(language: SpellcheckLanguage): Promise<NSpell> {
  const cached = dictionaries.get(language)
  if (cached) return cached

  const code = language === "en-US" ? "en" : "es"
  const loading = Promise.all([
    import("nspell"),
    fetch(`/spellcheck/${code}.aff`).then(readDictionary),
    fetch(`/spellcheck/${code}.dic`).then(readDictionary),
  ]).then(([{ default: nspell }, aff, dic]) => {
    const spell = nspell({ aff, dic })
    for (const word of readCustomWords(language)) spell.add(word)
    return spell
  })
  dictionaries.set(language, loading)
  loading.catch(() => {
    // Un fallo de red no debe impedir volver a intentar cargar el diccionario.
    if (dictionaries.get(language) === loading) dictionaries.delete(language)
  })
  return loading
}

export async function addWordToSpellcheckDictionary(language: SpellcheckLanguage, word: string) {
  const normalizedWord = word.trim()
  if (!normalizedWord || normalizedWord.length > 64) throw new Error("La palabra no es válida.")

  const words = readCustomWords(language)
  if (!words.some((storedWord) => storedWord.toLocaleLowerCase(language) === normalizedWord.toLocaleLowerCase(language))) {
    words.push(normalizedWord)
    try {
      window.localStorage.setItem(customDictionaryKey(language), JSON.stringify(words))
    } catch {
      // El agregado sigue disponible en esta sesión aunque el navegador bloquee el almacenamiento.
    }
  }

  const spell = await loadSpellchecker(language)
  spell.add(normalizedWord)
  return spell
}

function readCustomWords(language: SpellcheckLanguage): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = JSON.parse(window.localStorage.getItem(customDictionaryKey(language)) ?? "[]")
    if (!Array.isArray(stored)) return []
    return stored.filter((word): word is string =>
      typeof word === "string" && word.length <= 64 && /^[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*$/u.test(word),
    )
  } catch {
    return []
  }
}

async function readDictionary(response: Response) {
  if (!response.ok) throw new Error("No se pudo cargar el diccionario ortográfico.")
  return response.text()
}
