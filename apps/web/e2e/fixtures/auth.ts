import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { seedTestData, cleanupTestData, testData, type TestData } from "./database";

// Get base URL from environment or default
function getBaseUrl(): string {
  return process.env.BASE_URL || "http://localhost:3000";
}

// Extend the base test with authenticated fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
  testData: TestData;
}>({
  // Seed test data before each test
  testData: async ({}, use) => {
    // Create a temporary page just for seeding (we need to call the API)
    const data = await seedTestData(null as unknown as Page);
    await use(data);
    // Cleanup happens in afterEach of individual test files
  },

  authenticatedContext: async ({ browser, testData }, use) => {
    const baseUrl = getBaseUrl();
    const domain = new URL(baseUrl).hostname;

    // Create a new browser context with the real session cookie
    const context = await browser.newContext({
      storageState: {
        cookies: [
          {
            name: "authjs.session-token",
            value: testData.session.sessionToken,
            domain,
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      },
    });

    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
  },
});

export { expect } from "@playwright/test";

// Re-export testData for use in tests
export { testData };

// Helper to set up authentication on an existing page
export async function setupAuthentication(
  page: Page,
  sessionToken: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  const domain = new URL(baseUrl).hostname;

  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: sessionToken,
      domain,
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

// Helper to clear authentication
export async function clearAuthentication(page: Page): Promise<void> {
  await page.context().clearCookies();
}
