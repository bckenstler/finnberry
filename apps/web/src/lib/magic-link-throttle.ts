import { prisma } from "@finnberry/db";

// How long a magic link stays valid. The email provider is configured with
// this, and the throttle uses it to work out when a pending link was sent.
export const MAGIC_LINK_MAX_AGE_SECONDS = 24 * 60 * 60;

// One address cannot be mailed over and over, and the instance as a whole
// cannot be used to send mail in bulk through the operator's SMTP account.
const PER_ADDRESS = { limit: 3, windowMs: 10 * 60 * 1000 };
const ALL_ADDRESSES = { limit: 100, windowMs: 60 * 60 * 1000 };

// A link sent at time T expires at T + max age, so the links sent inside a
// window are the unused ones expiring later than (window start + max age).
// Used links are deleted and do not count, which only ever errs towards
// letting a real sign-in through.
function countLinksSentSince(windowStart: Date, identifier?: string): Promise<number> {
  const expiresAfter = new Date(windowStart.getTime() + MAGIC_LINK_MAX_AGE_SECONDS * 1000);
  return prisma.verificationToken.count({
    where: { expires: { gt: expiresAfter }, ...(identifier && { identifier }) },
  });
}

export async function mayRequestMagicLink(email: string, now = new Date()): Promise<boolean> {
  const identifier = email.trim().toLowerCase();
  const [toThisAddress, toAnyAddress] = await Promise.all([
    countLinksSentSince(new Date(now.getTime() - PER_ADDRESS.windowMs), identifier),
    countLinksSentSince(new Date(now.getTime() - ALL_ADDRESSES.windowMs)),
  ]);
  return toThisAddress < PER_ADDRESS.limit && toAnyAddress < ALL_ADDRESSES.limit;
}
