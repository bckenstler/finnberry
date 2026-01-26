import { type Page } from "@playwright/test";

const TEST_PREFIX = "e2e-test";

// Test data structure
export interface TestData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: {
    sessionToken: string;
  };
  household: {
    id: string;
    name: string;
  };
  child: {
    id: string;
    name: string;
  };
}

// Shared test data reference (populated by seedTestData)
export let testData: TestData;

// Get base URL from environment or default
function getBaseUrl(): string {
  return process.env.BASE_URL || "http://localhost:3000";
}

// Call the test seed API
async function callTestApi(action: string, data: Record<string, unknown> = {}) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/test/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Test API error (${action}): ${error}`);
  }

  return response.json();
}

// Seed test data via API
export async function seedTestData(_page: Page): Promise<TestData> {
  const timestamp = Date.now();
  const email = `${TEST_PREFIX}-${timestamp}@example.com`;
  const userName = `${TEST_PREFIX} User ${timestamp}`;
  const householdName = `${TEST_PREFIX} Household ${timestamp}`;
  const childName = `${TEST_PREFIX} Baby ${timestamp}`;

  // Create test user
  const { user } = await callTestApi("createTestUser", {
    email,
    name: userName,
  });

  // Create session for the user
  const { sessionToken } = await callTestApi("createTestSession", {
    userId: user.id,
  });

  // Create test household with user as owner
  const { household } = await callTestApi("createTestHousehold", {
    name: householdName,
    userId: user.id,
  });

  // Create test child in household
  const { child } = await callTestApi("createTestChild", {
    name: childName,
    birthDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
    householdId: household.id,
    gender: "OTHER",
  });

  // Store test data for use in tests
  testData = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    session: {
      sessionToken,
    },
    household: {
      id: household.id,
      name: household.name,
    },
    child: {
      id: child.id,
      name: child.name,
    },
  };

  return testData;
}

// Cleanup test data after tests
export async function cleanupTestData(_page: Page): Promise<void> {
  try {
    await callTestApi("cleanup", { prefix: TEST_PREFIX });
  } catch (error) {
    // Ignore cleanup errors - data may already be cleaned up
    console.warn("Cleanup warning:", error);
  }
}

// Helper to create additional test household
export async function createTestHousehold(
  _page: Page,
  name: string,
  userId: string
) {
  const { household } = await callTestApi("createTestHousehold", {
    name: `${TEST_PREFIX} ${name}`,
    userId,
  });
  return household;
}

// Helper to create additional test child
export async function createTestChild(
  _page: Page,
  householdId: string,
  name: string
) {
  const { child } = await callTestApi("createTestChild", {
    name: `${TEST_PREFIX} ${name}`,
    birthDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    householdId,
  });
  return child;
}
