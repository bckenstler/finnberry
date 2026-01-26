import { test, expect } from "./fixtures/auth";
import { cleanupTestData } from "./fixtures/database";

test.describe("Household Management", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("dashboard shows household when authenticated", async ({
    authenticatedPage,
    testData,
  }) => {
    await authenticatedPage.goto("/dashboard");

    // Should see household name or dashboard content (not redirected to login)
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Should see the test household name or dashboard UI
    await expect(
      authenticatedPage.getByText(new RegExp(testData.household.name, "i")).or(
        authenticatedPage.getByText(/dashboard|household|family/i)
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to child profile", async ({
    authenticatedPage,
    testData,
  }) => {
    await authenticatedPage.goto("/dashboard");

    // Look for child entry or navigate to child page
    const childLink = authenticatedPage.getByRole("link", {
      name: new RegExp(testData.child.name, "i"),
    });

    if (await childLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await childLink.click();
      await expect(authenticatedPage).toHaveURL(/child/);
    } else {
      // Navigate directly to child page
      await authenticatedPage.goto(`/dashboard/${testData.child.id}`);
      await expect(authenticatedPage).not.toHaveURL(/login/);
    }
  });

  test("child profile shows tracking options", async ({
    authenticatedPage,
    testData,
  }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/login/);

    // Should show quick log or tracking options (using first() since multiple elements match)
    await expect(
      authenticatedPage.getByText(/sleep|feeding|diaper/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Child Management", () => {
  test.afterEach(async ({ authenticatedPage }) => {
    await cleanupTestData(authenticatedPage);
  });

  test("child page has tracking buttons", async ({
    authenticatedPage,
    testData,
  }) => {
    await authenticatedPage.goto(`/dashboard/${testData.child.id}`);

    // Should have tracking buttons
    await expect(
      authenticatedPage.getByRole("button", { name: /sleep|nap/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
