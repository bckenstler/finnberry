import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Only run auth tests by default (tests that don't require auth setup)
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: "chromium-authenticated",
      use: { ...devices["Desktop Chrome"] },
      // Tests requiring authentication infrastructure
      testMatch: /(?:household|tracking|timer-persistence|realtime-sync)\.spec\.ts/,
      // These tests require proper auth setup and test database
      // Run with: npx playwright test --project=chromium-authenticated
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
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
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: false,
      }
    : undefined,
});
