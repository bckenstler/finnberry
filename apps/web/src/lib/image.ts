import { CHAT_IMAGE_MAX_BASE64_CHARS, type ChatImage } from "@finnberry/schemas";

// The long edge Anthropic's vision guidance recommends staying within. A
// larger image costs upload size without being read any better.
export const CHAT_IMAGE_MAX_EDGE_PX = 1568;
const JPEG_QUALITY = 0.85;
// Refuse to decode something far beyond a phone photo.
const SOURCE_FILE_MAX_BYTES = 30 * 1024 * 1024;

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Downsizes a picked image and re-encodes it as JPEG for the chat API.
 * Re-encoding also drops the file's metadata, including any GPS location.
 *
 * @throws Error with a message fit to show the user when the file cannot be used.
 */
export async function prepareChatImage(file: File): Promise<ChatImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} is not an image.`);
  }
  if (file.size > SOURCE_FILE_MAX_BYTES) {
    throw new Error(`${file.name} is too large.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} could not be read as an image.`);
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, CHAT_IMAGE_MAX_EDGE_PX);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot resize images.");

    // JPEG has no transparency; without a fill, transparent areas turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (data.length > CHAT_IMAGE_MAX_BASE64_CHARS) {
      throw new Error(`${file.name} is too large to send, even after resizing.`);
    }

    return { mediaType: "image/jpeg", data };
  } finally {
    bitmap.close();
  }
}

export function chatImageUrl(image: ChatImage): string {
  return `data:${image.mediaType};base64,${image.data}`;
}
