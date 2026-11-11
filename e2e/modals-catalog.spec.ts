import { expect, test, type Locator, type Page } from "@playwright/test"

import { installModalBackend, projectId } from "./support/modal-backend"
import { dialogNamed, openEditor, openEditorMenu, openScene, openTreeMenu } from "./support/modal-helpers"
import {
  VIEWPORTS,
  auditOverlay,
  closeAllOverlays,
  exploreInsideDialog,
  makeCollector,
  overlayCount,
  report,
  settle,
  watchRuntime,
} from "./support/ui-audit-core"

/**
 * Catálogo de modales: cada uno se abre por su camino real (menús contextuales,
 * selección de texto, botones de tarjetas…) y se le pasan las mismas revisiones
 * de diseño que a las pantallas: desbordes, texto cortado, solapes, elementos
 * tapados, foco, pestañas fijas y cierre con Escape.
 *
 * Complementa a `ui-audit.spec.ts`, que solo llega a lo que se abre al hacer clic
 * sobre la pantalla tal como carga. Por defecto corre en 3 tamaños; con
 * UI_AUDIT=1 corre en todos.
 */

const base = `/projects/${projectId}`

type Backend = Awaited<ReturnType<typeof installModalBackend>>

type Scenario = {
  /** Nombre para el reporte. */
  name: string
  /** Título accesible del modal que debe quedar abierto. */
  title: string | RegExp
  role?: "dialog" | "alertdialog"
  /** Solo en pantallas con mouse (no hay editor en celular). */
  desktopOnly?: boolean
  open: (page: Page, backend: Backend) => Promise<void>
}

async function openSettings(page: Page) {
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
  await page.getByRole("menuitem", { name: "Configuración" }).click()
  await expect(page.getByRole("dialog", { name: "Configuración" })).toBeVisible()
}

async function selectWordInReader(page: Page, word: string) {
  await page.evaluate((target) => {
    const paragraph = document.querySelector<HTMLElement>(".ProseMirror p")
    if (!paragraph?.firstChild) throw new Error("No hay texto para seleccionar")
    const text = paragraph.firstChild
    const start = (text.textContent ?? "").indexOf(target)
    const range = document.createRange()
    range.setStart(text, start)
    range.setEnd(text, start + target.length)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    paragraph.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    paragraph.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
  }, word)
}

async function openHistory(page: Page) {
  await openEditor(page)
  await openScene(page)
  await page.getByRole("button", { name: "Historial", exact: true }).first().click()
}

async function createVersion(page: Page, label: string) {
  await page.getByRole("button", { name: /Crear versión/ }).click()
  const create = dialogNamed(page, "Crear versión")
  await create.getByLabel("Nombre").fill(label)
  await create.getByLabel("Nombre").press("Enter")
  await expect(create).toBeHidden()
  await expect(page.getByRole("button", { name: new RegExp(`^${label} 10 palabras`) })).toBeVisible()
}

const SCENARIOS: Scenario[] = [
  // ----- árbol del proyecto
  {
    name: "Editar libro",
    title: "Editar libro",
    desktopOnly: true,
    open: async (page, backend) => {
      backend.setCover(true)
      await openEditor(page)
      await openTreeMenu(page, "Libro I", "Editar")
    },
  },
  {
    name: "Editar capítulo",
    title: "Editar elemento",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openTreeMenu(page, "Capítulo 1", "Editar")
    },
  },
  {
    name: "Eliminar elemento",
    title: "Eliminar elemento",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openTreeMenu(page, "Capítulo 1", "Eliminar")
    },
  },
  {
    name: "Quitar portada",
    title: "¿Quitar la portada?",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page, backend) => {
      backend.setCover(true)
      await openEditor(page)
      await openTreeMenu(page, "Libro I", "Editar")
      await dialogNamed(page, "Editar libro").getByRole("button", { name: "Quitar portada" }).click()
    },
  },
  // ----- historial de versiones
  {
    name: "Cambiar nombre de versión",
    title: "Cambiar nombre",
    desktopOnly: true,
    open: async (page) => {
      await openHistory(page)
      await createVersion(page, "Final alternativo")
      await page.getByRole("button", { name: "Cambiar nombre de Final alternativo" }).click()
    },
  },
  {
    name: "Convertir en principal",
    title: "Convertir en principal",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await openHistory(page)
      await createVersion(page, "Final alternativo")
      await page.getByRole("button", { name: "Convertir Final alternativo en principal" }).click()
    },
  },
  {
    name: "Eliminar versión",
    title: "Eliminar versión",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await openHistory(page)
      await createVersion(page, "Final alternativo")
      await page.getByRole("button", { name: "Eliminar Final alternativo" }).click()
    },
  },
  // ----- diálogos de texto del editor
  {
    name: "Confirmar reemplazo",
    title: "Confirmar reemplazo",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openScene(page)
      await openEditorMenu(page, "Editar", "Buscar y reemplazar")
      await page.getByLabel("Buscar", { exact: true }).fill("noche")
      await page.getByLabel("Reemplazar por").fill("madrugada")
      await page.getByRole("button", { name: "Reemplazar todo" }).click()
    },
  },
  {
    name: "Opciones de párrafo",
    title: "Opciones de párrafo",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openScene(page)
      await page.locator(".ProseMirror p").first().click()
      await openEditorMenu(page, "Formato", "Opciones de párrafo…")
    },
  },
  {
    name: "Configuración del corrector",
    title: "Configuración del corrector",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openScene(page)
      await openEditorMenu(page, "Revisar", "Configuración del corrector")
    },
  },
  {
    name: "Guardar estilo reutilizable",
    title: "Guardar estilo reutilizable",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openScene(page)
      await page.locator(".ProseMirror").click()
      await page.keyboard.press("ControlOrMeta+a")
      await page
        .getByRole("menubar", { name: "Menús del editor" })
        .getByRole("menuitem", { name: "Formato" })
        .click()
      await page.getByRole("menuitem", { name: "Estilos de texto" }).click()
      await page.getByRole("menuitem", { name: /Guardar selección como estilo/ }).click()
    },
  },
  {
    name: "Sugerencias ortográficas",
    title: "Sugerencias ortográficas",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await openScene(page)
      await page.locator(".ProseMirror p").first().click()
      await page.keyboard.press("End")
      await page.keyboard.type(" rumbbo")
      await expect(async () => {
        const point = await page.evaluate(() => {
          const walker = document.createTreeWalker(document.querySelector(".ProseMirror")!, NodeFilter.SHOW_TEXT)
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const index = (node.textContent ?? "").indexOf("rumbbo")
            if (index < 0) continue
            const range = document.createRange()
            range.setStart(node, index)
            range.setEnd(node, index + 6)
            const rect = range.getBoundingClientRect()
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
          }
          return null
        })
        expect(point).not.toBeNull()
        await page.mouse.click(point!.x, point!.y, { button: "right" })
        await expect(dialogNamed(page, "Sugerencias ortográficas")).toBeVisible({ timeout: 1500 })
      }).toPass({ timeout: 10_000 })
    },
  },
  // ----- chat
  {
    name: "Fuentes revisadas del chat",
    title: "Fuentes revisadas",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: /Chat IA/ }).click()
      await page.getByRole("button", { name: "Mostrar referencias utilizadas" }).click()
    const viewAll = page.getByRole("button", { name: /\+2 fuentes revisadas · Ver todas/ })
      await viewAll.scrollIntoViewIfNeeded()
      await viewAll.click()
    },
  },
  {
    name: "Eliminar conversación",
    title: "Eliminar conversación",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await openEditor(page)
      await page.getByRole("button", { name: /Chat IA/ }).click()
      await page.getByRole("button", { name: "Abrir historial de conversaciones" }).click()
      await page.getByRole("button", { name: "Eliminar Ideas para el final" }).click()
    },
  },
  // ----- tablero
  {
    name: "Editar tarjeta",
    title: "Editar Tarjeta",
    open: async (page) => {
      await page.goto(`${base}/storyboard`)
      await page.getByRole("button", { name: "Editar" }).first().click()
    },
  },
  {
    name: "Eliminar tarjeta",
    title: "Eliminar tarjeta",
    role: "alertdialog",
    open: async (page) => {
      await page.goto(`${base}/storyboard`)
      await page.getByRole("button", { name: "Eliminar" }).first().click()
    },
  },
  {
    name: "Eliminar nota de la matriz",
    title: "Eliminar nota",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await page.goto(`${base}/storyboard?view=matrix`)
      await page.getByRole("button", { name: "Eliminar nota" }).first().click()
    },
  },
  // ----- worldbuilding
  {
    name: "Eliminar entidad",
    title: "Eliminar entidad",
    role: "alertdialog",
    open: async (page) => {
      await page.goto(`${base}/worldbuilding`)
      await page.getByText("Gabriel Ortega", { exact: true }).first().click()
      await page.getByRole("button", { name: "Eliminar", exact: true }).click()
    },
  },
  {
    name: "Agregar estado de una entidad",
    title: /Agregar estado/,
    open: async (page) => {
      await page.goto(`${base}/worldbuilding`)
      await page.getByText("Gabriel Ortega", { exact: true }).first().click()
      const history = page.getByRole("button", { name: /Historial de cambios/ })
      // Según el estado guardado de la sección puede venir abierta o cerrada.
      if ((await history.getAttribute("aria-expanded")) !== "true") await history.click()
      await page.getByRole("button", { name: "Agregar estado" }).click()
    },
  },
  {
    name: "Nueva relación",
    title: "Nueva Relación",
    // En celular el botón «Nueva» del encabezado abre «Nueva Entidad»: la relación se crea desde otro camino.
    desktopOnly: true,
    open: async (page) => {
      await page.goto(`${base}/worldbuilding?tab=relationships`)
      await page.getByRole("button", { name: /Nueva Relación/ }).first().click()
    },
  },
  {
    name: "Reordenar cronología",
    title: "Confirmar reordenamiento",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await page.goto(`${base}/worldbuilding?tab=timeline`)
      await page.getByRole("button", { name: "Reordenar cronología" }).click()
      await page.getByRole("button", { name: "Bajar Desaparece el librero" }).click()
    },
  },
  {
    name: "Eliminar evento",
    title: "Eliminar evento",
    role: "alertdialog",
    desktopOnly: true,
    open: async (page) => {
      await page.goto(`${base}/worldbuilding?tab=timeline`)
      await page.getByRole("button", { name: "Eliminar Desaparece el librero" }).click()
    },
  },
  // ----- lector compartido
  {
    name: "Comentar selección",
    title: "Comentar selección",
    open: async (page) => {
      await page.goto("/shared/invitacion-1?token=token-1")
      await expect(page.locator(".ProseMirror p").first()).toContainText("La noche cubría la ciudad.")
      await selectWordInReader(page, "noche")
      // En pantallas táctiles la selección ofrece primero una barra con «Comentar».
      const bar = page.getByRole("region", { name: "Comentar selección" })
      if (await bar.isVisible().catch(() => false)) {
        await bar.getByRole("button", { name: "Comentar" }).click()
      }
    },
  },
  // ----- configuración de la cuenta
  {
    name: "Salir sin guardar",
    title: "¿Salir sin guardar?",
    role: "alertdialog",
    open: async (page) => {
      await openSettings(page)
      const dialog = page.getByRole("dialog", { name: "Configuración" })
      await dialog.getByLabel("Nombre visible").fill("Otro nombre")
      await page.keyboard.press("Escape")
    },
  },
  {
    name: "Eliminar cuenta",
    title: "¿Eliminar tu cuenta?",
    role: "alertdialog",
    open: async (page) => {
      await openSettings(page)
      await page
        .getByRole("dialog", { name: "Configuración" })
        .getByRole("button", { name: "Eliminar cuenta" })
        .click()
    },
  },
  {
    name: "Administrar entidades",
    title: "Administrar entidades",
    open: async (page) => {
      await openSettings(page)
      const dialog = page.getByRole("dialog", { name: "Configuración" })
      await dialog.getByRole("tab", { name: "Reconocimiento" }).click()
      await dialog.locator("#entity-recognition-project").selectOption({ index: 1 })
      await dialog.getByRole("button", { name: "Administrar entidades" }).click()
    },
  },
]

const SHORT = new Set(["movil-375", "notebook-1280x720", "escritorio-1440"])
/**
 * Los datos de prueba tienen títulos cortos; en un manuscrito real las escenas se muestran como
 * «Capítulo: Escena» y pueden ser largas. Se agrega una opción larga, ya elegida, a cada
 * selector nativo del modal para que un diseño que solo funciona con textos cortos se note.
 */
async function useLongSelectOptions(page: Page, modal: Locator) {
  await modal.locator("select").evaluateAll((selects) => {
    for (const select of selects as HTMLSelectElement[]) {
      select.add(
        new Option(
          "Capítulo 12 · El llamado de la torre: Una luz en la ventana del último piso",
          "opcion-larga",
        ),
      )
      select.value = "opcion-larga"
    }
  })
}

const ALL = new Set(["movil-320", "movil-375", "tablet-768", "notebook-1280x720", "notebook-1366x768", "escritorio-1440"])
const viewports = VIEWPORTS.filter((v) => (process.env.UI_AUDIT ? ALL : SHORT).has(v.name))

for (const viewport of viewports) {
  test.describe(`Catálogo de modales — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const scenario of SCENARIOS) {
      if (scenario.desktopOnly && viewport.touch) continue

      test(scenario.name, async ({ page }) => {
        test.setTimeout(60_000)
        const collector = makeCollector()
        watchRuntime(page, collector)
        const backend = await installModalBackend(page)

        await scenario.open(page, backend)
        const role = scenario.role ?? "dialog"
        const modal = page.getByRole(role, { name: scenario.title })
        await expect(modal, `no se abrió «${scenario.name}»`).toBeVisible()

        await useLongSelectOptions(page, modal)
        const context = `${scenario.name} (${viewport.name})`
        await auditOverlay(page, collector, context, viewport.touch)
        await exploreInsideDialog(page, collector, context, viewport.touch)

        // Escape cierra solo la capa de arriba y no deja nada trabado.
        if ((await overlayCount(page)) > 0) {
          const before = await overlayCount(page)
          await page.keyboard.press("Escape")
          // Con la máquina cargada el cierre puede demorar: se espera hasta 2 s antes de dar el error.
          await expect
            .poll(async () => overlayCount(page), { timeout: 2000 })
            .toBeLessThan(before)
            .catch(() => undefined)
          const after = await overlayCount(page)
          if (after >= before && before > 0) {
            // Un modal con cambios sin guardar pide confirmación: eso también es un cierre válido.
            const pending = await page.getByRole("alertdialog", { name: /sin guardar/ }).count()
            if (!pending) collector.note(context, "Escape no cierra el modal")
          }
        }
        await closeAllOverlays(page)
        await settle(page)

        const failures = report(`catalogo-${viewport.name}-${scenario.name.replace(/\s+/g, "-")}`, collector)
        expect(failures, failures.join("\n")).toEqual([])
      })
    }
  })
}
