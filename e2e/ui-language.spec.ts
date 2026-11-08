import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"

/**
 * Idioma de la interfaz: español rioplatense (voseo). Se recorre cada pantalla
 * abriendo menús y modales y se revisa todo el texto visible y accesible.
 * Falla si aparece inglés, tuteo ("Selecciona", "Puedes") o tildes faltantes.
 */

const base = "/projects/" + projectId

// Texto que sí puede estar en inglés (marca, nombres propios, tipografías).
const ALLOWED = /^(Worldbuilding|Kanban|Zen|Wiki|Gemini|PlumIA|API Key de Gemini|Times New Roman|Courier New|Comic Sans|Open Sans|Bodoni Moda|Bree Serif)$/

const ENGLISH =
  /\b(the|and|with|from|please|failed|loading|save|cancel|delete|edit|create|search|close|invalid|required|success|warning|retry|submit|upload|download|settings|password|login|logout|next|previous|yes|unable|something went wrong|try again|sign in|sign up|log in|not found|no results|untitled)\b/i

const TUTEO_IMPERATIVE =
  /(^|[.!?¿¡]\s+)(Selecciona|Escribe|Crea|Agrega|Revisa|Introduce|Confirma|Busca|Abre|Usa|Arrastra|Haz|Inténtalo|Elige|Pulsa|Sube|Guarda|Descarga|Ingresa|Prueba|Vuelve|Espera|Verifica|Comprueba|Completa|Copia|Pega|Elimina|Edita|Activa|Desactiva|Configura|Define|Indica|Escoge|Añade|Cambia|Comparte|Invita|Restaura|Recupera|Corrige|Continúa)\b/
const TUTEO_FORMS = /\b(puedes|tienes|quieres|necesitas|deseas|sabes|crees|estás seguro|haz clic|haz click|click)\b/i

const MISSING_ACCENT =
  /\b(analisis|logica|ubicacion|condicion|revision|descripcion|titulo|configuracion|todavia|aqui|busqueda|version|sesion|pagina|ultimo|ultima|informacion|edicion|opcion|accion|creacion|eliminacion|exportacion|importacion|notificacion|invitacion|numero|codigo|capitulo|despues|tambien|rapido|facil|dificil|publico|unico|basico|automatico|automatica|maximo|minimo|contrasena)\b/i

async function visibleTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found = new Set<string>()
    const visible = (el: Element) => {
      const style = getComputedStyle(el)
      if (style.display === "none" || style.visibility === "hidden") return false
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim()
      if (text.length < 2) continue
      if (visible(parent) || parent.closest(".sr-only")) found.add(text)
    }
    for (const el of Array.from(document.querySelectorAll("[aria-label], [title], [placeholder], img[alt]"))) {
      for (const attr of ["aria-label", "title", "placeholder", "alt"]) {
        const value = el.getAttribute(attr)?.replace(/\s+/g, " ").trim()
        if (value && value.length >= 2) found.add(value)
      }
    }
    return Array.from(found)
  })
}

function problemsIn(text: string): string[] {
  if (ALLOWED.test(text)) return []
  const out: string[] = []
  if (ENGLISH.test(text)) out.push("inglés")
  if (TUTEO_IMPERATIVE.test(text) || TUTEO_FORMS.test(text)) out.push("tuteo (usar voseo)")
  if (MISSING_ACCENT.test(text)) out.push("tilde faltante")
  return out
}

const OVERLAYS =
  '[role="dialog"]:visible, [role="alertdialog"]:visible, [role="menu"]:visible, [role="listbox"]:visible'
const INNER_CONTROLS = 'button:visible, [role="combobox"]:visible, [role="tab"]:visible'
const SKIP_INNER = /^(guardar|crear|aceptar|confirmar|enviar|publicar|cerrar|cancelar|entendido|eliminar|generar|reintentar|iniciar)/i

/** Abre lo que se puede abrir dentro de un modal (listas, calendarios, pestañas, confirmaciones). */
async function scanInsideDialog(
  page: Page,
  label: string,
  scan: (context: string) => Promise<void>,
) {
  if ((await page.locator('[role="dialog"]:visible').count()) === 0) return
  const baseline = await page.locator(OVERLAYS).count()
  const total = Math.min(await page.locator('[role="dialog"]:visible').last().locator(INNER_CONTROLS).count(), 14)

  for (let j = 0; j < total; j++) {
    if ((await page.locator(OVERLAYS).count()) !== baseline) break
    const control = page.locator('[role="dialog"]:visible').last().locator(INNER_CONTROLS).nth(j)
    const text = ((await control.innerText().catch(() => "")) || (await control.getAttribute("aria-label")) || "").trim()
    if (SKIP_INNER.test(text)) continue
    try {
      await control.click({ timeout: 1000 })
    } catch {
      continue
    }
    await page.waitForTimeout(220)
    await scan("dentro de «" + label.slice(0, 24) + "» › «" + text.slice(0, 24) + "»")
    if ((await page.locator(OVERLAYS).count()) > baseline) {
      await page.keyboard.press("Escape")
      await page.waitForTimeout(220)
    }
  }
}

async function collectScreen(page: Page, url: string, problems: Map<string, string>) {
  const scan = async (context: string) => {
    for (const text of await visibleTexts(page)) {
      const found = problemsIn(text)
      if (found.length > 0) problems.set(text, found.join(", ") + " · " + context + " · " + url)
    }
  }

  await page.goto(url)
  await page.waitForTimeout(900)
  await scan("carga inicial")

  const triggers = page.locator(
    'button:visible, [role="tab"]:visible, [role="menuitem"]:visible, [role="combobox"]:visible',
  )
  const total = Math.min(await triggers.count(), 45)
  for (let i = 0; i < total; i++) {
    if (i >= (await triggers.count())) break
    const trigger = triggers.nth(i)
    const label = (await trigger.getAttribute("aria-label")) ?? (await trigger.innerText().catch(() => ""))
    if (/cerrar sesi[oó]n|modo (oscuro|claro)/i.test(label)) continue
    try {
      await trigger.click({ timeout: 1200 })
    } catch {
      continue
    }
    await page.waitForTimeout(250)
    if (new URL(page.url()).pathname !== new URL(url, "http://x").pathname) {
      await page.goto(url)
      await page.waitForTimeout(600)
      continue
    }
    await scan("tras abrir «" + label.slice(0, 30) + "»")
    await scanInsideDialog(page, label, scan)
    for (let k = 0; k < 3; k++) {
      if ((await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, [role="menu"]:visible, [role="listbox"]:visible').count()) === 0) break
      await page.keyboard.press("Escape")
      await page.waitForTimeout(200)
    }
  }
}

const SCREENS = [
  "/dashboard",
  base + "/editor",
  base + "/worldbuilding",
  base + "/worldbuilding?tab=relationships",
  base + "/worldbuilding?tab=timeline",
  base + "/worldbuilding?tab=summaries",
  base + "/storyboard",
  base + "/storyboard?view=matrix",
  base + "/statistics",
  base + "/shares",
  "/shared/invitacion-1?token=token-1",
]

for (const viewport of [
  { name: "escritorio", width: 1440, height: 900 },
  { name: "celular", width: 375, height: 812 },
]) {
  test.describe("Idioma de la interfaz — " + viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test("español rioplatense en todas las pantallas, menús y modales", async ({ page }) => {
      test.setTimeout(240_000)
      await installModalBackend(page)
      const problems = new Map<string, string>()
      for (const url of SCREENS) await collectScreen(page, url, problems)

      const lines = Array.from(problems, ([text, where]) => "«" + text.slice(0, 90) + "» → " + where)
      expect(lines, lines.join("\n")).toEqual([])
    })
  })
}

test.describe("Idioma de las pantallas públicas", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("login, registro y recuperar contraseña están en español rioplatense", async ({ page }) => {
    test.setTimeout(90_000)
    const problems = new Map<string, string>()
    for (const url of ["/login", "/register", "/forgot-password"]) await collectScreen(page, url, problems)
    const lines = Array.from(problems, ([text, where]) => "«" + text.slice(0, 90) + "» → " + where)
    expect(lines, lines.join("\n")).toEqual([])
  })
})
