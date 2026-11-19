import { Prisma, prisma } from "@finnberry/db";

// The claim table holds at most this one row.
const CLAIM_ID = 1;

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

// With ADMIN_EMAIL set, only that address can become the instance admin.
// Without it, the first account to sign in can.
export function mayClaimInstanceAdmin(
  email: string | null | undefined,
  pinnedAdminEmail: string | undefined = process.env.ADMIN_EMAIL
): boolean {
  const pinned = normalizeEmail(pinnedAdminEmail);
  if (!pinned) return true;
  return normalizeEmail(email) === pinned;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

// Makes the user the instance admin if nobody holds that role yet. Returns
// whether this call made the claim. Two sign-ins racing for it both try to
// insert the same primary key, so the database lets exactly one through.
export async function claimInstanceAdmin(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  if (!mayClaimInstanceAdmin(user.email)) return false;

  const existingClaim = await prisma.instanceAdminClaim.findUnique({
    where: { id: CLAIM_ID },
    select: { id: true },
  });
  if (existingClaim) return false;

  try {
    await prisma.$transaction([
      prisma.instanceAdminClaim.create({
        data: { id: CLAIM_ID, userId: user.id },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true, status: "APPROVED" },
      }),
    ]);
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}
