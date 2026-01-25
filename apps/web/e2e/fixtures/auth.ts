import { test as base, type Page, type BrowserContext } from "@playwright/test";

// Test user credentials
export const testUser = {
  email: "test@example.com",
  name: "Test User",
};

// Extend the base test with authenticated fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
}>({
  authenticatedContext: async ({ browser }, use) => {
    // Create a new browser context with session storage
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: process.env.BASE_URL || "http://localhost:3000",
            localStorage: [
              {
                name: "finnberry-test-auth",
                value: JSON.stringify({
                  user: testUser,
                  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }),
              },
            ],
          },
        ],
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

// Helper to bypass login for testing
export async function mockAuthentication(page: Page) {
  // Set authentication cookies/localStorage that the app recognizes
  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: "test-session-token",
      domain: "localhost",
      path: "/",
      expires: Date.now() / 1000 + 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Also set localStorage for client-side checks
  await page.evaluate((user) => {
    localStorage.setItem(
      "finnberry-auth",
      JSON.stringify({
        user,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    );
  }, testUser);
}

// Helper to clear authentication
export async function clearAuthentication(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.removeItem("finnberry-auth");
  });
}
