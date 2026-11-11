/**
 * Menú de herramientas del modo Zen: se muestra cuando el mouse entra en la
 * zona superior (o recibe foco) y se oculta solo, pero sin apuro, para que dé
 * tiempo de volver a él.
 */

/** Tiempo que sigue abierto después de que el mouse salió de la zona. */
export const ZEN_TOOLBAR_HIDE_DELAY_MS = 2000

/** Cada cuánto se revisa si ya corresponde ocultarlo. */
export const ZEN_TOOLBAR_POLL_MS = 250

/**
 * Decide si el menú ya puede ocultarse.
 *
 * - `engaged`: el mouse está sobre el menú, hay foco de teclado dentro o
 *   hay un desplegable suyo abierto. Mientras sea true nunca se oculta.
 * - `idleMs`: tiempo transcurrido desde la última vez que estuvo en uso.
 */
export function shouldHideZenToolbar({
  engaged,
  idleMs,
  delayMs = ZEN_TOOLBAR_HIDE_DELAY_MS,
}: {
  engaged: boolean
  idleMs: number
  delayMs?: number
}): boolean {
  return !engaged && idleMs >= delayMs
}
