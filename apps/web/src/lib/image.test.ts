import { describe, it, expect } from "vitest";
import { chatImageUrl, fitWithin, prepareChatImage } from "./image";

describe("fitWithin", () => {
  it("leaves an image that already fits unchanged", () => {
    expect(fitWithin(800, 600, 1568)).toEqual({ width: 800, height: 600 });
  });

  it("scales a landscape image down to the long edge", () => {
    // 4032 x 3024 is a 4:3 phone photo; 1568 / 4032 * 3024 = 1176
    expect(fitWithin(4032, 3024, 1568)).toEqual({ width: 1568, height: 1176 });
  });

  it("scales a portrait image down to the long edge", () => {
    expect(fitWithin(3024, 4032, 1568)).toEqual({ width: 1176, height: 1568 });
  });

  it("never returns a zero dimension for a very thin image", () => {
    expect(fitWithin(10000, 1, 1568)).toEqual({ width: 1568, height: 1 });
  });
});

describe("prepareChatImage", () => {
  it("rejects a file that is not an image", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    await expect(prepareChatImage(file)).rejects.toThrow("notes.txt is not an image.");
  });
});

describe("chatImageUrl", () => {
  it("builds a data URL", () => {
    expect(chatImageUrl({ mediaType: "image/jpeg", data: "/9j/AA==" })).toBe(
      "data:image/jpeg;base64,/9j/AA=="
    );
  });
});
