import { prisma } from "@finnberry/db";
import { chatModelSchema, type ChatModel } from "@finnberry/schemas";

// Every chat request spends the operator's Anthropic budget, so each user gets
// a daily allowance. Opus costs several times what the others do and is
// offered only where the operator lists it.
const DEFAULT_DAILY_MODEL_CALLS = 200;
const DEFAULT_DAILY_TOKENS = 2_000_000;
const DEFAULT_ALLOWED_MODELS: ChatModel[] = ["haiku", "sonnet"];

function positiveIntFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function getAllowedChatModels(
  configured: string | undefined = process.env.CHAT_ALLOWED_MODELS
): ChatModel[] {
  const models = (configured ?? "")
    .split(",")
    .map((name) => chatModelSchema.safeParse(name.trim().toLowerCase()))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  return models.length > 0 ? [...new Set(models)] : DEFAULT_ALLOWED_MODELS;
}

function utcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Counts one model call against the user's allowance for today and says
// whether the call may go ahead. The call is counted before it is made, so
// concurrent requests cannot all slip under the limit together.
export async function reserveModelCall(userId: string, now = new Date()): Promise<boolean> {
  const day = utcDay(now);
  const usage = await prisma.chatUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, modelCalls: 1 },
    update: { modelCalls: { increment: 1 } },
  });

  return (
    usage.modelCalls <= positiveIntFromEnv("CHAT_DAILY_REQUEST_LIMIT", DEFAULT_DAILY_MODEL_CALLS) &&
    usage.tokens < positiveIntFromEnv("CHAT_DAILY_TOKEN_LIMIT", DEFAULT_DAILY_TOKENS)
  );
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export async function recordTokens(
  userId: string,
  usage: TokenUsage,
  now = new Date()
): Promise<void> {
  const tokens =
    usage.input_tokens +
    usage.output_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);

  const day = utcDay(now);
  // An upsert, because a call reserved just before midnight UTC is recorded
  // against a day that has no row yet.
  await prisma.chatUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, tokens },
    update: { tokens: { increment: tokens } },
  });
}
