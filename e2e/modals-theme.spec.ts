import { expect, test, type Locator, type Page } from "@playwright/test"

import type { AuthorAnnotation } from "@/types/author-annotation"
import { installModalBackend } from "./support/modal-backend"
import {
  dialogNamed,
  openEditor,
  openEditorMenu,
  openScene,
} from "./support/modal-helpers"

/**
 * Contraste (WCAG) del texto de un elemento contra su fondo real: compone los
 * fondos translúcidos de los ancestros hasta llegar a la página.
 */
async function contrastRatio(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    type Rgba = [number, number, number, number]
    const parse = (value: string): Rgba | null => {
      const rgb = value.match(/^rgba?\(([^)]+)\)$/)
      if (rgb) {
        const [r, g, b, a = 1] = rgb[1]
          .split(/[\s,/]+/)
          .filter(Boolean)
          .map(Number)
        return [r, g, b, a]
      }
      const srgb = value.match(/^color\(srgb ([^)]+)\)$/)
      if (srgb) {
        const [r, g, b, a = 1] = srgb[1]
          .split(/[\s/]+/)
          .filter(Boolean)
          .map(Number)
        return [r * 255, g * 255, b * 255, a]
      }
      return null
    }
    const over = (top: Rgba, bottom: Rgba): Rgba => {
      const alpha = top[3] + bottom[3] * (1 - top[3])
      const mix = (index: number) =>
        (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha
      return [mix(0), mix(1), mix(2), alpha]
    }
    const layers: Rgba[] = []
    for (let node: Element | null = element; node; node = node.parentElement) {
      const parsed = parse(getComputedStyle(node).backgroundColor)
      if (parsed && parsed[3] > 0) layers.push(parsed)
    }
    let background: Rgba = [255, 255, 255, 1]
    for (const layer of layers.reverse()) background = over(layer, background)

    const foreground = parse(getComputedStyle(element).color)
    if (!foreground) throw new Error("No se pudo leer el color del texto")
    const text = over(foreground, background)
    const luminance = ([r, g, b]: Rgba) => {
      const channel = (value: number) => {
        const scaled = value / 255
        return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const [lighter, darker] = [luminance(text), luminance(background)].sort((a, b) => b - a)
    return (lighter + 0.05) / (darker + 0.05)
  })
}

const writer = {
  id: "e2e-writer",
  name: "Escritora",
  lastname: "Prueba",
  displayName: "Escritora de prueba",
  avatarUrl: null,
}

const annotations: AuthorAnnotation[] = [
  {
    id: "annotation-city",
    sceneId: "e2e-scene",
    authorId: writer.id,
    author: writer,
    body: "Comprobar este detalle.",
    quote: "ciudad",
    anchorFrom: null,
    anchorTo: null,
    contextBefore: null,
    contextAfter: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
  },
]

async function useTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme })
  await page.addInitScript((value) => {
    window.localStorage.setItem("plumia-theme", value)
  }, theme)
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`Legibilidad del editor en modo ${theme}`, () => {
    test("los menús de la barra del editor tienen texto legible sobre su fondo", async ({ page }) => {
      await installModalBackend(page)
      await useTheme(page, theme)
      await openEditor(page)
      await openScene(page)

      await page
        .getByRole("menubar", { name: "Menús del editor" })
        .getByRole("menuitem", { name: "Editar" })
        .click()
      const menu = page.getByRole("menu").first()
      await expect(menu).toBeVisible()
      expect(await contrastRatio(menu.getByRole("menuitem", { name: "Buscar y reemplazar" }))).toBeGreaterThanOrEqual(4.5)
    })

    test("los menús desplegables de la barra de herramientas son legibles", async ({ page }) => {
      await installModalBackend(page)
      await useTheme(page, theme)
      await openEditor(page)
      await openScene(page)

      await page.getByRole("button", { name: "Mostrar herramientas" }).click()
      await page.locator(".ProseMirror p").first().click()
      await page.getByRole("button", { name: "Alineación del párrafo" }).click()
      const item = page.getByRole("menuitemradio", { name: "Centrada" })
      await expect(item).toBeVisible()
      expect(await contrastRatio(item)).toBeGreaterThanOrEqual(4.5)
    })

    test("las opciones del selector del editor (corrector) son legibles", async ({ page }) => {
      await installModalBackend(page)
      await useTheme(page, theme)
      await openEditor(page)
      await openScene(page)

      await openEditorMenu(page, "Revisar", "Configuración del corrector")
      const dialog = dialogNamed(page, "Configuración del corrector")
      await dialog.locator("#spellcheck-settings-language").click()
      const option = page.getByRole("menuitemradio", { name: "English (United States)" })
      await expect(option).toBeVisible()
      expect(await contrastRatio(option)).toBeGreaterThanOrEqual(4.5)
    })

    test("el pie del editor es legible", async ({ page }) => {
      await installModalBackend(page)
      await useTheme(page, theme)
      await openEditor(page)
      await openScene(page)

      const footerText = page.locator("footer").getByText("palabras")
      await expect(footerText).toBeVisible()
      expect(await contrastRatio(footerText)).toBeGreaterThanOrEqual(4.5)
    })

    test("el panel de anotaciones es legible", async ({ page }) => {
      await installModalBackend(page, { authorAnnotations: annotations })
      await useTheme(page, theme)
      await openEditor(page)
      // Con anotaciones el texto lleva marcadores, por eso no se usa openScene().
      await page.getByRole("button", { name: "El umbral 10 palabras" }).click()
      await expect(page.locator(".ProseMirror")).toContainText("La noche cubría la ciudad")

      await openEditorMenu(page, "Revisar", "Ocultar iconos de anotación")
      await openEditorMenu(page, "Revisar", "Mostrar comentarios")
      const panel = page.getByRole("complementary").filter({ hasText: "Anotaciones" })
      await expect(panel).toBeVisible()
      expect(await contrastRatio(panel.getByRole("heading", { name: "Anotaciones" }))).toBeGreaterThanOrEqual(4.5)
      expect(await contrastRatio(panel.getByRole("button", { name: /^Resueltas/ }))).toBeGreaterThanOrEqual(4.5)
      expect(await contrastRatio(panel.getByText("Comprobar este detalle."))).toBeGreaterThanOrEqual(4.5)
      expect(await contrastRatio(panel.getByRole("button", { name: "ciudad" }))).toBeGreaterThanOrEqual(4.5)
    })
  })
}
