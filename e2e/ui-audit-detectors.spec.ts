import { expect, test, type Page } from "@playwright/test"

import { auditDom } from "./support/ui-audit-core"

/**
 * Pruebas del propio auditor: cada defecto conocido se arma en una página mínima y se
 * comprueba que el auditor lo detecta, y que la versión sana no da falsos avisos. Así
 * una regla que deja de funcionar se nota en lugar de "pasar en silencio".
 */

async function audit(page: Page, html: string) {
  await page.setViewportSize({ width: 800, height: 600 })
  await page.setContent(`<!doctype html><html><body style="margin:0;font:14px sans-serif">${html}</body></html>`)
  return page.locator("body").evaluate(auditDom, { overlay: false, touch: false })
}

const card = (inner: string, styles = "") =>
  `<div style="border:1px solid #888;border-radius:12px;width:300px;margin:20px;${styles}">${inner}</div>`

test.describe("Detectores del auditor de interfaz", () => {
  test("detecta un texto pegado al borde de su tarjeta y no avisa si hay aire", async ({ page }) => {
    const glued = await audit(
      page,
      card(
        `<button style="display:flex;width:100%;border:0;background:none;padding:8px 0 8px 12px;text-align:left"><span>Mostrar la barra</span><span style="margin-left:auto">Ir ahí</span></button>`,
      ),
    )
    expect(glued.some((message) => /pegado al borde derecho/.test(message) && /Ir ahí/.test(message))).toBe(true)

    const healthy = await audit(
      page,
      card(
        `<button style="display:flex;width:100%;border:0;background:none;padding:8px 14px;text-align:left"><span>Mostrar la barra</span><span style="margin-left:auto">Ir ahí</span></button>`,
      ),
    )
    expect(healthy.filter((message) => /pegado al borde/.test(message))).toEqual([])
  })

  test("los botones de la punta de un grupo no se consideran pegados", async ({ page }) => {
    const group = await audit(
      page,
      card(
        `<div style="display:flex;padding:2px"><button style="padding:4px 10px">Uno</button><button style="padding:4px 10px">Dos</button></div>`,
        "width:200px",
      ),
    )
    expect(group.filter((message) => /pegado al borde/.test(message))).toEqual([])
  })

  test("detecta códigos internos visibles", async ({ page }) => {
    const found = await audit(page, `<label>CHARACTER</label><span>AUTO_THRESHOLD</span><span>Personaje</span>`)
    expect(found.filter((message) => /código interno visible/.test(message))).toHaveLength(2)
  })

  test("detecta pestañas que se van con el contenido y no avisa si quedan fijas", async ({ page }) => {
    const tabs = `<div role="tablist" style="height:32px"><button role="tab">Uno</button><button role="tab">Dos</button></div>`
    const tall = `<div style="height:800px">contenido largo</div>`
    const scrolling = await audit(
      page,
      `<div style="height:300px;overflow-y:auto"><div>${tabs}</div>${tall}</div>`,
    )
    expect(scrolling.some((message) => /pestañas que se van al desplazar/.test(message))).toBe(true)

    const pinned = await audit(
      page,
      `<div style="height:300px;overflow-y:auto"><div style="position:sticky;top:0;background:#fff">${tabs}</div>${tall}</div>`,
    )
    expect(pinned.filter((message) => /pestañas que se van/.test(message))).toEqual([])
  })

  test("detecta texto cortado por su caja y dos textos solapados", async ({ page }) => {
    const clipped = await audit(
      page,
      `<div style="width:60px;height:20px;overflow:hidden"><span style="white-space:nowrap">Un texto demasiado largo para su caja</span></div>`,
    )
    expect(clipped.some((message) => /texto cortado|texto truncado/.test(message))).toBe(true)

    const overlapping = await audit(
      page,
      `<div style="position:relative;height:40px"><span style="position:absolute;left:0;top:0">Primer texto largo</span><span style="position:absolute;left:10px;top:2px">Segundo texto encima</span></div>`,
    )
    expect(overlapping.some((message) => /texto solapado|solape/.test(message))).toBe(true)
  })

  test("detecta un contenedor que se desplaza de costado porque su contenido no entra, y no avisa si entra", async ({ page }) => {
    const wide = `<select style="width:max-content"><option>Capítulo 12 · El llamado de la torre: Una luz en la ventana del último piso</option></select>`
    const cut = await audit(
      page,
      `<div style="width:300px;overflow-x:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>${wide}</label><label><select><option>Sigue vigente</option></select></label></div></div>`,
    )
    expect(cut.some((message) => /scroll horizontal dentro de/.test(message))).toBe(true)

    const fits = await audit(
      page,
      `<div style="width:300px;overflow-x:auto"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label style="min-width:0"><select style="width:100%;min-width:0"><option>Capítulo 12 · El llamado de la torre: Una luz en la ventana del último piso</option></select></label><label style="min-width:0"><select style="width:100%;min-width:0"><option>Sigue vigente</option></select></label></div></div>`,
    )
    expect(fits.filter((message) => /scroll horizontal dentro de/.test(message))).toEqual([])

    const intended = await audit(
      page,
      `<div role="tablist" style="width:200px;overflow-x:auto;white-space:nowrap"><button role="tab">Una pestaña con un nombre bastante largo</button><button role="tab">Otra pestaña larga</button></div>`,
    )
    expect(intended.filter((message) => /scroll horizontal dentro de/.test(message))).toEqual([])
  })
})
