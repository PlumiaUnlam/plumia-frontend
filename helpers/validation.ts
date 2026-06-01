export function isEmail(value: string) {
  return /^(?![.])(?:[a-zA-Z0-9_'\/+\-.]+)@(?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}$/.test(value)
}
