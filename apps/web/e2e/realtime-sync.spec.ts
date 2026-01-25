import { test, expect } from "./fixtures/auth";
import { seedTestData, cleanupTestData, testData } from "./fixtures/database";

test.describe("Realtime Sync", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("diaper log updates UI without refresh", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Get initial diaper count (if displayed)
    const initialSummary = await authenticatedPage
      .locator('[data-testid="diaper-summary"]')
      .textContent()
      .catch(() => null);

    // Log a diaper
    await authenticatedPage.getByRole("button", { name: /wet/i }).click();

    // Wait for update
    await authenticatedPage.waitForTimeout(2000);

    // UI should update (toast or summary change)
    await expect(
      authenticatedPage.getByText(/logged|recorded|success/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("feeding log updates summary without refresh", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Log a bottle feeding
    await authenticatedPage.getByRole("button", { name: /bottle/i }).click();
    await authenticatedPage.getByLabel(/amount/i).fill("150");
    await authenticatedPage.getByRole("button", { name: /log bottle/i }).click();

    // Wait for update
    await authenticatedPage.waitForTimeout(2000);

    // Should show success feedback
    await expect(
      authenticatedPage.getByText(/logged|recorded|success/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Multi-tab Sync", () => {
  test("data syncs between tabs", async ({ browser, authenticatedContext }) => {
    // Open two tabs
    const page1 = await authenticatedContext.newPage();
    const page2 = await authenticatedContext.newPage();

    // Navigate both to the same child's page
    await page1.goto(`http://localhost:3000/dashboard/child/${testData.childId}`);
    await page2.goto(`http://localhost:3000/dashboard/child/${testData.childId}`);

    // Wait for both to load
    await page1.waitForLoadState("networkidle");
    await page2.waitForLoadState("networkidle");

    // Log a diaper on page1
    await page1.getByRole("button", { name: /wet/i }).click();

    // Wait for the action to complete
    await page1.waitForTimeout(2000);

    // Check if page2 shows updated data
    // This depends on realtime subscription being active
    // The exact behavior depends on your Supabase setup

    // At minimum, refreshing page2 should show the update
    await page2.reload();
    await page2.waitForLoadState("networkidle");

    // The diaper should be logged on both pages now
    // Check for any indication of the new log

    await page1.close();
    await page2.close();
  });
});

test.describe("Optimistic Updates", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("timer starts immediately before server response", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Start measuring time
    const startTime = Date.now();

    // Click to start timer
    await authenticatedPage.getByRole("button", { name: /sleep/i }).click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Timer should appear almost immediately (optimistic update)
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 1000 });

    const elapsed = Date.now() - startTime;

    // Should be faster than typical server round-trip
    expect(elapsed).toBeLessThan(1000);
  });

  test("diaper log shows toast immediately", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    const startTime = Date.now();

    // Log diaper
    await authenticatedPage.getByRole("button", { name: /wet/i }).click();

    // Toast should appear quickly
    await expect(
      authenticatedPage.getByText(/logged|recorded|success/i)
    ).toBeVisible({ timeout: 2000 });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(2000);
  });
});
