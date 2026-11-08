import { expect, test } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"

test.describe("Áreas de toque y textos cortados", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("los botones tipo enlace de los formularios tienen al menos 24px de área de toque", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 })
    await installModalBackend(page)
    for (const [url, names] of [
      ["/login", ["¿Olvidaste tu contraseña?", "Registrate"]],
      ["/register", ["Iniciá sesión"]],
    ] as const) {
      await page.goto(url)
      for (const name of names) {
        const target = page.getByRole("button", { name })
        await expect(target).toBeVisible()
        await target.scrollIntoViewIfNeeded()
        const reach = await target.evaluate((el) => {
          const box = el.getBoundingClientRect()
          const midX = box.left + box.width / 2
          const midY = box.top + box.height / 2
          const hits = (dy: number) => {
            const hit = document.elementFromPoint(midX, midY + dy)
            return !!hit && (hit === el || el.contains(hit))
          }
          return hits(-12) && hits(12)
        })
        expect(reach, `«${name}» tiene un área de toque menor a 24px`).toBe(true)
      }
    }
  })

  test("un texto cortado con «…» muestra el texto completo al pasar el mouse, y uno completo no", async ({ page }) => {
    await installModalBackend(page)
    await page.goto("/login")
    await page.evaluate(() => {
      const host = document.createElement("div")
      host.style.cssText = "position:fixed;top:120px;left:20px;width:160px;background:#fff;color:#000;z-index:99999"
      const long = document.createElement("div")
      long.id = "probe-long"
      long.className = "truncate"
      long.textContent = "Un título larguísimo que no entra en ciento sesenta píxeles de ancho"
      const short = document.createElement("div")
      short.id = "probe-short"
      short.className = "truncate"
      short.textContent = "Corto"
      host.append(long, short)
      document.body.appendChild(host)
    })
    await page.locator("#probe-long").hover()
    await expect(page.locator("#probe-long")).toHaveAttribute(
      "title",
      "Un título larguísimo que no entra en ciento sesenta píxeles de ancho",
    )
    await page.locator("#probe-short").hover()
    await expect(page.locator("#probe-short")).not.toHaveAttribute("title", /.+/)
  })
})
