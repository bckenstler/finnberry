import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ countTokens: vi.fn() }));

vi.mock("@finnberry/db", () => ({
  prisma: { verificationToken: { count: mocks.countTokens } },
}));

import { mayRequestMagicLink } from "./magic-link-throttle";

const NOW = new Date("2026-03-01T12:00:00.000Z");

// Answers the per-address count and the all-addresses count separately.
function linksAlreadySent({ toThisAddress = 0, toAnyAddress = 0 }) {
  mocks.countTokens.mockImplementation(({ where }: { where: { identifier?: string } }) =>
    Promise.resolve(where.identifier ? toThisAddress : toAnyAddress)
  );
}

describe("mayRequestMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a first request", async () => {
    linksAlreadySent({});
    await expect(mayRequestMagicLink("parent@example.com", NOW)).resolves.toBe(true);
  });

  it("allows up to three pending links to one address", async () => {
    linksAlreadySent({ toThisAddress: 2, toAnyAddress: 2 });
    await expect(mayRequestMagicLink("parent@example.com", NOW)).resolves.toBe(true);
  });

  it("refuses a fourth link to one address within ten minutes", async () => {
    linksAlreadySent({ toThisAddress: 3, toAnyAddress: 3 });
    await expect(mayRequestMagicLink("parent@example.com", NOW)).resolves.toBe(false);
  });

  it("refuses when the instance has sent a hundred links in the hour", async () => {
    linksAlreadySent({ toThisAddress: 0, toAnyAddress: 100 });
    await expect(mayRequestMagicLink("parent@example.com", NOW)).resolves.toBe(false);
  });

  it("counts an address regardless of how it was typed", async () => {
    linksAlreadySent({});
    await mayRequestMagicLink("  Parent@Example.COM ", NOW);

    expect(mocks.countTokens).toHaveBeenCalledWith({
      where: expect.objectContaining({ identifier: "parent@example.com" }),
    });
  });

  it("counts only links sent inside each window", async () => {
    linksAlreadySent({});
    await mayRequestMagicLink("parent@example.com", NOW);

    // A link expires 24 hours after it is sent. One sent ten minutes before
    // 12:00 expires at 11:50 the next day; one sent an hour before, at 11:00.
    expect(mocks.countTokens).toHaveBeenCalledWith({
      where: {
        identifier: "parent@example.com",
        expires: { gt: new Date("2026-03-02T11:50:00.000Z") },
      },
    });
    expect(mocks.countTokens).toHaveBeenCalledWith({
      where: { expires: { gt: new Date("2026-03-02T11:00:00.000Z") } },
    });
  });
});
