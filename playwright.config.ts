import { defineConfig, devices } from "@playwright/test"

const baseURL = "http://127.0.0.1:3101"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 3,
  reporter: "list",
  timeout: 20_000,
  expect: { timeout: 5_000 },
  outputDir: "./test-results/artifacts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    storageState: "./test-results/.auth/user.json",
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: "**/auth.setup.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "chromium",
      testMatch: "**/*.spec.ts",
      dependencies: ["auth-setup"],
    },
  ],
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3101",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3000",
      API_URL: "http://127.0.0.1:3000",
    },
  },
})
