import fs from "node:fs"
import path from "node:path"

import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"

/**
 * Auditoría genérica de interfaz. Recorre cada pantalla en varios tamaños y
 * temas, abre todo lo que se puede abrir (modales, menús, listas) y revisa:
 * desbordes, texto cortado, solapes, elementos tapados, nombres accesibles,
 * foco, cierre con Escape / X / Cancelar y errores de consola.
 *
 * Los hallazgos "duros" hacen fallar el test; los "blandos" (táctil pequeño,
 * foco perdido, clic afuera) solo se guardan en test-results/ui-audit/.
 */

// Es larga (≈13 min): se corre aparte con `pnpm test:ui-audit`.
test.skip(!process.env.UI_AUDIT, "Auditoría larga: usar pnpm test:ui-audit")

type ViewportSpec = {
  name: string
  width: number
  height: number
  touch: boolean
  /** Tamaño de letra base: simula quien agranda el texto del navegador. */
  rootFontPx?: number
}

const VIEWPORTS: readonly ViewportSpec[] = [
  { name: "movil-320", width: 320, height: 568, touch: true },
  { name: "movil-375", width: 375, height: 812, touch: true },
  { name: "horizontal-568", width: 568, height: 320, touch: true },
  { name: "horizontal-812", width: 812, height: 375, touch: true },
  { name: "tablet-768", width: 768, height: 1024, touch: false },
  { name: "escritorio-1024", width: 1024, height: 768, touch: false },
  // Notebooks de 13"–15": FHD con escala 150% / 125%, HD clásico y MacBook Air.
  { name: "notebook-1280x720", width: 1280, height: 720, touch: false },
  { name: "notebook-1366x768", width: 1366, height: 768, touch: false },
  { name: "notebook-1440x900", width: 1440, height: 900, touch: false },
  { name: "notebook-1536x864", width: 1536, height: 864, touch: false },
  { name: "escritorio-1440", width: 1440, height: 900, touch: false },
  // Notebook de 1280×720 con zoom del navegador al 175%: el viewport en px CSS se reduce (1280/1,75).
  { name: "zoom-175-notebook", width: 731, height: 411, touch: false },
  // Letra grande: forzar la fuente raíz sin cambiar el ancho en que cortan los breakpoints (rem, medidos
  // contra 16px) mezcla layouts que ningún navegador produce. El equivalente real es el zoom de arriba.
]

type Theme = "light" | "dark"

const OVERLAY = ["dialog", "alertdialog", "menu", "listbox"]
  .map((role) => `[role="${role}"]:visible`)
  .join(",")

const IGNORED_CONSOLE =
  /Failed to load resource|favicon|net::ERR|Download the React DevTools|Endpoint e2e no simulado/i

const SKIP_TRIGGER =
  /cerrar sesi[oó]n|salir|logout|modo (oscuro|claro)|cambiar tema|^tema/i

const SKIP_INNER =
  /^(guardar|crear|aceptar|confirmar|enviar|publicar|cerrar sesi[oó]n|cerrar|cancelar|entendido|generar|reintentar)/i

const SOFT = /objetivo táctil|foco|clic afuera|truncado/i

type AuditOptions = { overlay: boolean; touch: boolean }

/** Se ejecuta dentro del navegador: no puede usar nada del módulo. */
function auditDom(root: Element, opts: AuditOptions): string[] {
  const out: string[] = []
  const vw = window.innerWidth
  const vh = window.innerHeight

  const isVisible = (el: Element) => {
    const style = getComputedStyle(el)
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      return false
    }
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }
  const isSrOnly = (el: Element) =>
    el.classList.contains("sr-only") ||
    !!el.closest(".sr-only") ||
    !!el.closest('[role="tooltip"],[data-slot="tooltip-content"],[data-sidebar="rail"],.react-flow')

  const describe = (el: Element) => {
    const label = (
      el.getAttribute("aria-label") ||
      (el as HTMLElement).innerText ||
      el.getAttribute("placeholder") ||
      el.getAttribute("title") ||
      el.id ||
      ""
    )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40)
    return el.tagName.toLowerCase() + (label ? ` "${label}"` : "")
  }

  const fixedChrome = (el: Element) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (getComputedStyle(node).position === "fixed") return node
    }
    return null
  }

  const clips = (style: CSSStyleDeclaration) =>
    ["hidden", "clip", "auto", "scroll"].includes(style.overflowX) ||
    ["hidden", "clip", "auto", "scroll"].includes(style.overflowY)

  /** El elemento queda fuera de un contenedor con scroll/recorte: es a propósito. */
  const outsideScrollAncestor = (el: Element) => {
    const rect = el.getBoundingClientRect()
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (!clips(style)) continue
      const box = node.getBoundingClientRect()
      if (
        rect.left < box.left - 1 ||
        rect.right > box.right + 1 ||
        rect.top < box.top - 1 ||
        rect.bottom > box.bottom + 1
      ) {
        return true
      }
    }
    return false
  }

  const accessibleName = (el: Element) => {
    const aria = el.getAttribute("aria-label")?.trim()
    if (aria) return aria
    const labelledby = el.getAttribute("aria-labelledby")
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim()
      if (text) return text
    }
    const text = ((el as HTMLElement).innerText || el.textContent || "").trim()
    if (text) return text
    const title = el.getAttribute("title")?.trim()
    if (title) return title
    const img = el.querySelector("img[alt]")?.getAttribute("alt")?.trim()
    if (img) return img
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
      if (label?.textContent?.trim()) return label.textContent.trim()
    }
    const wrapping = el.closest("label")?.textContent?.trim()
    if (wrapping) return wrapping
    return el.getAttribute("placeholder")?.trim() ?? ""
  }

  // ---------- la raíz
  if (opts.overlay) {
    const rect = root.getBoundingClientRect()
    if (
      rect.left < -1 ||
      rect.top < -1 ||
      rect.right > vw + 1 ||
      rect.bottom > vh + 1
    ) {
      out.push(
        `overlay fuera de la pantalla (l${Math.round(rect.left)} t${Math.round(rect.top)} r${Math.round(rect.right)} b${Math.round(rect.bottom)} en ${vw}x${vh})`,
      )
    }
    const role = root.getAttribute("role")
    if (role === "dialog" || role === "alertdialog") {
      if (!accessibleName(root) && !root.getAttribute("aria-labelledby")) {
        out.push("modal sin nombre accesible")
      }
    }
  } else {
    const doc = document.documentElement
    if (doc.scrollWidth > vw + 1) {
      out.push(`scroll horizontal de la página (${doc.scrollWidth} > ${vw})`)
    }
    const seen = new Map<string, number>()
    for (const el of Array.from(document.querySelectorAll("[id]"))) {
      seen.set(el.id, (seen.get(el.id) ?? 0) + 1)
    }
    for (const [id, count] of seen) {
      if (count > 1 && !/^radix|^:r/.test(id)) out.push(`id duplicado "${id}" (${count})`)
    }
  }

  // ---------- elementos
  const interactiveSel =
    'button,a[href],input:not([type="hidden"]),select,textarea,[role="button"],[role="menuitem"],[role="tab"],[role="option"],[role="checkbox"],[role="switch"],[role="combobox"]'
  const textSel = "h1,h2,h3,h4,label,p,li,th,td,legend,[role='tab'],button,a,span"

  const interactive = Array.from(root.querySelectorAll(interactiveSel))
    .filter((el) => isVisible(el) && !isSrOnly(el))
    .slice(0, 350)

  for (const el of interactive) {
    const rect = el.getBoundingClientRect()
    const tag = el.tagName.toLowerCase()
    if (el.getAttribute("aria-hidden") === "true" || el.closest("[aria-hidden='true']")) continue
    const disabled = (el as HTMLButtonElement).disabled === true
    const scrolledAway = outsideScrollAncestor(el)

    if ((rect.right > vw + 1 || rect.left < -1) && !scrolledAway) {
      out.push(`fuera de pantalla horizontal: ${describe(el)} (l${Math.round(rect.left)} r${Math.round(rect.right)} en ${vw})`)
    }

    if (!accessibleName(el)) {
      const type = el.getAttribute("type")
      if (!(tag === "input" && (type === "file" || type === "range" && false))) {
        out.push(`sin nombre accesible: ${tag}${el.id ? "#" + el.id : ""} ${String(el.className).slice(0, 50)}`)
      }
    }

    if (opts.touch && !disabled && (rect.width < 24 || rect.height < 24)) {
      const inline = tag === "a" && !!el.closest("p,li")
      if (!inline && tag !== "input") {
        out.push(`objetivo táctil pequeño ${Math.round(rect.width)}x${Math.round(rect.height)}: ${describe(el)}`)
      }
    }

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    if (!scrolledAway && cx >= 0 && cy >= 0 && cx <= vw && cy <= vh && !disabled) {
      const top = document.elementFromPoint(cx, cy)
      const coveredByRow =
        top instanceof Element &&
        top.matches("button,a[href]") &&
        (() => {
          const tr = top.getBoundingClientRect()
          return rect.left >= tr.left - 1 && rect.right <= tr.right + 1 && rect.top >= tr.top - 1 && rect.bottom <= tr.bottom + 1
        })()
      const sameListItem =
        top instanceof Element && !!el.closest("li") && el.closest("li") === top.closest("li")
      if (coveredByRow || sameListItem) {
        // Acción pequeña que vive dentro de una fila clicable (se revela al pasar el cursor).
      } else if (top && top !== el && !el.contains(top) && !top.contains(el)) {
        const label = top.closest("label")
        const ownLabel = label && (label as HTMLLabelElement).control === el
        const layer = top.closest('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]')
        if (top.closest('[role="tooltip"],[data-slot="tooltip-content"]')) {
          // Un tooltip temporal no cuenta como tapado.
        } else if (!opts.overlay && fixedChrome(top) && !fixedChrome(el)) {
          // Una barra fija (navegación inferior) cubre contenido que se desplaza por debajo.
        } else if (!opts.overlay && layer && !layer.contains(el)) {
          // Hay un modal abierto encima de la página a propósito.
        } else if (!ownLabel) {
          out.push(`tapado por ${describe(top)}: ${describe(el)}`)
        } else if (opts.overlay && !root.contains(top)) {
          out.push(`tapado por algo fuera del modal: ${describe(el)}`)
        }
      } else if (opts.overlay && top && !root.contains(top) && !top.closest("[data-radix-popper-content-wrapper]")) {
        out.push(`elemento del modal con capa ajena encima: ${describe(el)}`)
      }
    }
  }

  const openLayer = opts.overlay
    ? null
    : Array.from(document.querySelectorAll('[role="dialog"],[role="alertdialog"]')).find(isVisible) ?? null
  const splitByLayer = (a: Element, b: Element) =>
    (!!openLayer && openLayer.contains(a) !== openLayer.contains(b)) ||
    (!opts.overlay && fixedChrome(a) !== fixedChrome(b))

  // solapes entre interactivos
  const placed = interactive.filter((el) => !outsideScrollAncestor(el))
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]
      const b = placed[j]
      if (a.contains(b) || b.contains(a) || splitByLayer(a, b)) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w <= 3 || h <= 3) continue
      const smaller = Math.min(ra.width * ra.height, rb.width * rb.height)
      if (w * h >= smaller * 0.9) continue
      const fieldA = ["input", "textarea", "select"].includes(a.tagName.toLowerCase())
      const fieldB = ["input", "textarea", "select"].includes(b.tagName.toLowerCase())
      // Botón de ayuda dentro de un campo (ojo de contraseña, limpiar, etc.).
      if ((fieldA || fieldB) && a.parentElement?.parentElement === b.parentElement?.parentElement) continue
      if ((fieldA || fieldB) && (a.parentElement === b.parentElement || a.parentElement?.contains(b) || b.parentElement?.contains(a))) continue
      out.push(`solape: ${describe(a)} con ${describe(b)} (${Math.round(w)}x${Math.round(h)})`)
    }
  }

  // texto cortado
  const texts = Array.from(root.querySelectorAll(textSel))
    .filter((el) => isVisible(el) && !isSrOnly(el))
    .slice(0, 500)
  const leafRects: { el: Element; rect: DOMRect }[] = []
  for (const el of texts) {
    const direct = Array.from(el.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim(),
    )
    if (direct.length === 0) continue
    const range = document.createRange()
    range.selectNodeContents(el)
    const tr = range.getBoundingClientRect()
    if (tr.width === 0 || tr.height === 0) continue
    let left = tr.left
    let top = tr.top
    let right = tr.right
    let bottom = tr.bottom
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.overflowX === "visible" && style.overflowY === "visible") continue
      const box = node.getBoundingClientRect()
      if (style.overflowX !== "visible") {
        left = Math.max(left, box.left)
        right = Math.min(right, box.right)
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, box.top)
        bottom = Math.min(bottom, box.bottom)
      }
    }
    if (right - left > 0 && bottom - top > 0) {
      leafRects.push({ el, rect: new DOMRect(left, top, right - left, bottom - top) })
    }

    let scrollsX = false
    let scrollsY = false
    for (let node: Element | null = el; node && node !== root.parentElement; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.overflowX === "auto" || style.overflowX === "scroll") scrollsX = true
      if (style.overflowY === "auto" || style.overflowY === "scroll") scrollsY = true
      const hidesX = !scrollsX && (style.overflowX === "hidden" || style.overflowX === "clip")
      const hidesY = !scrollsY && (style.overflowY === "hidden" || style.overflowY === "clip")
      if (!hidesX && !hidesY) continue
      const lineClamp = style.getPropertyValue("-webkit-line-clamp")
      if (lineClamp && lineClamp !== "none") break
      const box = node.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const cutX = hidesX && (tr.right > box.right + 1.5 || tr.left < box.left - 1.5)
      // El rectángulo del texto incluye el interlineado de la fuente: se tolera una parte del cuerpo.
      const tolerance = Math.max(2, parseFloat(style.fontSize || "16") * 0.4)
      const cutY = hidesY && (tr.bottom > box.bottom + tolerance || tr.top < box.top - tolerance)
      if (cutX && style.textOverflow === "ellipsis") {
        out.push(`texto truncado con puntos suspensivos: ${describe(el)}`)
        break
      }
      if (cutX || cutY) {
        out.push(`texto cortado: ${describe(el)} por ${describe(node)}${cutX ? " (horizontal)" : " (vertical)"}`)
        break
      }
    }
  }

  // texto solapado con otro texto
  for (let i = 0; i < leafRects.length; i++) {
    for (let j = i + 1; j < leafRects.length; j++) {
      const a = leafRects[i]
      const b = leafRects[j]
      if (a.el.contains(b.el) || b.el.contains(a.el) || splitByLayer(a.el, b.el)) continue
      const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left)
      const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top)
      if (w > 4 && h > 8) {
        out.push(`texto solapado: ${describe(a.el)} con ${describe(b.el)} (${Math.round(w)}x${Math.round(h)})`)
      }
    }
  }

  // códigos internos del sistema visibles para la persona (ej. CHARACTER, AUTO_THRESHOLD)
  const internalCode = /^(CHARACTER|LOCATION|OBJECT|ORGANIZATION|EVENT|CONCEPT|[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)$/
  for (const el of Array.from(root.querySelectorAll("*"))) {
    if (!isVisible(el) || el.closest("option,script,style")) continue
    const own = Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim()
    if (internalCode.test(own)) out.push(`código interno visible: "${own}" en ${describe(el)}`)
  }

  // pestañas dentro de un área con scroll que se van con el contenido
  for (const list of Array.from(root.querySelectorAll('[role="tablist"]'))) {
    if (!isVisible(list)) continue
    let scroller: Element | null = null
    let pinned = false
    for (let node: Element | null = list; node && node !== root.parentElement; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.position === "sticky" || style.position === "fixed") pinned = true
      if (node !== list && (style.overflowY === "auto" || style.overflowY === "scroll")) {
        scroller = node
        break
      }
    }
    if (scroller && !pinned && scroller.scrollHeight > scroller.clientHeight + 1) {
      out.push(`pestañas que se van al desplazar el contenido: ${describe(list)}`)
    }
  }

  for (const img of Array.from(root.querySelectorAll("img"))) {
    if (isVisible(img) && img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      out.push(`imagen rota: ${(img.getAttribute("src") ?? "").slice(0, 60)}`)
    }
  }

  return Array.from(new Set(out)).slice(0, 40)
}

type Collector = {
  hard: Map<string, string>
  soft: Map<string, string>
  note: (context: string, message: string) => void
}

function makeCollector(): Collector {
  const hard = new Map<string, string>()
  const soft = new Map<string, string>()
  return {
    hard,
    soft,
    note(context, message) {
      const target = SOFT.test(message) ? soft : hard
      if (!target.has(message)) target.set(message, context)
    },
  }
}

function watchRuntime(page: Page, collector: Collector) {
  page.on("pageerror", (error) =>
    collector.note("runtime", `pageerror: ${error.message.slice(0, 200)}`),
  )
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const text = message.text()
    if (IGNORED_CONSOLE.test(text)) return
    collector.note("runtime", `console.error: ${text.slice(0, 220)}`)
  })
}

async function settle(page: Page) {
  await page.waitForLoadState("load").catch(() => undefined)
  await page.waitForTimeout(700)
}

async function overlayCount(page: Page) {
  return page.locator(OVERLAY).count()
}

/** Espera a que lo abierto deje de animarse antes de medirlo. */
async function settleOverlay(page: Page) {
  await page
    .locator(OVERLAY)
    .last()
    .evaluate((el) =>
      Promise.race([
        Promise.all(
          el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
        ),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]),
    )
    .catch(() => undefined)
}

/** Cantidad de overlays tras darle tiempo a cerrarse (animaciones de salida). */
async function closedCount(page: Page) {
  for (let i = 0; i < 12; i++) {
    if ((await overlayCount(page)) === 0) return 0
    await page.waitForTimeout(120)
  }
  return overlayCount(page)
}

async function closeAllOverlays(page: Page) {
  for (let i = 0; i < 4; i++) {
    if ((await overlayCount(page)) === 0) return true
    await page.keyboard.press("Escape")
    await page.waitForTimeout(220)
  }
  return (await overlayCount(page)) === 0
}

async function auditPage(
  page: Page,
  collector: Collector,
  context: string,
  touch: boolean,
) {
  const found = await page
    .locator("body")
    .evaluate(auditDom, { overlay: false, touch })
    .catch(() => [] as string[])
  for (const message of found) collector.note(context, message)
}

async function auditOverlay(
  page: Page,
  collector: Collector,
  context: string,
  touch: boolean,
) {
  await settleOverlay(page)
  const root = page.locator(OVERLAY).last()
  const found = await root
    .evaluate(auditDom, { overlay: true, touch })
    .catch(() => [] as string[])
  for (const message of found) collector.note(context, message)

  const role = await root.getAttribute("role").catch(() => null)
  if (role === "dialog" || role === "alertdialog") {
    const focused = await root
      .evaluate((el) => el.contains(document.activeElement))
      .catch(() => true)
    if (!focused) collector.note(context, "foco fuera del modal al abrir")
  }
  return role
}

async function labelOf(locator: Locator) {
  return locator
    .evaluate((el) =>
      (
        el.getAttribute("aria-label") ||
        (el as HTMLElement).innerText ||
        el.getAttribute("title") ||
        el.id ||
        el.tagName
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 40),
    )
    .catch(() => "?")
}

/** Reabre lo que abrió el disparador `index`. */
async function reopen(page: Page, triggers: Locator, index: number) {
  await closeAllOverlays(page)
  await triggers
    .nth(index)
    .click({ timeout: 1500 })
    .catch(() => undefined)
  await page.waitForTimeout(260)
  return overlayCount(page)
}

/**
 * Un modal abierto desde otro modal debe cerrarse solo: su botón Cancelar, un
 * clic afuera y Escape no pueden llevarse también al modal de abajo.
 * Devuelve false si el modal padre se perdió y hay que reabrir.
 */
async function checkNestedClosing(
  page: Page,
  collector: Collector,
  where: string,
  control: Locator,
  baseline: number,
) {
  const nested = page.locator(OVERLAY).last()
  const cancel = nested
    .getByRole("button", { name: /^(cancelar|cerrar|volver|entendido|no)$/i })
    .first()

  if (await cancel.count()) {
    await cancel.click({ timeout: 1500 }).catch(() => undefined)
    if ((await closedCount(page)) > baseline) {
      collector.note(where, "el botón Cancelar/Cerrar del modal anidado no lo cierra")
      await closeAllOverlays(page)
      return false
    }
    if ((await overlayCount(page)) < baseline) {
      collector.note(where, "Cancelar en un modal anidado cerró también el modal de abajo")
      await closeAllOverlays(page)
      return false
    }

    // Se vuelve a abrir para probar el clic afuera.
    await control.click({ timeout: 1500 }).catch(() => undefined)
    await page.waitForTimeout(300)
    if ((await overlayCount(page)) <= baseline) return true
  }

  await page.mouse.click(2, 2)
  await page.waitForTimeout(300)
  const after = await closedCount(page)
  if (after < baseline) {
    collector.note(where, "un clic afuera del modal anidado cerró también el modal de abajo")
    await closeAllOverlays(page)
    return false
  }
  if (after > baseline) {
    // Algunos modales son a propósito sin cierre por clic afuera: se avisa, no se falla.
    collector.note(where, "clic afuera no cierra el modal anidado")
    return true
  }
  // El anidado se cerró y el padre sigue: se vuelve a abrir para el resto de las pruebas.
  await control.click({ timeout: 1500 }).catch(() => undefined)
  await page.waitForTimeout(300)
  return true
}

/**
 * Una lista o menú abierto dentro de un modal: tocar afuera (título del modal y
 * fondo oscuro) cierra solo la lista y deja el modal abierto.
 */
async function checkPopupOutsideClick(
  page: Page,
  collector: Collector,
  where: string,
  control: Locator,
  baseline: number,
) {
  const spots: Array<[string, () => Promise<{ x: number; y: number } | null>]> = [
    [
      "el título del modal",
      async () => {
        const box = await page.locator('[data-slot="dialog-title"]:visible').last().boundingBox()
        if (!box) return null
        const point = { x: box.x + 4, y: box.y + box.height / 2 }
        // Si la propia lista cubre el título, ese punto no sirve para la prueba.
        const covered = await page.evaluate(
          ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[role="listbox"], [role="menu"]'),
          point,
        )
        return covered ? null : point
      },
    ],
    ["el fondo oscuro", async () => ({ x: 4, y: 4 })],
  ]

  for (const [label, locate] of spots) {
    const point = await locate()
    if (!point) continue
    await page.waitForTimeout(350)
    await page.mouse.click(point.x, point.y)
    await page.waitForTimeout(500)
    const after = await overlayCount(page)

    if (after < baseline) {
      collector.note(where, `tocar ${label} con la lista abierta cerró también el modal`)
      await closeAllOverlays(page)
      return false
    }
    if (after > baseline) {
      collector.note(where, `tocar ${label} no cierra la lista desplegable`)
      await closeAllOverlays(page)
      return false
    }
    // Se vuelve a abrir para el resto de las pruebas.
    await control.click({ timeout: 1500 }).catch(() => undefined)
    await page.waitForTimeout(350)
    if ((await overlayCount(page)) <= baseline) return true
  }
  return true
}

async function exploreInsideDialog(
  page: Page,
  collector: Collector,
  context: string,
  touch: boolean,
) {
  const dialog = page.locator(OVERLAY).last()
  const inner = dialog.locator(
    'button:visible, [role="combobox"]:visible, [role="tab"]:visible',
  )
  const total = Math.min(await inner.count(), 25)
  const baseline = await overlayCount(page)

  for (let j = 0; j < total; j++) {
    if ((await overlayCount(page)) !== baseline) break
    const control = page.locator(OVERLAY).last().locator(
      'button:visible, [role="combobox"]:visible, [role="tab"]:visible',
    ).nth(j)
    const name = await labelOf(control)
    if (SKIP_INNER.test(name) || /^cerrar$/i.test(name)) continue
    const where = `${context} › ${name}`

    try {
      await control.click({ timeout: 1500 })
    } catch (error) {
      const message = String(error)
      if (/intercepts pointer events/.test(message)) {
        collector.note(where, `clic interceptado: ${message.split("\n").find((l) => /intercepts/.test(l))?.trim().slice(0, 140)}`)
      }
      continue
    }
    await page.waitForTimeout(260)

    const now = await overlayCount(page)
    if (now > baseline) {
      const nestedRole = await auditOverlay(page, collector, where, touch)

      if (nestedRole === "dialog" || nestedRole === "alertdialog") {
        const ok = await checkNestedClosing(page, collector, where, control, baseline)
        if (!ok) return false
      }

      if (nestedRole === "listbox" || nestedRole === "menu") {
        const ok = await checkPopupOutsideClick(page, collector, where, control, baseline)
        if (!ok) return false
      }

      await page.keyboard.press("Escape")
      await page.waitForTimeout(240)
      if ((await overlayCount(page)) !== baseline) {
        collector.note(where, "Escape no cerró el desplegable o cerró también el modal padre")
        await closeAllOverlays(page)
        return false
      }
    } else if (now === baseline) {
      // Cambió el contenido (pestañas, interruptores): se vuelve a revisar.
      await auditOverlay(page, collector, `${where} (contenido nuevo)`, touch)
    } else {
      return false
    }
  }
  return true
}

async function exploreTriggers(
  page: Page,
  baseUrl: string,
  collector: Collector,
  touch: boolean,
) {
  const triggerSel =
    'button:visible, [role="button"]:visible, [role="menuitem"]:visible, [role="tab"]:visible, [role="combobox"]:visible, summary:visible'
  const triggers = page.locator(triggerSel)
  const total = Math.min(await triggers.count(), 80)
  const basePath = new URL(baseUrl, "http://x").pathname

  for (let i = 0; i < total; i++) {
    if ((await overlayCount(page)) > 0 && !(await closeAllOverlays(page))) {
      await page.goto(baseUrl)
      await settle(page)
    }
    if (i >= (await triggers.count())) break
    const trigger = triggers.nth(i)
    const name = await labelOf(trigger)
    if (SKIP_TRIGGER.test(name)) continue
    const context = `${name}`

    try {
      await trigger.click({ timeout: 1800 })
    } catch (error) {
      const message = String(error)
      if (/intercepts pointer events/.test(message) && !/data-sidebar="menu-button"/.test(message)) {
        collector.note(context, `clic interceptado: ${message.split("\n").find((l) => /intercepts/.test(l))?.trim().slice(0, 140)}`)
      }
      continue
    }
    await page.waitForTimeout(300)

    if (new URL(page.url()).pathname !== basePath) {
      await page.goto(baseUrl)
      await settle(page)
      continue
    }

    const opened = await overlayCount(page)
    if (opened === 0) {
      await auditPage(page, collector, `tras clic en "${context}"`, touch)
      continue
    }

    const role = await auditOverlay(page, collector, `abrir "${context}"`, touch)

    if (role === "dialog" || role === "alertdialog") {
      await exploreInsideDialog(page, collector, `"${context}"`, touch)
      if ((await overlayCount(page)) === 0) {
        await reopen(page, triggers, i)
      }
    }

    if (role === "menu") {
      const items = page.locator(OVERLAY).last().locator('[role="menuitem"]:visible, [role="menuitemradio"]:visible, [role="menuitemcheckbox"]:visible')
      const itemCount = Math.min(await items.count(), 12)
      for (let k = 0; k < itemCount; k++) {
        if ((await overlayCount(page)) === 0) await reopen(page, triggers, i)
        const menuItem = page
          .locator(OVERLAY)
          .last()
          .locator('[role="menuitem"]:visible, [role="menuitemradio"]:visible, [role="menuitemcheckbox"]:visible')
          .nth(k)
        const itemName = await labelOf(menuItem)
        if (SKIP_TRIGGER.test(itemName)) continue
        const where = `"${context}" › "${itemName}"`
        await menuItem.click({ timeout: 1500 }).catch(() => undefined)
        await page.waitForTimeout(300)
        if (new URL(page.url()).pathname !== basePath) {
          await page.goto(baseUrl)
          await settle(page)
          break
        }
        if ((await overlayCount(page)) > 0) {
          const subRole = await auditOverlay(page, collector, where, touch)
          if (subRole === "dialog" || subRole === "alertdialog") {
            await exploreInsideDialog(page, collector, where, touch)
          }
          if (!(await closeAllOverlays(page))) {
            collector.note(where, "Escape no cierra lo abierto desde el menú")
            await page.goto(baseUrl)
            await settle(page)
            break
          }
        } else {
          await auditPage(page, collector, `tras "${where}"`, touch)
        }
      }
    }

    // ----- cierre: Escape, X y Cancelar
    if ((await overlayCount(page)) === 0) await reopen(page, triggers, i)
    if ((await overlayCount(page)) === 0) continue
    const closeRole = await page.locator(OVERLAY).last().getAttribute("role")

    await page.keyboard.press("Escape")
    await page.waitForTimeout(260)
    if ((await closedCount(page)) > 0) {
      collector.note(`"${context}"`, `Escape no cierra (${closeRole})`)
      await closeAllOverlays(page)
    } else {
      const focusLost = await page.evaluate(
        () => document.activeElement === document.body || document.activeElement === null,
      )
      if (focusLost) collector.note(`"${context}"`, "foco perdido al cerrar (queda en body)")
    }

    if (closeRole === "dialog") {
      await reopen(page, triggers, i)
      const dialog = page.locator(OVERLAY).last()
      const closeButton = dialog.locator('[data-slot="dialog-close"], button:has-text("Cerrar")').first()
      if (await closeButton.count()) {
        await closeButton.click({ timeout: 1500 }).catch(() => undefined)
        await page.waitForTimeout(260)
        if ((await closedCount(page)) > 0) {
          collector.note(`"${context}"`, "el botón Cerrar (X) no cierra el modal")
          await closeAllOverlays(page)
        }
      }
      await reopen(page, triggers, i)
      const cancel = page
        .locator(OVERLAY)
        .last()
        .getByRole("button", { name: /^(cancelar|cerrar|entendido)$/i })
        .first()
      if (await cancel.count()) {
        await cancel.click({ timeout: 1500 }).catch(() => undefined)
        await page.waitForTimeout(260)
        if ((await closedCount(page)) > 0) {
          collector.note(`"${context}"`, "Cancelar/Cerrar no cierra el modal")
          await closeAllOverlays(page)
        }
      }
      await reopen(page, triggers, i)
      if ((await overlayCount(page)) > 0) {
        await page.mouse.click(2, 2)
        await page.waitForTimeout(260)
        if ((await closedCount(page)) > 0) {
          collector.note(`"${context}"`, `clic afuera no cierra el modal (${closeRole})`)
          await closeAllOverlays(page)
        }
      }
    }
    await closeAllOverlays(page)
  }
}

function report(name: string, collector: Collector) {
  const dir = path.join(process.cwd(), "test-results", "ui-audit")
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, `${name}.json`),
    JSON.stringify(
      {
        hard: Object.fromEntries(collector.hard),
        soft: Object.fromEntries(collector.soft),
      },
      null,
      2,
    ),
  )
  return Array.from(collector.hard, ([message, context]) => `${message}   ⟵ ${context}`)
}

const base = `/projects/${projectId}`

const APP_PAGES = [
  { name: "dashboard", url: "/dashboard" },
  { name: "hub", url: base },
  { name: "editor", url: `${base}/editor` },
  { name: "worldbuilding-wiki", url: `${base}/worldbuilding` },
  { name: "worldbuilding-relaciones", url: `${base}/worldbuilding?tab=relationships` },
  { name: "worldbuilding-linea", url: `${base}/worldbuilding?tab=timeline` },
  { name: "worldbuilding-resumenes", url: `${base}/worldbuilding?tab=summaries` },
  { name: "tablero", url: `${base}/storyboard` },
  { name: "estadisticas", url: `${base}/statistics` },
  { name: "compartidos", url: `${base}/shares` },
  { name: "lector-compartido", url: "/shared/invitacion-1?token=token-1" },
]

const combos = VIEWPORTS.flatMap((viewport) =>
  (["light", "dark"] as Theme[])
    .filter((theme) => theme === "light" || viewport.name === "movil-375" || viewport.name === "escritorio-1440")
    .map((theme) => ({ viewport, theme })),
)

async function runPageAudit(
  page: Page,
  entry: { name: string; url: string },
  viewport: ViewportSpec,
  theme: Theme,
  prefix: string,
  longText: boolean,
) {
  const collector = makeCollector()
  watchRuntime(page, collector)
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript(
    ({ value, rootFontPx }) => {
      window.localStorage.setItem("plumia-theme", value)
      if (rootFontPx) {
        document.addEventListener("DOMContentLoaded", () => {
          const style = document.createElement("style")
          style.textContent = `html { font-size: ${rootFontPx}px !important; }`
          document.head.appendChild(style)
        })
      }
    },
    { value: theme, rootFontPx: viewport.rootFontPx },
  )
  await installModalBackend(page, { longText })

  await page.goto(entry.url)
  await settle(page)
  await auditPage(page, collector, "carga inicial", viewport.touch)
  await exploreTriggers(page, entry.url, collector, viewport.touch)

  const failures = report(`${prefix}${viewport.name}-${theme}-${entry.name}`, collector)
  expect(failures, failures.join("\n")).toEqual([])
}

for (const { viewport, theme } of combos) {
  test.describe(`Auditoría UI ${viewport.name} ${theme}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const entry of APP_PAGES) {
      test(`${entry.name}`, async ({ page }) => {
        test.setTimeout(420_000)
        await runPageAudit(page, entry, viewport, theme, "", false)
      })
    }
  })
}

// Textos larguísimos: nada debe salirse de su caja ni empujar el diseño.
for (const viewport of VIEWPORTS.filter((v) =>
  ["movil-320", "tablet-768", "escritorio-1440"].includes(v.name),
)) {
  test.describe(`Auditoría UI textos largos ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const entry of APP_PAGES.filter((page) => page.name !== "lector-compartido")) {
      test(`${entry.name}`, async ({ page }) => {
        test.setTimeout(420_000)
        await runPageAudit(page, entry, viewport, "light", "largo-", true)
      })
    }
  })
}

test.describe("Auditoría UI páginas públicas", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const viewport of VIEWPORTS) {
    for (const entry of [
      { name: "login", url: "/login" },
      { name: "registro", url: "/register" },
      { name: "recuperar", url: "/forgot-password" },
      { name: "terminos", url: "/terminos-y-condiciones" },
    ]) {
      test(`${entry.name} ${viewport.name}`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const collector = makeCollector()
        watchRuntime(page, collector)
        await page.goto(entry.url)
        await settle(page)
        await auditPage(page, collector, "carga inicial", viewport.touch)
        await exploreTriggers(page, entry.url, collector, viewport.touch)
        const failures = report(`publica-${viewport.name}-${entry.name}`, collector)
        expect(failures, failures.join("\n")).toEqual([])
      })
    }
  }
})
