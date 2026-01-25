import { type Page } from "@playwright/test";

// Test data IDs (would be created in a real test database)
export const testData = {
  householdId: "test-household-e2e",
  userId: "test-user-e2e",
  childId: "test-child-e2e",
  childName: "Test Baby",
};

// Seed test data via API or direct database access
export async function seedTestData(page: Page) {
  // In a real implementation, this would:
  // 1. Call a test API endpoint to create test data
  // 2. Or directly insert into the database
  // 3. Or use Prisma client to seed

  // Navigate to the app first to access localStorage
  // (can't access localStorage on about:blank)
  const currentUrl = page.url();
  if (currentUrl === "about:blank") {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  }

  // For now, store test data references in localStorage
  await page.evaluate((data) => {
    localStorage.setItem("finnberry-test-data", JSON.stringify(data));
  }, testData);

  return testData;
}

// Cleanup test data after tests
export async function cleanupTestData(page: Page) {
  // In a real implementation, this would:
  // 1. Delete test records from the database
  // 2. Or call a test API endpoint for cleanup

  // Skip if page is already closed or on about:blank
  try {
    const currentUrl = page.url();
    if (currentUrl !== "about:blank") {
      await page.evaluate(() => {
        localStorage.removeItem("finnberry-test-data");
        localStorage.removeItem("finnberry-timers");
      });
    }
  } catch {
    // Page may already be closed, ignore
  }
}

// Helper to create test household
export async function createTestHousehold(_page: Page, name = "Test Household") {
  // Would call API to create household
  return {
    id: `household-${Date.now()}`,
    name,
  };
}

// Helper to create test child
export async function createTestChild(
  _page: Page,
  householdId: string,
  name = "Test Baby"
) {
  // Would call API to create child
  return {
    id: `child-${Date.now()}`,
    householdId,
    name,
    birthDate: new Date("2024-01-01"),
  };
}
