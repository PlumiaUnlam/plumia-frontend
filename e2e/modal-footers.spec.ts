import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { openEditor, openEditorMenu, openScene } from "./support/modal-helpers"

/**
 * Todos los modales deben tener el pie con aire: los botones no pueden quedar
 * pegados al borde ni superpuestos entre sí. Se mide en escritorio y en celular.
 */

const base = "/projects/" + projectId
const MIN_SIDE = 12
const MIN_BOTTOM = 8

async function settledDialog(page: Page): Promise<Locator> {
  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').last()
  await expect(dialog).toBeVisible()
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))),
  )
  return dialog
}

async function measureFooter(dialog: Locator) {
  return dialog.evaluate((root) => {
    const rect = root.getBoundingClientRect()
    const footer = root.querySelector('[data-slot="dialog-footer"], [data-slot="alert-dialog-footer"]')
    if (!footer) return { error: "sin pie" } as const
    const buttons = Array.from(footer.querySelectorAll("button, a"))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !el.closest(".sr-only")
      })
      .map((el) => el.getBoundingClientRect())
    if (buttons.length === 0) return { error: "pie sin botones" } as const

    const left = Math.min(...buttons.map((b) => b.left)) - rect.left
    const right = rect.right - Math.max(...buttons.map((b) => b.right))
    const bottom = rect.bottom - Math.max(...buttons.map((b) => b.bottom))

    let overlap = false
    for (let i = 0; i < buttons.length; i++) {
      for (let j = i + 1; j < buttons.length; j++) {
        const w = Math.min(buttons[i].right, buttons[j].right) - Math.max(buttons[i].left, buttons[j].left)
        const h = Math.min(buttons[i].bottom, buttons[j].bottom) - Math.max(buttons[i].top, buttons[j].top)
        if (w > 1 && h > 1) overlap = true
      }
    }
    const footerRect = footer.getBoundingClientRect()
    return {
      left,
      right,
      bottom,
      overlap,
      footerInside: footerRect.left >= rect.left - 1 && footerRect.right <= rect.right + 1 && footerRect.bottom <= rect.bottom + 1,
    } as const
  })
}

async function expectBalancedFooter(page: Page, label: string) {
  const dialog = await settledDialog(page)
  const info = await measureFooter(dialog)
  expect("error" in info ? info.error : "", label + ": " + JSON.stringify(info)).toBe("")
  if ("error" in info) return
  const detail = label + ": " + JSON.stringify(info)
  expect(info.left, "izquierda " + detail).toBeGreaterThanOrEqual(MIN_SIDE)
  expect(info.right, "derecha " + detail).toBeGreaterThanOrEqual(MIN_SIDE)
  expect(info.bottom, "abajo " + detail).toBeGreaterThanOrEqual(MIN_BOTTOM)
  expect(info.overlap, "botones superpuestos " + detail).toBe(false)
  expect(info.footerInside, "pie fuera del modal " + detail).toBe(true)
}

type Case = { name: string; desktopOnly?: boolean; open: (page: Page) => Promise<void> }

const CASES: Case[] = [
  {
    name: "Crear proyecto",
    open: async (page) => {
      await page.goto("/dashboard")
      await page.getByRole("button", { name: "Crear proyecto" }).first().click()
    },
  },
  {
    name: "Eliminar proyecto (confirmación)",
    open: async (page) => {
      await page.goto("/dashboard")
      await page.getByRole("button", { name: "Acciones de Crónicas del viento" }).click()
      await page.getByRole("menuitem", { name: "Eliminar" }).click()
    },
  },
  {
    name: "Configuración",
    open: async (page) => {
      await page.goto("/dashboard")
      await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
      await page.getByRole("menuitem", { name: "Configuración" }).click()
    },
  },
  {
    name: "Nueva tarjeta",
    open: async (page) => {
      await page.goto(base + "/storyboard")
      await page.getByRole("button", { name: "Nueva tarjeta" }).first().click()
    },
  },
  {
    name: "Nueva entidad",
    open: async (page) => {
      await page.goto(base + "/worldbuilding")
      await page.getByRole("button", { name: /^Nueva( Entidad)?$/ }).first().click()
    },
  },
  {
    name: "Nueva relación",
    desktopOnly: true,
    open: async (page) => {
      await page.goto(base + "/worldbuilding?tab=relationships")
      await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    },
  },
  {
    name: "Compartir obra",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: "Compartir obra" }).first().click()
    },
  },
  {
    name: "Exportar obra",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: "Exportar obra" }).first().click()
    },
  },
  {
    name: "Agregar libro",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: "Agregar libro" }).click()
    },
  },
  {
    name: "Analizar cambios del proyecto",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openScene(page)
      await openEditorMenu(page, "Revisar", "Analizar proyecto")
    },
  },
  {
    name: "Historial de inconsistencias",
    desktopOnly: true,
    open: async (page) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await openEditor(page)
      await page
        .locator("aside")
        .filter({ hasText: /Inconsistencias detectadas/i })
        .getByRole("button", { name: "Historial" })
        .click()
    },
  },
]

for (const viewport of [
  { name: "escritorio 1440", width: 1440, height: 900, mobile: false },
  { name: "celular 375", width: 375, height: 812, mobile: true },
  { name: "celular 320", width: 320, height: 568, mobile: true },
]) {
  test.describe("Pie de los modales — " + viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const item of CASES) {
      if (item.desktopOnly && viewport.mobile) continue
      test(item.name + ": botones con aire y sin superponerse", async ({ page }) => {
        await installModalBackend(page)
        await item.open(page)
        await expectBalancedFooter(page, item.name + " (" + viewport.name + ")")
      })
    }
  })
}
