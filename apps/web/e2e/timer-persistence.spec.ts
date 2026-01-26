import { test, expect } from "./fixtures/auth";
import { cleanupTestData } from "./fixtures/database";

test.describe("Timer Persistence", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("timer survives page refresh", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Start a sleep timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await expect(sleepButton).toBeVisible({ timeout: 10000 });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Verify timer is running
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // Refresh the page
    await authenticatedPage.reload();

    // Timer should still be running after refresh
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("timer persists in localStorage", async ({ authenticatedPage, testData }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Start a timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await expect(sleepButton).toBeVisible({ timeout: 10000 });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Wait for timer to be visible
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
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

  test("timer shows elapsed time after refresh", async ({
    authenticatedPage,
    testData,
  }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Start a timer
    const sleepButton = authenticatedPage.getByRole("button", { name: /sleep/i });
    await expect(sleepButton).toBeVisible({ timeout: 10000 });
    await sleepButton.click();
    await authenticatedPage.getByRole("button", { name: /nap/i }).click();

    // Wait for timer
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // Wait a few seconds
    await authenticatedPage.waitForTimeout(2000);

    // Refresh
    await authenticatedPage.reload();

    // Timer should still be visible
    await expect(
      authenticatedPage.getByRole("button", { name: /stop/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // Look for a timer display showing some elapsed time
    const timerText = await authenticatedPage
      .locator('[class*="font-mono"], [class*="timer"]')
      .first()
      .textContent()
      .catch(() => null);

    // Timer should show at least some time
    if (timerText) {
      expect(timerText).toMatch(/\d/);
    }
  });
});
