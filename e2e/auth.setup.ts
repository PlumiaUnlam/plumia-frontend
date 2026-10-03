import { mkdir } from "node:fs/promises"
import path from "node:path"

import { expect, test } from "@playwright/test"

const statePath = path.join(process.cwd(), "test-results/.auth/user.json")
test("HU-44 CA-138: iniciar sesión y llegar al panel de proyectos", async ({
  page,
}) => {
  await page.route(
    /^(https:\/\/identitytoolkit\.googleapis\.com\/.*|https?:\/\/[^/]+:3000\/.*)$/,
    async (route) => {
      const url = new URL(route.request().url())

      if (url.hostname === "identitytoolkit.googleapis.com") {
        if (url.pathname.endsWith("/accounts:signInWithPassword")) {
          const credentials = route.request().postDataJSON() as {
            email?: string
          }

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              kind: "identitytoolkit#VerifyPasswordResponse",
              localId: "e2e-writer",
              email: credentials.email ?? "writer@example.test",
              displayName: "Escritora de prueba",
              idToken: "e2e-firebase-id-token",
              registered: true,
              refreshToken: "e2e-refresh-token",
              expiresIn: "3600",
            }),
          })
          return
        }

        if (url.pathname.endsWith("/accounts:lookup")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              users: [
                {
                  localId: "e2e-writer",
                  email: "writer@example.test",
                  displayName: "Escritora de prueba",
                  emailVerified: true,
                },
              ],
            }),
          })
          return
        }
      }

      if (url.port === "3000" && url.pathname === "/auth/login") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "e2e-writer",
              name: "Escritora",
              lastname: "Prueba",
              email: "writer@example.test",
              displayName: "Escritora de prueba",
              avatarUrl: null,
              role: "AUTHOR",
              plan: "FREE",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          }),
        })
        return
      }

      if (
        url.port === "3000" &&
        url.pathname === "/projects" &&
        route.request().method() === "GET"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        })
        return
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Endpoint e2e no simulado" }),
      })
    },
  )

  await page.goto("/login")
  const submit = page.getByRole("button", { name: "Iniciar sesión" })
  await expect(async () => {
    await submit.click()
    await expect(page.getByText("El email es obligatorio.")).toBeVisible()
  }).toPass({ timeout: 10_000 })

  await page.getByLabel("Email").fill("writer@example.test")
  await page.getByLabel("Contraseña").fill("e2e-valid-password")
  await submit.click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(
    page.getByRole("heading", { name: "Mis proyectos" }),
  ).toBeVisible()

  await mkdir(path.dirname(statePath), { recursive: true })
  await page.context().storageState({ path: statePath, indexedDB: true })
})
