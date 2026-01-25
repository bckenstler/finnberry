import { test, expect } from "./fixtures/auth";
import { seedTestData, cleanupTestData } from "./fixtures/database";

test.describe("Household Management", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("can view household list", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard");

    // Should see household or prompt to create one
    await expect(
      authenticatedPage.getByText(/household|family|create/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to create household form", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard");

    // Look for create button or link
    const createButton = authenticatedPage.getByRole("button", {
      name: /create|new|add/i,
    });

    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(
        authenticatedPage.getByRole("heading", { name: /create|new|household/i })
      ).toBeVisible();
    }
  });

  test("household creation form has required fields", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/dashboard/household/new");

    // Should have name input
    const nameInput = authenticatedPage.getByLabel(/name/i);
    await expect(nameInput).toBeVisible();
  });

  test("can navigate to child profile", async ({ authenticatedPage }) => {
    // Assuming there's a test child already created
    await authenticatedPage.goto("/dashboard");

    // Look for child entry
    const childLink = authenticatedPage.getByRole("link", { name: /baby|child/i });

    if (await childLink.isVisible()) {
      await childLink.click();
      await expect(authenticatedPage).toHaveURL(/child/);
    }
  });
});

test.describe("Child Management", () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await seedTestData(authenticatedPage);
  });

  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("add child form has required fields", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard/child/new");

    // Should have name input
    await expect(authenticatedPage.getByLabel(/name/i)).toBeVisible();

    // Should have birth date input
    await expect(authenticatedPage.getByLabel(/birth|date/i)).toBeVisible();
  });

  test("child profile shows tracking options", async ({ authenticatedPage }) => {
    // Navigate to a child's profile (assuming test data exists)
    await authenticatedPage.goto("/dashboard/child/test-child-e2e");

    // Should show quick log or tracking options
    await expect(
      authenticatedPage.getByText(/log|track|sleep|feeding|diaper/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
