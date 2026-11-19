import { z } from "zod";

export const chatModelSchema = z.enum(["haiku", "sonnet", "opus"]);
export type ChatModel = z.infer<typeof chatModelSchema>;

export const CHAT_HISTORY_MAX_MESSAGES = 10;
export const CHAT_MESSAGE_MAX_CHARS = 50_000;

// Images across one request, current message and history together. The size
// caps are in base64 characters (4 characters carry 3 bytes), which keeps a
// whole request under common 4 to 5 MB proxy and platform body limits.
export const CHAT_IMAGES_MAX_COUNT = 4;
export const CHAT_IMAGE_MAX_BASE64_CHARS = 2_000_000;
export const CHAT_IMAGES_MAX_TOTAL_BASE64_CHARS = 4_000_000;

// The client re-encodes every attachment as JPEG, so that is the only format
// accepted. Base64 of the JPEG signature bytes FF D8 FF always starts "/9j/".
const JPEG_BASE64_PREFIX = "/9j/";
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const chatImageSchema = z.object({
  mediaType: z.literal("image/jpeg"),
  data: z
    .string()
    .max(CHAT_IMAGE_MAX_BASE64_CHARS, "Image is too large")
    .refine((data) => data.startsWith(JPEG_BASE64_PREFIX), "Image is not a JPEG")
    .refine((data) => BASE64_PATTERN.test(data), "Image is not valid base64"),
});
export type ChatImage = z.infer<typeof chatImageSchema>;

function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(CHAT_MESSAGE_MAX_CHARS),
  images: z.array(chatImageSchema).optional(),
});

export const chatRequestSchema = z
  .object({
    childId: z.string().min(1).max(64),
    message: z.string().max(CHAT_MESSAGE_MAX_CHARS),
    images: z.array(chatImageSchema).default([]),
    model: chatModelSchema.default("sonnet"),
    conversationHistory: z
      .array(historyMessageSchema)
      .max(CHAT_HISTORY_MAX_MESSAGES)
      .default([]),
    // Interpolated into the system prompt, so it must be a real IANA zone
    // name and nothing else.
    timezone: z.string().max(64).refine(isKnownTimeZone, "Unknown timezone").optional(),
  })
  .superRefine((request, ctx) => {
    const isEmpty = request.message.trim() === "" && request.images.length === 0;
    if (isEmpty) {
      ctx.addIssue({ code: "custom", message: "Send a message or an image" });
    }

    const images = [
      ...request.images,
      ...request.conversationHistory.flatMap((message) => message.images ?? []),
    ];
    if (images.length > CHAT_IMAGES_MAX_COUNT) {
      ctx.addIssue({
        code: "custom",
        message: `At most ${CHAT_IMAGES_MAX_COUNT} images per request`,
      });
    }

    const totalChars = images.reduce((total, image) => total + image.data.length, 0);
    if (totalChars > CHAT_IMAGES_MAX_TOTAL_BASE64_CHARS) {
      ctx.addIssue({ code: "custom", message: "Images are too large in total" });
    }
  });
export type ChatRequest = z.infer<typeof chatRequestSchema>;
