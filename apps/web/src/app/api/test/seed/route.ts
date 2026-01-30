import { NextResponse } from "next/server";
import { prisma } from "@finnberry/db";
import { randomBytes } from "crypto";

// Only allow in development/test environments or when explicitly enabled for CI
const isTestEnv =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test" ||
  process.env.ENABLE_TEST_SEED === "true";

export async function POST(request: Request) {
  if (!isTestEnv) {
    return NextResponse.json(
      { error: "Test endpoints are only available in development/test environments" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "createTestUser":
        return await createTestUser(body);
      case "createTestSession":
        return await createTestSession(body);
      case "createTestHousehold":
        return await createTestHousehold(body);
      case "createTestChild":
        return await createTestChild(body);
      case "cleanup":
        return await cleanup(body);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Test seed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function createTestUser({ email, name }: { email: string; name: string }) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ user });
}

async function createTestSession({ userId }: { userId: string }) {
  // Generate a unique session token
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return NextResponse.json({ session, sessionToken });
}

async function createTestHousehold({
  name,
  userId,
}: {
  name: string;
  userId: string;
}) {
  const household = await prisma.household.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return NextResponse.json({ household });
}

async function createTestChild({
  name,
  birthDate,
  householdId,
  gender,
}: {
  name: string;
  birthDate: string;
  householdId: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}) {
  const child = await prisma.child.create({
    data: {
      name,
      birthDate: new Date(birthDate),
      householdId,
      gender,
    },
  });

  return NextResponse.json({ child });
}

async function cleanup({ prefix = "e2e-test" }: { prefix?: string }) {
  // Delete test data in correct order (respecting foreign keys)

  // Delete tracking records for test children
  const testChildren = await prisma.child.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const childIds = testChildren.map((c) => c.id);

  if (childIds.length > 0) {
    await prisma.sleepRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.feedingRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.diaperRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.pumpingRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.growthRecord.deleteMany({ where: { childId: { in: childIds } } });
    await prisma.activityRecord.deleteMany({ where: { childId: { in: childIds } } });

    // Medicine records need to be deleted via medicines (medicineRecord doesn't have childId directly)
    const testMedicines = await prisma.medicine.findMany({
      where: { childId: { in: childIds } },
      select: { id: true },
    });
    const medicineIds = testMedicines.map((m) => m.id);
    if (medicineIds.length > 0) {
      await prisma.medicineRecord.deleteMany({ where: { medicineId: { in: medicineIds } } });
    }
    await prisma.medicine.deleteMany({ where: { childId: { in: childIds } } });
  }

  // Delete test children
  await prisma.child.deleteMany({
    where: { name: { startsWith: prefix } },
  });

  // Delete test households (cascades to members and invites)
  const testHouseholds = await prisma.household.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const householdIds = testHouseholds.map((h) => h.id);

  if (householdIds.length > 0) {
    await prisma.householdInvite.deleteMany({ where: { householdId: { in: householdIds } } });
    await prisma.householdMember.deleteMany({ where: { householdId: { in: householdIds } } });
    await prisma.household.deleteMany({ where: { id: { in: householdIds } } });
  }

  // Delete test sessions
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  }

  // Delete test users
  await prisma.user.deleteMany({
    where: { email: { startsWith: prefix } },
  });

  return NextResponse.json({
    deleted: {
      users: userIds.length,
      households: householdIds.length,
      children: childIds.length,
    },
  });
}
