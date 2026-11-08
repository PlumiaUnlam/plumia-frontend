// Cada etiqueta del dominio empieza y termina con letra o número (no con guion).
const EMAIL_PATTERN =
  /^(?![.])(?:[a-zA-Z0-9_'/+.-]+)@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

export function isEmail(value: string) {
  return EMAIL_PATTERN.test(value)
}
