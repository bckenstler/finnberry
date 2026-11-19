import { describe, it, expect, vi, afterEach } from "vitest";
import type { PrismaClient } from "@finnberry/db";
import { handleToolCall } from "./index.js";

class PrismaClientKnownRequestError extends Error {
  name = "PrismaClientKnownRequestError";
}

const textOf = (result: Awaited<ReturnType<typeof handleToolCall>>) =>
  result.content[0]!.text;

describe("handleToolCall error text", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces a database error, which describes the query, with a plain message", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma = {
      sleepRecord: {
        update: vi.fn().mockRejectedValue(
          new PrismaClientKnownRequestError(
            "Invalid `prisma.sleepRecord.update()` invocation: no record for where { id, childId }"
          )
        ),
      },
    } as unknown as PrismaClient;

    const text = textOf(
      await handleToolCall("end-sleep", { childId: "child-1", sleepId: "sleep-1" }, prisma)
    );

    expect(text).toBe("Error: The record could not be found or saved.");
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("passes on a handler's own message about the request", async () => {
    const prisma = {} as unknown as PrismaClient;

    const text = textOf(await handleToolCall("end-sleep", { sleepId: "sleep-1" }, prisma));

    expect(text).toBe("Error: childId is required");
  });
});
