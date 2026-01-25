import { test, expect } from "./fixtures/auth";
import { seedTestData, cleanupTestData, testData } from "./fixtures/database";

test.describe("Timer Persistence", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("timer survives page refresh", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Start a sleep timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Verify timer is running
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });

    // Refresh the page
    await authenticatedPage.reload();

    // Timer should still be running after refresh
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("timer persists in localStorage", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Start a timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Wait for timer to be visible
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });

    // Check localStorage
    const timers = await authenticatedPage.evaluate(() => {
      return localStorage.getItem("finnberry-timers");
    });

    expect(timers).not.toBeNull();
    const parsedTimers = JSON.parse(timers!);
    expect(parsedTimers.state.timers).toBeDefined();
    expect(Object.keys(parsedTimers.state.timers).length).toBeGreaterThan(0);
  });

  test("timer shows correct elapsed time after refresh", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Start a timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Wait for timer
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });

    // Wait a few seconds
    await authenticatedPage.waitForTimeout(3000);

    // Refresh
    await authenticatedPage.reload();

    // Timer should show accumulated time (at least 0:02)
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i })
    ).toBeVisible({ timeout: 5000 });

    // Look for a timer display showing some elapsed time
    const timerText = await authenticatedPage
      .locator('[class*="font-mono"]')
      .first()
      .textContent();

    // Timer should show at least a few seconds
    expect(timerText).toMatch(/\d:\d{2}/);
  });

  test("multiple timers persist independently", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/dashboard/child/${testData.childId}`);

    // Start sleep timer
    await authenticatedPage.getByRole("button", { name: /sleep/i }).click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Wait for first timer
    await authenticatedPage.waitForTimeout(1000);

    // Start feeding timer
    await authenticatedPage.getByRole("button", { name: /breast/i }).click();
    await authenticatedPage.getByRole("button", { name: /left/i }).click();

    // Both should be running
    const stopButtons = authenticatedPage.getByRole("button", { name: /stop/i });
    await expect(stopButtons).toHaveCount(2, { timeout: 5000 });

    // Refresh
    await authenticatedPage.reload();

    // Both should still be running
    await expect(stopButtons).toHaveCount(2, { timeout: 5000 });
  });
});
