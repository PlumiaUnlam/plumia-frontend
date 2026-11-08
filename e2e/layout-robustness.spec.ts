import { expect, test } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed } from "./support/modal-helpers"

const base = "/projects/" + projectId

test.describe("Encabezado con el texto agrandado", () => {
  test("el menú central no se superpone con los botones de la derecha (texto al 175%)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await installModalBackend(page)
    await page.goto(base + "/statistics")
    await page.addStyleTag({ content: "html { font-size: 28px !important; }" })
    await page.waitForTimeout(400)

    const nav = await page.getByRole("navigation", { name: "Secciones del proyecto" }).boundingBox()
    const menu = await page.getByRole("button", { name: "Abrir menú de usuario" }).boundingBox()
    expect(nav).not.toBeNull()
    expect(menu).not.toBeNull()
    expect(nav!.x + nav!.width, "el menú central pisa al de usuario").toBeLessThanOrEqual(menu!.x + 1)
  })

  test("a 1440px el menú central sigue centrado en la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installModalBackend(page)
    await page.goto(base + "/statistics")
    const nav = await page.getByRole("navigation", { name: "Secciones del proyecto" }).boundingBox()
    expect(nav).not.toBeNull()
    expect(Math.abs(nav!.x + nav!.width / 2 - 720)).toBeLessThanOrEqual(2)
  })
})

test.describe("Pantallas bajas (horizontal)", () => {
  test("los paneles laterales de Worldbuilding se pueden desplazar", async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 })
    await installModalBackend(page)
    for (const tab of ["wiki", "relationships", "timeline", "summaries"]) {
      await page.goto(base + "/worldbuilding?tab=" + tab)
      await page.waitForTimeout(500)
      const overflows = await page.locator("aside").evaluateAll((nodes) =>
        nodes
          .filter((node) => node.getBoundingClientRect().width > 0)
          .filter((node) => node.scrollHeight > node.clientHeight + 1)
          .map((node) => getComputedStyle(node).overflowY)
          .filter((value) => value !== "auto" && value !== "scroll"),
      )
      expect(overflows, "panel lateral de " + tab + " con contenido inaccesible").toEqual([])
    }
  })

  test("el selector de fecha de «Definir metas» cabe en la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 })
    await installModalBackend(page)
    await page.goto(base + "/statistics")
    await page.getByRole("button", { name: "Definir metas" }).first().click()
    const dialog = dialogNamed(page, /metas/i)
    await expect(dialog).toBeVisible()
    await dialog.locator('button:has-text("Seleccionar fecha"), [role="combobox"]:has-text("Seleccionar fecha")').first().click()

    const popover = page.locator('[data-slot="popover-content"]').last()
    await expect(popover).toBeVisible()
    await popover.evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
    )
    const rect = await popover.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, overflowY: getComputedStyle(el).overflowY }
    })
    expect(rect.top).toBeGreaterThanOrEqual(-1)
    expect(rect.bottom).toBeLessThanOrEqual(376)
    expect(["auto", "scroll"]).toContain(rect.overflowY)
  })
})

test.describe("Textos larguísimos", () => {
  test("Resúmenes: el título de un capítulo largo se recorta con puntos suspensivos dentro de su caja", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installModalBackend(page, { longText: true })
    await page.goto(base + "/worldbuilding?tab=summaries")
    const row = page.locator("aside button", { hasText: "Supercalifragilistico" }).first()
    await expect(row).toBeVisible()

    const info = await row.evaluate((button) => {
      const aside = button.closest("aside")!
      const title = button.querySelector("p")!
      return {
        buttonRight: button.getBoundingClientRect().right,
        asideRight: aside.getBoundingClientRect().right,
        titleOverflows: title.scrollWidth > title.clientWidth,
        ellipsis: getComputedStyle(title).textOverflow,
      }
    })
    expect(info.buttonRight).toBeLessThanOrEqual(info.asideRight + 1)
    expect(info.titleOverflows).toBe(true)
    expect(info.ellipsis).toBe("ellipsis")
  })

  test("Tablero: una tarjeta con título sin espacios no ensancha la columna", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await installModalBackend(page, { longText: true })
    await page.goto(base + "/storyboard")
    await expect(page.getByText(/Supercalifragilistico/).first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("Worldbuilding: nombres larguísimos no producen scroll horizontal en ninguna pestaña", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await installModalBackend(page, { longText: true })
    for (const tab of ["wiki", "relationships", "timeline", "summaries"]) {
      await page.goto(base + "/worldbuilding?tab=" + tab)
      await page.waitForTimeout(500)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, "scroll horizontal en " + tab).toBeLessThanOrEqual(0)
    }
  })
})

test.describe("Listas y árbol con poco lugar o textos largos", () => {
  test("pantalla baja: las listas de Worldbuilding conservan altura y se pueden usar", async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 })
    await installModalBackend(page)
    for (const tab of ["wiki", "relationships", "summaries"]) {
      await page.goto(base + "/worldbuilding?tab=" + tab)
      await page.waitForTimeout(600)
      const heights = await page.locator('[data-slot="scroll-area"]').evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().height).filter((h) => h > 0),
      )
      expect(heights.length, "sin lista en " + tab).toBeGreaterThan(0)
      expect(Math.max(...heights), "la lista de " + tab + " quedó aplastada").toBeGreaterThanOrEqual(150)
    }
  })

  test("celular con nombres larguísimos: la lista desplegable del arco cabe en la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await installModalBackend(page, { longText: true })
    await page.goto(base + "/worldbuilding?tab=timeline")
    await page.getByRole("button", { name: /^Nuevo/ }).first().click()
    const dialog = page.locator('[data-slot="dialog-content"]').last()
    await expect(dialog).toBeVisible()

    const arc = dialog.locator('[role="combobox"]').filter({ hasText: /Sin arco/ }).first()
    await arc.click()
    const list = page.locator('[role="listbox"]:visible').first()
    await expect(list).toBeVisible()
    await list.evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
    )
    const rect = await list.boundingBox()
    expect(rect).not.toBeNull()
    expect(rect!.x).toBeGreaterThanOrEqual(-1)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(321)
  })

  test("editor con títulos larguísimos: el árbol los recorta con puntos suspensivos", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installModalBackend(page, { longText: true })
    await page.goto(base + "/editor")
    const title = page.locator('[data-sidebar="menu-button"] span', { hasText: "Un título extremadamente largo" }).first()
    await expect(title).toBeVisible()
    const info = await title.evaluate((span) => {
      const button = span.closest('[data-sidebar="menu-button"]')!
      return {
        ellipsis: getComputedStyle(span).textOverflow,
        spanRight: span.getBoundingClientRect().right,
        buttonRight: button.getBoundingClientRect().right,
        truncated: span.scrollWidth > span.clientWidth,
      }
    })
    expect(info.ellipsis).toBe("ellipsis")
    expect(info.truncated).toBe(true)
    expect(info.spanRight).toBeLessThanOrEqual(info.buttonRight + 1)
  })
})

test.describe("Opciones de lista muy largas", () => {
  test("Nueva relación: una entidad con nombre sin espacios se recorta con puntos suspensivos dentro de la lista", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await installModalBackend(page, { longText: true })
    await page.goto(base + "/worldbuilding?tab=relationships")
    await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    await page.locator("#relation-source").click()
    const list = page.locator('[data-slot="select-content"]').first()
    await expect(list).toBeVisible()
    await list.evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
    )

    const info = await list.evaluate((content) => {
      const text = Array.from(content.querySelectorAll('[data-slot="select-item"] span.truncate')).find((el) =>
        (el.textContent ?? "").includes("Supercalifragilistico"),
      )
      if (!text) return null
      const item = text.closest('[data-slot="select-item"]')!
      return {
        ellipsis: getComputedStyle(text).textOverflow,
        truncated: text.scrollWidth > text.clientWidth,
        textRight: text.getBoundingClientRect().right,
        itemRight: item.getBoundingClientRect().right,
        contentRight: content.getBoundingClientRect().right,
      }
    })
    expect(info, "no se encontró la opción larga").not.toBeNull()
    expect(info!.ellipsis).toBe("ellipsis")
    expect(info!.truncated).toBe(true)
    expect(info!.textRight).toBeLessThanOrEqual(info!.itemRight + 1)
    expect(info!.itemRight).toBeLessThanOrEqual(info!.contentRight + 1)
  })
})
