import { expect, test, type Locator } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { openEditor, openScene } from "./support/modal-helpers"

/** Las cajas no se pisan entre sí (tolerancia de 1px). */
async function expectNoOverlap(locators: Locator[]) {
  const boxes = []
  for (const locator of locators) {
    const box = await locator.boundingBox()
    expect(box).not.toBeNull()
    boxes.push(box!)
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
      expect(overlapX > 1 && overlapY > 1, "las cajas " + i + " y " + j + " se pisan").toBe(false)
    }
  }
}

test.describe("Login en pantalla angosta", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("«¿Olvidaste tu contraseña?» queda dentro de la tarjeta a 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto("/login")

    const link = page.getByRole("button", { name: "¿Olvidaste tu contraseña?" })
    const email = page.getByLabel("Email")
    await expect(link).toBeVisible()

    const linkBox = await link.boundingBox()
    const cardBox = await email.boundingBox()
    expect(linkBox).not.toBeNull()
    expect(cardBox).not.toBeNull()
    // El borde derecho del enlace no pasa el del campo, y la página no hace scroll horizontal.
    expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe("Configuración en pantalla angosta", () => {
  for (const width of [320, 375, 600]) {
    test("las pestañas no se pisan a " + width + "px y se puede llegar a todas", async ({ page }) => {
      await page.setViewportSize({ width, height: 700 })
      await installModalBackend(page)
      await page.goto("/dashboard")
      await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
      await page.getByRole("menuitem", { name: "Configuración" }).click()

      const dialog = page.getByRole("dialog", { name: "Configuración" })
      await expect(dialog).toBeVisible()
      const tabs = ["Datos de la cuenta", "Configuración de IA", "Reconocimiento", "Inconsistencias"].map(
        (name) => dialog.getByRole("tab", { name }),
      )
      await expectNoOverlap(tabs)

      // Cada pestaña se puede abrir aunque haya que desplazar la fila.
      for (const tab of tabs) {
        await tab.scrollIntoViewIfNeeded()
        await tab.click()
        await expect(tab).toHaveAttribute("data-state", "active")
      }
    })
  }
})

test.describe("Editor en tablet", () => {
  test("a 768px el panel derecho arranca colapsado y la escritura conserva espacio", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await installModalBackend(page)
    await page.goto("/projects/" + projectId + "/editor")
    await expect(page.getByRole("heading", { name: "Crónicas del viento" })).toBeVisible()

    // El panel colapsado no muestra el contenido de «Wiki» y no se corta nada a la derecha.
    await expect(page.getByText("Sin inconsistencias pendientes")).toBeHidden()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    const proseWidth = await page.locator(".ProseMirror").evaluate((el) => el.getBoundingClientRect().width)
    expect(proseWidth).toBeGreaterThan(280)

    // La persona puede abrir el panel a mano y volver a colapsarlo.
    await page.getByRole("button", { name: "Expandir panel derecho" }).click()
    await expect(page.getByText("Sin inconsistencias pendientes")).toBeVisible()
    await page.getByRole("button", { name: "Colapsar panel derecho" }).click()
    await expect(page.getByText("Sin inconsistencias pendientes")).toBeHidden()
  })

  test("a 1440px el panel derecho sigue abierto", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installModalBackend(page)
    await page.goto("/projects/" + projectId + "/editor")
    await expect(page.getByText("Sin inconsistencias pendientes")).toBeVisible()
  })
})

test.describe("Panel derecho del editor", () => {
  test("a 1024px su contenido no se corta por la derecha", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await installModalBackend(page)
    await page.goto("/projects/" + projectId + "/editor")
    await page.getByRole("button", { name: "Expandir panel derecho" }).click().catch(() => undefined)
    await expect(page.getByText("Sin inconsistencias pendientes")).toBeVisible()

    const overflowing = await page.evaluate(() => {
      const panel = Array.from(document.querySelectorAll("aside, div")).find((el) => {
        const c = String(el.className)
        return c.includes("border-l") && c.includes("bg-card") && c.includes("shrink-0") && c.includes("overflow-hidden")
      })
      if (!panel) return ["sin panel"]
      const right = panel.getBoundingClientRect().right
      return Array.from(panel.querySelectorAll("*"))
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.right > right + 1
        })
        .slice(0, 5)
        .map((el) => el.tagName + "." + String(el.className).slice(0, 60))
    })
    expect(overflowing).toEqual([])
  })
})

test.describe("Letra capital", () => {
  test("el párrafo con letra capital contiene la capital y no pisa al siguiente", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    await page.getByRole("button", { name: "Mostrar herramientas" }).click()
    await page.locator(".ProseMirror p").first().click()
    await page.getByRole("button", { name: "Más formato" }).click()
    await page.getByRole("menuitemcheckbox", { name: /Letra capital/ }).click()
    await expect(page.locator('.ProseMirror p[data-drop-cap="true"]')).toHaveCount(1)

    const [first, second] = await page.locator(".ProseMirror p").evaluateAll((nodes) =>
      nodes.slice(0, 2).map((node) => {
        const r = node.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, height: r.height }
      }),
    )
    // 48pt = 64px: el párrafo crece para contener la capital.
    expect(first.height).toBeGreaterThanOrEqual(60)
    expect(first.bottom).toBeLessThanOrEqual(second.top + 1)
  })
})
