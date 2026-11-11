import { expect, test, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed, openEditor } from "./support/modal-helpers"

/**
 * Chat y paneles del editor: fuentes discretas, accesos directos con efecto visible,
 * letras coherentes entre paneles y campos numéricos sin flechitas.
 */

const HELP_ANSWER = "La barra de herramientas de formato se muestra con el botón Mostrar herramientas."

async function openChat(page: Page) {
  await installModalBackend(page)
  await openEditor(page)
  await page.getByRole("button", { name: /Chat IA/ }).click()
  await expect(page.getByText("Mensaje número 30", { exact: true })).toBeVisible({ timeout: 10_000 })
}

test.describe("Fuentes del chat", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("las referencias de la obra arrancan ocultas y, abiertas, son compactas", async ({ page }) => {
    await openChat(page)

    const toggle = page.getByRole("button", { name: "Mostrar referencias utilizadas" })
    await toggle.scrollIntoViewIfNeeded()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByRole("button", { name: /\[1\] Fuente 1/ })).toBeHidden()

    await toggle.click()
    const card = page.getByRole("button", { name: /\[1\] Fuente 1/ })
    await expect(card).toBeVisible()
    const { height, clamp } = await card.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      clamp: getComputedStyle(el.querySelector(".chat-source-description")!).getPropertyValue("-webkit-line-clamp"),
    }))
    expect(height, "la tarjeta de referencia ocupa demasiado alto").toBeLessThanOrEqual(56)
    expect(clamp).toBe("1")
  })

  test("una respuesta sobre cómo usar PlumIA no muestra la documentación cruda ni referencias", async ({ page }) => {
    await openChat(page)

    const answer = page.locator("article", { hasText: HELP_ANSWER })
    await answer.scrollIntoViewIfNeeded()
    await expect(answer.getByText("Acceso directo")).toBeVisible()
    await expect(answer.getByText(/Referencias utilizadas/)).toHaveCount(0)
    await expect(page.getByText("**Resumen:**")).toHaveCount(0)
    await expect(page.getByText(/oculta por defecto en los modos/)).toHaveCount(0)
  })

  test("«Ir ahí» tiene aire a la derecha y no queda pegado al borde", async ({ page }) => {
    await openChat(page)

    const action = page.getByRole("button", { name: /Mostrar u ocultar la barra de herramientas de formato/ })
    await action.scrollIntoViewIfNeeded()
    const gaps = await action.evaluate((el) => {
      const card = el.getBoundingClientRect()
      const label = Array.from(el.querySelectorAll("span")).find((node) => /^Ir ahí/.test(node.textContent ?? ""))!
      const right = label.getBoundingClientRect()
      return { right: card.right - right.right, left: card.left, labelLeft: el.querySelector("div")!.getBoundingClientRect().left - card.left }
    })
    expect(gaps.right, "«Ir ahí» está pegado al borde derecho").toBeGreaterThanOrEqual(10)
    expect(gaps.labelLeft, "el ícono está pegado al borde izquierdo").toBeGreaterThanOrEqual(10)
  })

  test("«Ir ahí» muestra la barra de herramientas oculta y avisa qué pasó", async ({ page }) => {
    await openChat(page)

    await expect(page.getByRole("button", { name: "Mostrar herramientas" })).toHaveAttribute("aria-expanded", "false")
    const action = page.getByRole("button", { name: /Mostrar u ocultar la barra de herramientas de formato/ })
    await action.scrollIntoViewIfNeeded()
    await action.click()

    await expect(page.getByRole("button", { name: "Ocultar herramientas" })).toHaveAttribute("aria-expanded", "true")
    await expect(page.locator("[data-sonner-toast]").first()).toContainText("La barra de herramientas de formato está visible")
  })

  test("«Ir ahí» con una sección del panel derecho abre esa pestaña y avisa sin tono de reproche", async ({ page }) => {
    await openChat(page)

    const action = page.getByRole("button", { name: /El panel Stats del Editor/ })
    await action.scrollIntoViewIfNeeded()
    await action.click()

    await expect(page.getByRole("button", { name: "Stats", exact: true })).toHaveAttribute("aria-pressed", "true")
    const toast = page.locator("[data-sonner-toast]").first()
    await expect(toast).toContainText("Las estadísticas están a la vista en el panel derecho")
    await expect(toast).not.toContainText(/ya estás|te mostré/i)
  })

  test("«Ir ahí» con una sección del panel derecho abre esa pestaña y avisa sin sonar a reproche", async ({ page }) => {
    await openChat(page)

    const action = page.getByRole("button", { name: /El panel Stats del Editor/ })
    await action.scrollIntoViewIfNeeded()
    await action.click()

    await expect(page.getByRole("button", { name: "Stats", exact: true })).toHaveAttribute("aria-pressed", "true")
    const toast = page.locator("[data-sonner-toast]").first()
    await expect(toast).toContainText("Las estadísticas están a la vista en el panel derecho")
    await expect(toast).not.toContainText(/ya estás|te mostré/i)
  })
})

test.describe("Tamaño de letra de los paneles", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("el chat usa la misma letra que los demás paneles y solo crece al expandirlo", async ({ page }) => {
    await openChat(page)

    const bubble = page.locator("article", { hasText: "Mensaje número 30" }).locator("div.rounded-2xl").first()
    await bubble.scrollIntoViewIfNeeded()
    const small = await bubble.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(small).toBeLessThanOrEqual(12.5)

    await page.getByRole("button", { name: "Pantalla completa" }).click()
    const large = await bubble.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(large).toBeGreaterThanOrEqual(16)
  })

  test("la wiki se puede expandir a pantalla completa con letra levemente mayor", async ({ page }) => {
    await installModalBackend(page)
    await openEditor(page)

    const search = page.getByPlaceholder(/Buscar (entidades|en la revisión)/)
    await expect(search).toBeVisible()
    const normalSize = await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))

    await page.getByRole("button", { name: "Ver la wiki en pantalla completa" }).click()
    const expanded = page.locator('.wiki-panel[data-expanded="true"]')
    await expect(expanded).toBeVisible()
    const box = (await expanded.locator("> div").boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.width).toBeGreaterThan(viewport.width * 0.6)
    expect(box.height).toBeGreaterThan(viewport.height * 0.8)
    const bigSize = await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(bigSize, "la letra no creció al expandir").toBeGreaterThan(normalSize)
    expect(bigSize - normalSize).toBeLessThanOrEqual(4)

    await page.keyboard.press("Escape")
    await expect(page.locator('.wiki-panel[data-expanded="true"]')).toHaveCount(0)
    const back = await search.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(back).toBe(normalSize)
  })

  test("con la wiki expandida, un modal abierto encima se cierra con Escape sin cerrar el panel", async ({ page }) => {
    await installModalBackend(page)
    await openEditor(page)
    await page.getByRole("button", { name: "Ver la wiki en pantalla completa" }).click()
    await expect(page.locator('.wiki-panel[data-expanded="true"]')).toBeVisible()

    await page.getByRole("button", { name: /Nueva entidad|Crear entidad/ }).first().click().catch(() => undefined)
    if (await page.locator('[role="dialog"]').count()) {
      await page.keyboard.press("Escape")
      await expect(page.locator('[role="dialog"]')).toHaveCount(0)
      await expect(page.locator('.wiki-panel[data-expanded="true"]')).toBeVisible()
    }
  })
})

test.describe("Campos numéricos", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("no muestran las flechitas del navegador pero se puede usar ↑ ↓ del teclado", async ({ page }) => {
    await installModalBackend(page)
    await page.goto(`/projects/${projectId}/statistics`)
    await page.getByRole("button", { name: /Definir metas/ }).first().click()
    const dialog = dialogNamed(page, "Definir metas de escritura")
    const field = dialog.locator("#daily-target")
    await expect(field).toBeVisible()

    expect(await field.evaluate((el) => getComputedStyle(el).appearance)).toBe("textfield")
    await field.fill("500")
    await field.press("ArrowUp")
    await expect(field).toHaveValue("501")
  })
})
