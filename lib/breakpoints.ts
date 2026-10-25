/**
 * Breakpoints de la app, en px absolutos. Deben coincidir con `--breakpoint-*`
 * de app/globals.css (md = tablet, lg = desktop).
 *
 *   Mobile  < 768
 *   Tablet  768 – 1023
 *   Desktop >= 1024
 */
export const BREAKPOINTS = {
  sm: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  ultra: 1536,
} as const
