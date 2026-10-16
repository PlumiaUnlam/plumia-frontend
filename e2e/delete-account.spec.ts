import { expect, test, type Page } from "@playwright/test"

import { installMockBackend } from "./support/mock-backend"

const confirmEmailInput = (page: Page) =>
  page.getByLabel("Escribí tu email para confirmar")

// El diálogo de perfil queda abierto debajo de la confirmación, así que el DOM
// tiene dos botones "Cancelar". Hay que apuntar siempre dentro del alertdialog.
const deleteDialogCancel = (page: Page) =>
  page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" })

// La eliminación vive dentro del diálogo de perfil, no en el menú desplegado:
// no debe quedar pegada a "Cerrar sesión", que también es destructiva.
async function openDeleteDialog(page: Page) {
  await page.getByRole("button", { name: "Abrir menú de usuario" }).click()
  await page.getByRole("menuitem", { name: "Configurar perfil" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Eliminar cuenta" }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
}

test.describe("Ley 25.326, art. 16: eliminación de la cuenta", () => {
  test("la eliminación vive en el perfil, no en el menú junto a cerrar sesión", async ({
    page,
  }) => {
    const backend = await installMockBackend(page)
    await page.goto("/dashboard")

    await page.getByRole("button", { name: "Abrir menú de usuario" }).click()

    // Nada destructivo pegado a "Cerrar sesión" en el menú desplegado, y
    // "Cerrar sesión" es el último ítem del menú.
    await expect(
      page.getByRole("menuitem", { name: "Eliminar cuenta" }),
    ).toHaveCount(0)
    await expect(page.getByRole("menuitem").last()).toHaveAccessibleName(
      "Cerrar sesión",
    )
    await expect(page.getByRole("alertdialog")).toBeHidden()

    // En cambio, sí está dentro del diálogo de perfil.
    await page.getByRole("menuitem", { name: "Configurar perfil" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Eliminar cuenta" }),
    ).toBeVisible()

    // El botón no debe disparar el guardado del perfil: sigue sin haber baja.
    expect(backend.accountDeletes).toBe(0)
  })

  test("abre el diálogo de confirmación desde el perfil", async ({ page }) => {
    await installMockBackend(page)
    await page.goto("/dashboard")

    await openDeleteDialog(page)

    await expect(
      page.getByText("¿Eliminar tu cuenta?", { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(
        "Se van a borrar tus proyectos, capítulos, escenas, imágenes y tu acceso a PlumIA. Esta acción no se puede deshacer.",
      ),
    ).toBeVisible()
    await expect(confirmEmailInput(page)).toBeVisible()
    await expect(deleteDialogCancel(page)).toBeVisible()
  })

  test("mantiene la acción deshabilitada hasta escribir el email exacto", async ({
    page,
  }) => {
    await installMockBackend(page)
    await page.goto("/dashboard")

    await openDeleteDialog(page)

    const action = page.getByRole("button", { name: "Eliminar mi cuenta" })

    await expect(action).toBeDisabled()

    await confirmEmailInput(page).fill("otra-cuenta@example.test")
    await expect(action).toBeDisabled()

    await confirmEmailInput(page).fill("writer@example.test ")
    await expect(action).toBeEnabled()
  })

  test("confirma, llama a DELETE /users/me y redirige a /login", async ({
    page,
  }) => {
    const backend = await installMockBackend(page)
    await page.goto("/dashboard")

    await openDeleteDialog(page)

    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/users/me") &&
        response.request().method() === "DELETE",
    )

    await confirmEmailInput(page).fill("writer@example.test")
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()

    expect((await deleteResponse).status()).toBe(204)
    await expect(page).toHaveURL(/\/login$/)
    expect(backend.accountDeletes).toBe(1)
  })

  // La supresión es irreversible, así que un corte de red no se resuelve
  // reintentando: no tenemos forma de saber si se completó. Pasó de verdad —
  // el backend se reinició 0,6 s después de que se confirmara la baja y el
  // browser nunca recibió la respuesta — y el mensaje genérico de red mandó
  // al usuario a reintentar un borrado que ya estaba hecho.
  test("si no llega la respuesta, no lo manda a reintentar un borrado irreversible", async ({
    page,
  }) => {
    await installMockBackend(page)

    // Simula la API caída: lo que pasa con el backend de NestJS sin levantar,
    // o cuando se reinicia a mitad del request.
    await page.route(/^(https?:\/\/[^/]+:3000\/.*)$/, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.abort("connectionrefused")
        return
      }
      await route.fallback()
    })

    await page.goto("/dashboard")
    await openDeleteDialog(page)

    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .toContain("__session=")

    await confirmEmailInput(page).fill("writer@example.test")
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()

    await expect(
      page.getByText(
        "No pudimos confirmar si tu cuenta se eliminó. Volvé a iniciar sesión para comprobarlo.",
      ),
    ).toBeVisible()
    await expect(page.getByText("Failed to fetch")).toBeHidden()
    await expect(page.getByText("Revisá tu conexión a internet")).toBeHidden()

    // El diálogo queda abierto para que alcance a leer la copia, pero la
    // sesión se cierra: si la cuenta quedó borrada, seguir adentro es seguir
    // operando una cuenta que ya no existe.
    await expect(page.getByRole("alertdialog")).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .not.toContain("__session=")
  })

  test("traduce el 401 de sesión expirada en vez de mostrar el mensaje del backend", async ({
    page,
  }) => {
    await installMockBackend(page)

    // Así responde el guard de Firebase cuando el token ya venció.
    await page.route(/^(https?:\/\/[^/]+:3000\/.*)$/, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 401,
            message: "Invalid or expired token",
            error: "Unauthorized",
          }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto("/dashboard")
    await openDeleteDialog(page)

    await confirmEmailInput(page).fill("writer@example.test")
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()

    await expect(
      page.getByText(
        "Tu sesión expiró. Volvé a iniciar sesión para eliminar la cuenta.",
      ),
    ).toBeVisible()
    await expect(page.getByText("Invalid or expired token")).toBeHidden()
    await expect(page.getByRole("alertdialog")).toBeVisible()
  })

  test("un 502 muestra la copia aprobada y cierra la sesión igual", async ({
    page,
  }) => {
    await installMockBackend(page)

    // Así responde DELETE /users/me cuando nuestra base ya se suprimió pero la
    // identidad en Firebase no se pudo borrar.
    await page.route(/^(https?:\/\/[^/]+:3000\/.*)$/, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 502,
            message: "Tu cuenta fue eliminada. Tu sesión se cerró.",
            error: "Bad Gateway",
          }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto("/dashboard")
    await openDeleteDialog(page)

    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .toContain("__session=")

    await confirmEmailInput(page).fill("writer@example.test")
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()

    // La copia se ve entera: no es un error de red ni un 500 genérico.
    await expect(
      page.getByText("Tu cuenta fue eliminada. Tu sesión se cerró."),
    ).toBeVisible()

    // Y la sesión se cierra aunque el request haya "fallado". De nuestro lado
    // ya no queda cuenta, así que dejarlo adentro sería seguir operando dentro
    // de un sistema que lo acaba de borrar.
    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .not.toContain("__session=")
  })

  // DELETE /users/me pasa por el mismo validateFirebaseUser que el login, así
  // que una fila que ya es tombstone responde 403 con el mensaje en inglés del
  // backend. Sin esta rama el diálogo le mostraba el texto crudo al usuario.
  test("una cuenta que ya es tombstone no le muestra 'Account deleted' en crudo", async ({
    page,
  }) => {
    await installMockBackend(page)

    await page.route(/^(https?:\/\/[^/]+:3000\/.*)$/, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 403,
            message: "Account deleted",
            error: "Forbidden",
          }),
        })
        return
      }
      await route.fallback()
    })

    await page.goto("/dashboard")
    await openDeleteDialog(page)

    await confirmEmailInput(page).fill("writer@example.test")
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()

    await expect(page.getByText("Tu cuenta ya fue eliminada.")).toBeVisible()
    await expect(page.getByText("Account deleted")).toBeHidden()

    // Ya no hay cuenta atrás, así que la sesión se cierra igual que en el 502.
    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .not.toContain("__session=")
  })

  test("cancelar o Escape descartan solo la confirmación, sin llamar al backend", async ({
    page,
  }) => {
    const backend = await installMockBackend(page)
    await page.goto("/dashboard")

    await openDeleteDialog(page)

    await deleteDialogCancel(page).click()

    // Al cancelar se vuelve al perfil, que quedó abierto debajo, y no se
    // pierden los cambios sin guardar.
    await expect(page.getByRole("alertdialog")).toBeHidden()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard$/)
    expect(backend.accountDeletes).toBe(0)

    // Escape tiene que descartar solo la capa de arriba. Si cerrara el perfil
    // se perderían los cambios sin guardar.
    await page.getByRole("button", { name: "Eliminar cuenta" }).click()
    await expect(page.getByRole("alertdialog")).toBeVisible()

    await page.keyboard.press("Escape")

    await expect(page.getByRole("alertdialog")).toBeHidden()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard$/)
    expect(backend.accountDeletes).toBe(0)
  })
})
