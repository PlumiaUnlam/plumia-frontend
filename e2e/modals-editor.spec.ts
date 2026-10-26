import { expect, test, type Page } from "@playwright/test"

import { installModalBackend } from "./support/modal-backend"
import {
  alertNamed,
  dialogNamed,
  openEditor,
  openEditorMenu,
  openScene,
  openTreeMenu,
} from "./support/modal-helpers"

test.describe("Modales del árbol del proyecto", () => {
  test("Nuevo libro: el botón espera un nombre, Enter envía y el libro aparece en el árbol", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: "Agregar libro" }).click()
    const dialog = dialogNamed(page, "Nuevo Libro")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Crear Libro" })).toBeDisabled()

    const name = dialog.getByLabel("Nombre del Libro")
    await name.fill("Libro II")
    await expect(dialog.getByRole("button", { name: "Crear Libro" })).toBeEnabled()
    await name.press("Enter")

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /^\/projects\/e2e-project\/books$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ title: "Libro II" })
    await expect(page.getByRole("button", { name: "Libro II", exact: true })).toBeVisible()
  })

  test("Nuevo libro: si el servidor falla se muestra el error, el modal sigue abierto y se puede reintentar", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    backend.failNext("POST", /\/books$/, 500, "No se pudo crear el libro ahora")
    await openEditor(page)

    await page.getByRole("button", { name: "Agregar libro" }).click()
    const dialog = dialogNamed(page, "Nuevo Libro")
    const name = dialog.getByLabel("Nombre del Libro")
    await name.fill("Libro II")
    await dialog.getByRole("button", { name: "Crear Libro" }).click()

    await expect(dialog.getByText("No se pudo crear el libro ahora", { exact: true })).toBeVisible()
    await expect(dialog).toBeVisible()

    // Al modificar el nombre el error desaparece y el reintento funciona.
    await name.fill("Libro II (v2)")
    await expect(dialog.getByText("No se pudo crear el libro ahora", { exact: true })).toHaveCount(0)
    await dialog.getByRole("button", { name: "Crear Libro" }).click()
    await expect(dialog).toBeHidden()
    expect(backend.callsTo("POST", /\/books$/)).toHaveLength(2)
  })

  test("Nuevo libro: Escape y Cancelar cierran sin crear nada", async ({ page }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: "Agregar libro" }).click()
    const dialog = dialogNamed(page, "Nuevo Libro")
    await dialog.getByLabel("Nombre del Libro").fill("Descartado")
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()

    await page.getByRole("button", { name: "Agregar libro" }).click()
    await expect(dialog.getByLabel("Nombre del Libro")).toHaveValue("")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()

    expect(backend.callsTo("POST", /books$/)).toHaveLength(0)
  })

  test("Nueva sección: se crea dentro del capítulo elegido", async ({ page }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: "Capítulo 1", exact: true }).hover()
    await page.getByRole("button", { name: "Agregar sección a Capítulo 1" }).click()
    const dialog = dialogNamed(page, "Nueva Sección")
    await dialog.getByLabel("Nombre de la Sección").fill("La llegada")
    await dialog.getByRole("button", { name: "Crear Sección" }).click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /^\/chapters\/e2e-chapter\/scenes$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ title: "La llegada" })
    await expect(page.getByText("La llegada", { exact: true })).toBeVisible()
  })

  test("Editar libro: muestra nombre y portada, cancelar no guarda y guardar renombra", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await openTreeMenu(page, "Libro I", "Editar")
    const dialog = dialogNamed(page, "Editar libro")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Nombre")).toHaveValue("Libro I")
    await expect(dialog.getByText("Portada", { exact: true })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Subir portada" })).toBeVisible()

    await dialog.getByLabel("Nombre").fill("Descartado")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    expect(backend.callsTo("PATCH", /^\/books\//)).toHaveLength(0)

    await openTreeMenu(page, "Libro I", "Editar")
    await dialog.getByLabel("Nombre").fill("Libro Primero")
    await dialog.getByLabel("Nombre").press("Enter")

    await expect(dialog).toBeHidden()
    const updates = backend.callsTo("PATCH", /^\/books\/e2e-book$/)
    expect(updates).toHaveLength(1)
    expect(updates[0].body).toMatchObject({ title: "Libro Primero" })
    await expect(page.getByRole("button", { name: "Libro Primero", exact: true })).toBeVisible()
  })

  test("Editar capítulo: no ofrece portada y el botón se bloquea sin nombre", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)

    await openTreeMenu(page, "Capítulo 1", "Editar")
    const dialog = dialogNamed(page, "Editar elemento")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Portada", { exact: true })).toHaveCount(0)

    await dialog.getByLabel("Nombre").fill("   ")
    await expect(dialog.getByRole("button", { name: "Guardar" })).toBeDisabled()
  })

  test("Eliminar elemento: cancelar conserva el capítulo y confirmar lo borra", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await openTreeMenu(page, "Capítulo 1", "Eliminar")
    const alert = alertNamed(page, "Eliminar elemento")
    await expect(alert).toContainText("Capítulo 1")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /^\/chapters\//)).toHaveLength(0)
    await expect(page.getByRole("button", { name: "Capítulo 1", exact: true })).toBeVisible()

    await openTreeMenu(page, "Capítulo 1", "Eliminar")
    await alert.getByRole("button", { name: "Eliminar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /^\/chapters\/e2e-chapter$/)).toHaveLength(1)
    await expect(page.getByRole("button", { name: "Capítulo 1", exact: true })).toHaveCount(0)
  })
})

/**
 * Al abrir un diálogo encima del panel de historial (o al elegir una versión)
 * el panel se cierra con una animación. Este helper reabre el panel si hace
 * falta y reintenta el click hasta que el botón esté estable.
 */
async function clickHistoryControl(page: Page, name: string) {
  await expect(async () => {
    const control = page.getByRole("button", { name })
    if (!(await control.isVisible())) {
      await page.getByRole("button", { name: "Historial", exact: true }).click({ timeout: 1500 })
    }
    await control.click({ timeout: 1500 })
  }).toPass({ timeout: 10_000 })
}

test.describe("Portada del libro", () => {
  test("Quitar portada: pide confirmación, cancelar la conserva y confirmar la borra", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    backend.setCover(true)
    await openEditor(page)

    await openTreeMenu(page, "Libro I", "Editar")
    const dialog = dialogNamed(page, "Editar libro")
    await expect(dialog.getByRole("button", { name: "Cambiar portada" })).toBeVisible()

    await dialog.getByRole("button", { name: "Quitar portada" }).click()
    const alert = alertNamed(page, "¿Quitar la portada?")
    await expect(alert).toContainText("Libro I")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/cover$/)).toHaveLength(0)
    // Cancelar la confirmación no cierra el modal de edición que está debajo.
    await expect(dialog).toBeVisible()

    await dialog.getByRole("button", { name: "Quitar portada" }).click()
    await alert.getByRole("button", { name: "Quitar portada" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/books\/e2e-book\/cover$/)).toHaveLength(1)
    await expect(dialog.getByRole("button", { name: "Subir portada" })).toBeVisible()
  })
})

test.describe("Historial de versiones", () => {
  test("crear, renombrar, convertir en principal y eliminar una versión", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    await page.getByRole("button", { name: "Historial", exact: true }).click()
    await page.getByRole("button", { name: /Crear version/ }).click()

    // Crear
    const create = dialogNamed(page, "Crear versión")
    await create.getByLabel("Nombre").fill("Final alternativo")
    await create.getByLabel("Nombre").press("Enter")
    await expect(create).toBeHidden()
    const created = backend.callsTo("POST", /^\/scenes\/e2e-scene\/versions$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ label: "Final alternativo" })
    await expect(page.getByRole("button", { name: /^Final alternativo 10 palabras/ })).toBeVisible()

    // Renombrar
    await page.getByRole("button", { name: "Cambiar nombre de Final alternativo" }).click()
    const rename = dialogNamed(page, "Cambiar nombre")
    await expect(rename.getByLabel("Nombre")).toHaveValue("Final alternativo")
    await rename.getByLabel("Nombre").fill("Final redactado")
    await rename.getByRole("button", { name: "Guardar" }).click()
    await expect(rename).toBeHidden()
    const renamed = backend.callsTo("PATCH", /\/scenes\/e2e-scene\/versions\//)
    expect(renamed).toHaveLength(1)
    expect(renamed[0].body).toMatchObject({ label: "Final redactado" })
    await expect(page.getByRole("button", { name: /^Final redactado 10 palabras/ })).toBeVisible()

    // Convertir en principal: cancelar no hace nada, confirmar sí.
    await clickHistoryControl(page, "Convertir Final redactado en principal")
    const restore = alertNamed(page, "Convertir en principal")
    await restore.getByRole("button", { name: "Cancelar" }).click()
    await expect(restore).toBeHidden()
    expect(backend.callsTo("POST", /\/restore$/)).toHaveLength(0)
    await clickHistoryControl(page, "Convertir Final redactado en principal")
    await restore.getByRole("button", { name: "Convertir en principal" }).click()
    await expect(restore).toBeHidden()
    expect(backend.callsTo("POST", /\/restore$/)).toHaveLength(1)

    // Eliminar
    await clickHistoryControl(page, "Eliminar Final redactado")
    const remove = alertNamed(page, "Eliminar versión")
    await expect(remove).toContainText("Final redactado")
    await remove.getByRole("button", { name: "Eliminar" }).click()
    await expect(remove).toBeHidden()
    expect(backend.callsTo("DELETE", /\/scenes\/e2e-scene\/versions\//)).toHaveLength(1)
    await expect(page.getByRole("button", { name: /^Final redactado 10 palabras/ })).toHaveCount(0)
  })
})

test.describe("Exportar y compartir", () => {
  test("Exportar: pide la exportación del libro elegido y muestra el progreso", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: "Exportar obra" }).click()
    const dialog = dialogNamed(page, "Exportar un libro")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Portada (opcional)", { exact: true })).toBeVisible()
    await expect(dialog.getByText("Libro electrónico", { exact: true })).toBeVisible()

    await dialog.getByRole("button", { name: "Exportar", exact: true }).click()
    await expect(dialog.getByText("40%", { exact: true })).toBeVisible()
    const exports = backend.callsTo("POST", /\/books\/e2e-book\/exports$/)
    expect(exports).toHaveLength(1)
    expect(exports[0].body).toMatchObject({ format: "EPUB" })
  })

  test("Exportar: al cambiar de libro el selector conserva el foco y la portada corresponde al libro elegido", async ({
    page,
  }) => {
    await installModalBackend(page, { secondBook: true })
    await openEditor(page)

    await page.getByRole("button", { name: "Exportar obra" }).click()
    const dialog = dialogNamed(page, "Exportar un libro")
    const trigger = dialog.locator("#export-book")
    await expect(trigger).toContainText("Libro I")
    const handle = await trigger.elementHandle()

    await trigger.click()
    await page.getByRole("option", { name: "Libro II" }).click()

    await expect(trigger).toContainText("Libro II")
    // El selector es el mismo elemento (no se remontó) y mantiene el foco.
    expect(await handle!.evaluate((node) => node.isConnected)).toBe(true)
    await expect(trigger).toBeFocused()
  })

  test("Exportar: si el servicio falla se explica el error y se puede cerrar", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    backend.failNext("POST", /exports$/, 500, "Servicio caído")
    await openEditor(page)

    await page.getByRole("button", { name: "Exportar obra" }).click()
    const dialog = dialogNamed(page, "Exportar un libro")
    await dialog.getByRole("button", { name: "Exportar", exact: true }).click()

    await expect(dialog.getByText("No se pudo exportar", { exact: true })).toBeVisible()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
  })

  test("Compartir: valida el email, crea la invitación con el permiso elegido y permite revocarla", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: "Compartir obra" }).click()
    const dialog = dialogNamed(page, "Compartir un libro")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("Sin invitaciones", { exact: true })).toBeVisible()

    await dialog.getByRole("button", { name: "Crear enlace seguro" }).click()
    await expect(dialog.getByText("Ingresá una dirección de email válida.", { exact: true })).toBeVisible()
    expect(backend.callsTo("POST", /\/shares$/)).toHaveLength(0)

    await dialog.getByLabel("Email de la persona").fill("lectora@ejemplo.com")
    await dialog.getByLabel("Permiso").click()
    await page.getByRole("option", { name: "Lectura y comentarios" }).click()
    await dialog.getByRole("button", { name: "Crear enlace seguro" }).click()

    await expect(dialog.getByText("Enlace creado", { exact: true })).toBeVisible()
    await expect(dialog.getByLabel("Enlace compartido")).toHaveValue(
      /\/shared\/invitacion-1\?token=token-1$/,
    )
    const created = backend.callsTo("POST", /\/books\/e2e-book\/shares$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      email: "lectora@ejemplo.com",
      permission: "COMMENT",
    })

    await dialog
      .getByRole("button", { name: "Revocar invitación de lectora@ejemplo.com" })
      .click()
    expect(backend.callsTo("DELETE", /\/shares\//)).toHaveLength(1)
    await expect(dialog.getByText("Sin invitaciones", { exact: true })).toBeVisible()

    await dialog.getByRole("button", { name: "Cerrar" }).first().click()
    await expect(dialog).toBeHidden()
  })
})

test.describe("Diálogos de texto del editor", () => {
  test("Buscar y reemplazar: cancelar la confirmación no modifica el manuscrito", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    await openEditorMenu(page, "Editar", "Buscar y reemplazar")
    await page.getByLabel("Buscar", { exact: true }).fill("noche")
    await page.getByLabel("Reemplazar por").fill("madrugada")
    await page.getByRole("button", { name: "Reemplazar todo" }).click()

    const alert = alertNamed(page, "Confirmar reemplazo")
    await expect(alert).toContainText("2 ocurrencias")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()

    expect(backend.base.sceneWrites).toHaveLength(0)
    await expect(page.locator(".ProseMirror")).toContainText("La noche cubría la ciudad.")
  })

  test("Numeración de listas: «Comenzar desde…» aplica el número inicial y cancelar lo descarta", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    await page.getByRole("button", { name: "Mostrar herramientas" }).click()
    await page.locator(".ProseMirror p").first().click()
    await page.getByRole("button", { name: "Lista numerada" }).click()
    const list = page.locator(".ProseMirror ol").first()
    await expect(list).toBeVisible()

    const openDialog = async () => {
      await page.getByRole("button", { name: "Opciones de numeración" }).click()
      await page.getByRole("menuitem", { name: "Comenzar desde…" }).click()
      return dialogNamed(page, "Comenzar numeración desde")
    }

    let dialog = await openDialog()
    await dialog.getByLabel("Número inicial").fill("5")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    await expect(list).not.toHaveAttribute("start", "5")

    dialog = await openDialog()
    await dialog.getByLabel("Número inicial").fill("5")
    await dialog.getByLabel("Número inicial").press("Enter")
    await expect(dialog).toBeHidden()
    await expect(list).toHaveAttribute("start", "5")
  })

  test("Opciones de párrafo: aplicar, cancelar y restablecer la alineación", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    const paragraph = page.locator(".ProseMirror p").first()
    const openDialog = async () => {
      await paragraph.click()
      await openEditorMenu(page, "Formato", "Opciones de párrafo…")
      return dialogNamed(page, "Opciones de párrafo")
    }

    // Aplicar
    let dialog = await openDialog()
    await expect(dialog.getByRole("button", { name: "Centrada" })).toBeVisible()
    await dialog.getByRole("button", { name: "Centrada" }).click()
    await dialog.getByRole("button", { name: "Aceptar" }).click()
    await expect(dialog).toBeHidden()
    await expect(paragraph).toHaveCSS("text-align", "center")

    // Cancelar descarta lo elegido
    dialog = await openDialog()
    await dialog.getByRole("button", { name: "Derecha" }).click()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    await expect(paragraph).toHaveCSS("text-align", "center")

    // Restablecer vuelve a los valores por defecto
    dialog = await openDialog()
    await dialog.getByRole("button", { name: "Restablecer" }).click()
    await dialog.getByRole("button", { name: "Aceptar" }).click()
    await expect(dialog).toBeHidden()
    await expect(paragraph).toHaveCSS("text-align", /^(left|start)$/)
  })

  test("Configuración del corrector: guarda el idioma y cancelar lo descarta", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    await openEditorMenu(page, "Revisar", "Configuración del corrector")
    const dialog = dialogNamed(page, "Configuración del corrector")
    await dialog.locator("#spellcheck-settings-language").click()
    await page.getByRole("menuitemradio", { name: "English (United States)" }).click()
    await dialog.getByRole("button", { name: "Guardar" }).click()
    await expect(dialog).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem("plumia:spellcheck-language"))).toBe("en-US")
    await expect(page.locator(".ProseMirror")).toHaveAttribute("lang", "en-US")

    await openEditorMenu(page, "Revisar", "Configuración del corrector")
    await dialog.locator("#spellcheck-settings-language").click()
    await page.getByRole("menuitemradio", { name: "Español (Argentina)" }).click()
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem("plumia:spellcheck-language"))).toBe("en-US")
  })

  test("Guardar estilo reutilizable: envía el nombre elegido y cancelar no guarda nada", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    const openDialog = async () => {
      await page.locator(".ProseMirror").click()
      await page.keyboard.press("ControlOrMeta+a")
      await page
        .getByRole("menubar", { name: "Menús del editor" })
        .getByRole("menuitem", { name: "Formato" })
        .click()
      await page.getByRole("menuitem", { name: "Estilos de texto" }).click()
      await page.getByRole("menuitem", { name: /Guardar selección como estilo/ }).click()
      return dialogNamed(page, "Guardar estilo reutilizable")
    }

    let dialog = await openDialog()
    await dialog.getByLabel("Nombre del estilo").fill("Descartado")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    expect(backend.callsTo("POST", /\/editor-styles$/)).toHaveLength(0)

    dialog = await openDialog()
    await dialog.getByLabel("Nombre del estilo").fill("Voz del narrador")
    await dialog.getByRole("button", { name: "Guardar estilo" }).click()
    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/projects\/e2e-project\/editor-styles$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ name: "Voz del narrador" })
  })
})

test.describe("Chat con IA", () => {
  test("Carga inicial: los paneles laterales están desde el inicio mientras llega el proyecto", async ({
    page,
  }) => {
    await installModalBackend(page)
    await page.route(/\/projects\/e2e-project(\?.*)?$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.fallback()
    })
    await page.goto("/projects/e2e-project/editor")

    await expect(
      page.getByRole("status", { name: "Cargando estructura del proyecto" }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Colapsar panel derecho" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Chat IA/ })).toBeVisible()

    await expect(
      page.getByRole("button", { name: "El umbral 10 palabras" }),
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole("status", { name: "Cargando estructura del proyecto" }),
    ).toHaveCount(0)
  })

  test("Panel derecho: cambiar de pestaña por primera vez no oculta el panel mientras carga", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)

    // Los chunks de las pestañas se piden recién al abrirlas; se demoran para ver el estado de carga.
    let releaseChunks!: () => void
    const chunksReleased = new Promise<void>((resolve) => {
      releaseChunks = resolve
    })
    await page.route(/\/_next\/static\/.*\.js/, async (route) => {
      await chunksReleased
      await route.continue()
    })

    const collapse = page.getByRole("button", { name: "Colapsar panel derecho" })
    await expect(collapse).toBeVisible()
    await page.getByRole("button", { name: /Chat IA/ }).click()

    // Mientras llega el chunk, las pestañas siguen a la vista.
    for (let i = 0; i < 10; i++) {
      await expect(collapse).toBeVisible({ timeout: 100 })
      await page.waitForTimeout(100)
    }
    releaseChunks()
    await expect(collapse).toBeVisible()
    await expect(page.getByText("Mensaje número 30", { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test("Fuentes del chat: «Ver todas» abre el diálogo con citadas y revisadas, y se cierra", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)
    await page.getByRole("button", { name: /Chat IA/ }).click()

    const viewAll = page.getByRole("button", { name: /\+2 fuentes revisadas · Ver todas/ })
    await viewAll.scrollIntoViewIfNeeded()
    await viewAll.click()

    const dialog = dialogNamed(page, "Fuentes revisadas")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: /\[1\] Fuente 1/ })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /\[2\] Fuente 2/ })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Revisada Fuente 3/ })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Revisada Fuente 5/ })).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test("Conversación larga: se puede scrollear hasta el primer mensaje", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: /Chat IA/ }).click()
    const first = page.getByText("Mensaje número 1", { exact: true })
    const last = page.getByText("Mensaje número 30", { exact: true })
    await expect(last).toBeInViewport()
    await expect(first).not.toBeInViewport()

    await first.scrollIntoViewIfNeeded()
    await expect(first).toBeInViewport()
  })

  test("Historial: se ubica bajo el reloj y se cierra con clic afuera, Escape o el reloj", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: /Chat IA/ }).click()
    const toggle = page.getByRole("button", { name: "Abrir historial de conversaciones" })
    const menu = page.getByRole("dialog", { name: "Historial de conversaciones" })

    await toggle.click()
    await expect(menu).toBeVisible()
    const toggleBox = (await toggle.boundingBox())!
    const menuBox = (await menu.boundingBox())!
    expect(menuBox.y).toBeGreaterThanOrEqual(toggleBox.y + toggleBox.height)
    expect(menuBox.x + menuBox.width).toBeGreaterThanOrEqual(toggleBox.x + toggleBox.width - 1)

    await page.getByPlaceholder("Preguntá sobre tu obra o PlumIA...").click()
    await expect(menu).toBeHidden()

    await toggle.click()
    await expect(menu).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()

    await toggle.click()
    await expect(menu).toBeVisible()
    await toggle.click()
    await expect(menu).toBeHidden()
  })

  test("Eliminar conversación: cancelar la conserva y confirmar la borra", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)

    await page.getByRole("button", { name: /Chat IA/ }).click()
    await page.getByRole("button", { name: "Abrir historial de conversaciones" }).click()
    await expect(
      page.getByRole("button", { name: "Eliminar Ideas para el final" }),
    ).toBeVisible()

    await page.getByRole("button", { name: "Eliminar Ideas para el final" }).click()
    const alert = alertNamed(page, "Eliminar conversación")
    await expect(alert).toContainText("Ideas para el final")
    await alert.getByRole("button", { name: "Cancelar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/chat\/threads\//)).toHaveLength(0)

    await page.getByRole("button", { name: "Eliminar Ideas para el final" }).click()
    await alert.getByRole("button", { name: "Eliminar" }).click()
    await expect(alert).toBeHidden()
    expect(backend.callsTo("DELETE", /\/chat\/threads\/thread-1$/)).toHaveLength(1)
    await expect(
      page.getByRole("button", { name: "Eliminar Ideas para el final" }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Eliminar Duda sobre Maren" }),
    ).toBeVisible()
  })
})

test.describe("Wiki del editor y corrector ortográfico", () => {
  test("Agregar estado temporal: valida el valor y guarda el cambio de la entidad", async ({
    page,
  }) => {
    const backend = await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    await page.getByRole("button", { name: "Estado", exact: true }).first().click()
    const dialog = dialogNamed(page, /Agregar estado temporal/)
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Tomás Reyes")

    await dialog.getByRole("button", { name: "Guardar estado" }).click()
    await expect(dialog.getByText("Completá el atributo, valor y escena de inicio.", { exact: true })).toBeVisible()
    expect(backend.callsTo("POST", /\/states$/)).toHaveLength(0)

    await dialog.getByLabel("Nuevo valor").fill("Puerto de Bruma")
    await dialog.getByLabel("Válido desde").selectOption("e2e-scene")
    await dialog.getByRole("button", { name: "Guardar estado" }).click()

    await expect(dialog).toBeHidden()
    const created = backend.callsTo("POST", /\/knowledge\/entities\/tomas-reyes\/states$/)
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({
      attributeKey: "location",
      toValue: "Puerto de Bruma",
      validFromSceneId: "e2e-scene",
    })
  })

  test("Sugerencias ortográficas: la corrección manual reemplaza la palabra y «Cerrar» no cambia nada", async ({
    page,
  }) => {
    await installModalBackend(page)
    await openEditor(page)
    await openScene(page)

    const paragraph = page.locator(".ProseMirror p").first()
    await paragraph.click()
    await page.keyboard.press("End")
    await page.keyboard.type(" rumbbo")

    const rightClickWord = async (word: string) => {
      const point = await page.evaluate((target) => {
        const walker = document.createTreeWalker(
          document.querySelector(".ProseMirror")!,
          NodeFilter.SHOW_TEXT,
        )
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const index = (node.textContent ?? "").indexOf(target)
          if (index < 0) continue
          const range = document.createRange()
          range.setStart(node, index)
          range.setEnd(node, index + target.length)
          const rect = range.getBoundingClientRect()
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        }
        return null
      }, word)
      expect(point).not.toBeNull()
      await page.mouse.click(point!.x, point!.y, { button: "right" })
    }

    // «Cerrar» deja el texto como estaba.
    await expect(async () => {
      await rightClickWord("rumbbo")
      await expect(dialogNamed(page, "Sugerencias ortográficas")).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 10_000 })
    const dialog = dialogNamed(page, "Sugerencias ortográficas")
    await expect(dialog).toContainText("rumbbo")
    await dialog.locator('[data-slot="dialog-footer"]').getByRole("button", { name: "Cerrar" }).click()
    await expect(dialog).toBeHidden()
    await expect(paragraph).toContainText("rumbbo")

    // La corrección manual reemplaza la palabra marcada.
    await rightClickWord("rumbbo")
    await dialog.getByLabel("Corrección manual").fill("rumbo")
    await dialog.getByRole("button", { name: "Reemplazar" }).click()
    await expect(dialog).toBeHidden()
    await expect(paragraph).toContainText("rumbo")
    await expect(paragraph).not.toContainText("rumbbo")
  })
})
