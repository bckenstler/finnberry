import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Run tests serially to avoid race conditions in test data
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use 1 worker to avoid race conditions (tests share database)
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Run all E2E tests (auth tests + authenticated tests)
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      // Firefox/webkit only run auth tests (faster CI)
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /auth\.spec\.ts/,
    },
  ],
  webServer: process.env.CI
    ? {
        command: "pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
      }
    : undefined,
});
